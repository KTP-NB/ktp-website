const editableApplicationFields = [
  'company',
  'position',
  'date_applied',
  'status',
  'details',
  'application_url',
  'referral',
  'referral_contact',
];

export function applicationUpdatePayload(form) {
  return Object.fromEntries(
    editableApplicationFields.map((field) => [field, form[field]]),
  );
}

export function applicationCreatePayload(form, userId) {
  return { user_id: userId, ...applicationUpdatePayload(form) };
}
