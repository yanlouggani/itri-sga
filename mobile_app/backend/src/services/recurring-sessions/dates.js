function toDateOnlyString(input) {
  if (!input) return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${input}`);
  }
  return date.toISOString().slice(0, 10);
}

function fromDateOnlyString(dateOnly) {
  if (!dateOnly) return null;
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

function getWeekStart(dateInput, weekStartsOn = 1) {
  const date = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
  const day = date.getUTCDay();
  const diff = (day - weekStartsOn + 7) % 7;
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

function sameDateOnly(left, right) {
  return toDateOnlyString(left) === toDateOnlyString(right);
}

function compareDateOnly(left, right) {
  const a = toDateOnlyString(left);
  const b = toDateOnlyString(right);
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function isDateWithinRange(dateOnly, startOnly, endOnly) {
  const date = toDateOnlyString(dateOnly);
  const start = toDateOnlyString(startOnly);
  const end = endOnly ? toDateOnlyString(endOnly) : null;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function weekdayOnOrAfter(dateOnly, weekday) {
  const base = fromDateOnlyString(toDateOnlyString(dateOnly));
  const delta = (weekday - base.getUTCDay() + 7) % 7;
  return toDateOnlyString(addDays(base, delta));
}

module.exports = {
  toDateOnlyString,
  fromDateOnlyString,
  addDays,
  addWeeks,
  getWeekStart,
  sameDateOnly,
  compareDateOnly,
  isDateWithinRange,
  weekdayOnOrAfter,
};