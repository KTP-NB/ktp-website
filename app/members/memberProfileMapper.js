import { isTransferStudent, isRegisteredLineageMember, withFallbackLineage } from '../../lib/memberLineage.mjs';

export const greekLetters = {
  Alpha: 'Α',
  Beta: 'Β',
  Gamma: 'Γ',
  Delta: 'Δ',
  Epsilon: 'Ε',
  Zeta: 'Ζ',
  Eta: 'Η',
  Theta: 'Θ',
  Iota: 'Ι',
  Kappa: 'Κ',
  Lambda: 'Λ',
  Mu: 'Μ',
  Nu: 'Ν',
  Xi: 'Ξ',
  Omicron: 'Ο',
  Pi: 'Π',
  Rho: 'Ρ',
  Sigma: 'Σ',
  Tau: 'Τ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Chi: 'Χ',
  Psi: 'Ψ',
  Omega: 'Ω',
  Founding: '★',
  Transfer: '→',
};

export function memberProfileToCardMember(profile) {
  return {
    id: profile.id,
    big_member_id: isTransferStudent(profile) ? null : profile.big_member_id ?? null,
    is_transfer_student: isTransferStudent(profile),
    lineage_registered: isRegisteredLineageMember(profile),
    name: profile.name,
    position: profile.position,
    image: profile.photo_url || profile.image_path || '/ktp-icon.png',
    year: profile.graduation_year,
    major: profile.major,
    minors: profile.minors,
    linkedin: profile.linkedin_url,
    class: isTransferStudent(profile) ? 'Transfer' : profile.pledge_class,
    status: profile.member_status,
    executive_board: profile.executive_board,
    committees: profile.committees || [],
    cropPosition: profile.crop_position,
    cropScale: profile.crop_scale,
    cropOrigin: profile.crop_origin,
    sort_order: profile.sort_order,
  };
}

export function directoryProfilesToMembers(profiles) {
  const members = profiles.map(memberProfileToCardMember);
  // Older database views still supply live members during migration rollout.
  // Only seed legacy relationships when the column is absent, never on a saved null.
  return profiles.some((profile) => Object.hasOwn(profile, 'big_member_id'))
    ? members
    : withFallbackLineage(members);
}
