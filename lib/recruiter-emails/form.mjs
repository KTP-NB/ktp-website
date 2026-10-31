export function emailDraft(email = {}) {
  const date = new Date(email.sent_at || Date.now());
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
  return {
    recipients: (email.recipients || []).map(({ email }) => email).join(', '),
    company: email.company || '', position: email.position || '', subject: email.subject || '',
    sent_at: local, notes: email.notes || '', source_url: email.source_url || '',
  };
}

export function emailFormPayload(draft, original) {
  return {
    ...draft,
    recipients: draft.recipients.split(/[,;\n]/).map((email) => email.trim()).filter(Boolean).map((email) => ({
      email, name: original?.recipients.find((recipient) => recipient.email.toLowerCase() === email.toLowerCase())?.name || null,
    })),
    // An edit to notes must not round an imported message's original timestamp.
    sent_at: original && draft.sent_at === emailDraft(original).sent_at ? original.sent_at : new Date(draft.sent_at).toISOString(),
  };
}
