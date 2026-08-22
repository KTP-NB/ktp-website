import { todayIso } from '@/lib/fines';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

/**
 * Validates a fine create/update body. With `requireAll` the member, amount and
 * description must be present; otherwise only the supplied fields are returned,
 * so PATCH can send partial updates.
 */
export function parseFinePayload(body, { requireAll = false } = {}) {
  const values = {};

  const memberId = String(body.member_id || '').trim();
  if (memberId) {
    if (!/^[0-9a-f-]{36}$/i.test(memberId)) return { error: 'Select a valid member.' };
    values.member_id = memberId;
  } else if (requireAll) {
    return { error: 'Select a member.' };
  }

  if (body.description !== undefined || requireAll) {
    const description = String(body.description || '').trim();
    if (!description) return { error: 'A description is required.' };
    if (description.length > 200) return { error: 'Description must be 200 characters or fewer.' };
    values.description = description;
  }

  if (body.amount !== undefined || requireAll) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) return { error: 'Amount must be zero or more.' };
    if (amount > 100000) return { error: 'Amount is unreasonably large.' };
    values.amount = Number(amount.toFixed(2));
  }

  if (body.date_issued !== undefined || requireAll) {
    const dateIssued = String(body.date_issued || '').trim() || todayIso();
    if (!validDate(dateIssued)) return { error: 'Date issued must be a valid date.' };
    values.date_issued = dateIssued;
  }

  if (body.due_date !== undefined) {
    const dueDate = String(body.due_date || '').trim();
    if (dueDate && !validDate(dueDate)) return { error: 'Due date must be a valid date.' };
    values.due_date = dueDate || null;
  }

  if (body.notes !== undefined) {
    const notes = String(body.notes || '').trim();
    if (notes.length > 1000) return { error: 'Notes must be 1000 characters or fewer.' };
    values.notes = notes || null;
  }

  if (body.paid !== undefined) {
    values.paid = Boolean(body.paid);
    // Stamp when it was settled so the log keeps a payment date, like the
    // spreadsheet's Paid column did implicitly.
    if (values.paid) {
      const paidOn = String(body.paid_on || '').trim() || todayIso();
      if (!validDate(paidOn)) return { error: 'Paid date must be a valid date.' };
      values.paid_on = paidOn;
    } else {
      values.paid_on = null;
    }
  }

  if (values.due_date && values.date_issued && values.due_date < values.date_issued) {
    return { error: 'Due date cannot be before the date issued.' };
  }

  if (!Object.keys(values).length) return { error: 'Nothing to update.' };
  return { values };
}
