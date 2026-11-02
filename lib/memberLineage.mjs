import { LEGACY_LINEAGE } from './memberLineageSeed.mjs';

// Match full names only, including the existing spelling correction.
export function canonicalName(name = '') {
  const normalized = name.trim().replace(/\s+/g, ' ').toLowerCase();
  return normalized === 'priyanghsu bhowmik' ? 'priyangshu bhowmik' : normalized;
}

export function isLineageMember(member) {
  return member.public_directory_visible !== false
    && !['inactive', 'deactivated'].includes((member.status || member.member_status || '').toLowerCase());
}

export function isTransferStudent(member) {
  return (member.pledge_class || member.class || '').trim().toLowerCase() === 'transfer';
}

const legacyRoots = new Set(LEGACY_LINEAGE.filter(([, big]) => !big).map(([name]) => canonicalName(name)));

export function isRegisteredLineageMember(member) {
  if (Object.hasOwn(member, 'lineage_registered')) return Boolean(member.lineage_registered);
  return isTransferStudent(member) || Boolean(member.big_member_id || member.lineage_root_kind)
    || legacyRoots.has(canonicalName(member.name));
}

// Static fallback data has no database IDs. Never apply these defaults to live
// profiles: a saved null Big must stay cleared, even for an existing family.
export function withFallbackLineage(members) {
  const parents = new Map(LEGACY_LINEAGE.map(([name, big]) => [canonicalName(name), canonicalName(big || '')]));
  const ids = new Map(members.map((member) => [canonicalName(member.name), member.id || `fallback:${canonicalName(member.name)}`]));
  return members.map((member) => {
    let big = parents.get(canonicalName(member.name));
    const seen = new Set([canonicalName(member.name)]);
    while (big && !ids.has(big) && !seen.has(big)) {
      seen.add(big);
      big = parents.get(big);
    }
    const bigId = isTransferStudent(member) ? null : ids.get(big) || null;
    return {
      ...member,
      id: ids.get(canonicalName(member.name)),
      big_member_id: bigId,
      lineage_registered: Boolean(bigId) || isTransferStudent(member) || legacyRoots.has(canonicalName(member.name)),
    };
  });
}

// The public view already resolves hidden ancestors. Keeping this traversal here
// also handles inactive rows and fallback data without losing their Littles.
export function buildLineage(members) {
  const byId = new Map(members.filter((member) => member.id).map((member) => [member.id,
    isTransferStudent(member) ? { ...member, big_member_id: null } : member,
  ]));
  const nodes = new Map([...byId.values()].filter((member) => isLineageMember(member) && isRegisteredLineageMember(member)).map((member) => [member.id, { ...member, children: [] }]));
  const roots = [];
  for (const node of nodes.values()) {
    let bigId = node.big_member_id;
    const seen = new Set([node.id]);
    while (bigId && byId.has(bigId) && !seen.has(bigId)) {
      seen.add(bigId);
      if (nodes.has(bigId)) break;
      bigId = byId.get(bigId).big_member_id;
    }
    if (!nodes.has(bigId) || bigId === node.id) bigId = null;

    // Guard the full chain, including visible ancestors, against corrupt cycles.
    let ancestor = bigId;
    const ancestors = new Set([node.id]);
    while (ancestor && byId.has(ancestor) && !ancestors.has(ancestor)) {
      ancestors.add(ancestor);
      ancestor = byId.get(ancestor).big_member_id;
    }
    if (ancestor && ancestors.has(ancestor)) bigId = null;

    if (bigId) nodes.get(bigId).children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function eligibleBigs(members, memberId) {
  const byId = new Map(members.map((member) => [member.id, member]));
  return members.filter((member) => {
    if (!isLineageMember(member) || !isRegisteredLineageMember(member)) return false;
    let ancestor = member.id;
    const seen = new Set();
    while (ancestor && !seen.has(ancestor)) {
      if (ancestor === memberId) return false;
      seen.add(ancestor);
      const profile = byId.get(ancestor);
      ancestor = profile && isTransferStudent(profile) ? null : profile?.big_member_id;
    }
    return !ancestor;
  }).sort((a, b) => a.name.localeCompare(b.name));
}
