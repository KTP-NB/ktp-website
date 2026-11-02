'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './LineageTab.module.css';
import { buildLineage, canonicalName } from '@/lib/memberLineage.mjs';

const familyMembers = (node) => [node, ...(node.children || []).flatMap(familyMembers)];

function Portrait({ name, member, root }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('');
  // The mapper's generic chapter icon is not a member headshot.
  const publicImage = member?.image?.trim();
  const image = publicImage && publicImage !== '/ktp-icon.png'
    ? publicImage
    : canonicalName(name) === 'raghul srinivasan' ? '/headshots/Beta/Raghul.jpg' : null;

  useEffect(() => setFailed(false), [image]);

  return (
    <span className={`${styles.portrait} ${root ? styles.rootPortrait : ''}`} aria-hidden="true">
      <span>{initials}</span>
      {image && !failed && (
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{
            objectPosition: member?.cropPosition || 'center',
            transform: member?.cropScale ? `scale(${member.cropScale})` : undefined,
            transformOrigin: member?.cropOrigin || 'center',
          }}
        />
      )}
    </span>
  );
}

function MemberRow({ node, root = false, size }) {
  const member = node;
  return (
    <div className={`${styles.memberRow} ${root ? styles.rootRow : ''}`}>
      <Portrait key={member?.image || 'initials'} name={node.name} member={member} root={root} />
      <div className={styles.memberDetails}>
        {root ? (
          <h3 className={styles.rootName}>{node.name}</h3>
        ) : (
          <p className={styles.memberName}>{node.name}</p>
        )}
        {member?.class && <p className={styles.memberClass}>{member.class === 'Founding' ? 'Founding class' : `${member.class} class`}</p>}
        {root && <p className={styles.familySize}>{size} {size === 1 ? 'member' : 'members'} in this family</p>}
      </div>
    </div>
  );
}

function Branches({ nodes }) {
  return (
    <ul className={styles.branches}>
      {nodes.map((node) => (
        <li className={styles.branch} key={node.id}>
          <MemberRow node={node} />
          {node.children?.length > 0 && <Branches nodes={node.children} />}
        </li>
      ))}
    </ul>
  );
}

export default function LineageTab({ members = [] }) {
  const lineage = useMemo(() => buildLineage(members), [members]);

  return (
    <section className={styles.lineage} aria-label="Member lineage">
        {lineage.length === 0 && <p className={styles.singleton}>No member lineages to show yet.</p>}
        <div className={styles.grid}>
          {lineage.map((root) => {
            const size = familyMembers(root).length;
            return (
              <article className={styles.family} key={root.id} aria-label={`${root.name} family`}>
                <MemberRow node={root} root size={size} />
                {root.children?.length > 0 ? (
                  <Branches nodes={root.children} />
                ) : (
                  <p className={styles.singleton}>Every family starts with one connection.</p>
                )}
              </article>
            );
          })}
        </div>
    </section>
  );
}
