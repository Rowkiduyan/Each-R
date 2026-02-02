export const OFFICE_START = '08:00';
export const OFFICE_END = '17:00';

export function isSunday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00');
  if (Number.isNaN(d.getTime())) return false;
  return d.getDay() === 0;
}

export function isWithinOfficeHours(timeStr) {
  if (!timeStr) return false;
  return timeStr >= OFFICE_START && timeStr <= OFFICE_END;
}

export function validateNoSunday(inputEl, dateStr) {
  if (isSunday(dateStr)) {
    inputEl.setCustomValidity('Sundays are disabled');
    inputEl.reportValidity();
    return false;
  }
  inputEl.setCustomValidity('');
  return true;
}

export function validateOfficeHours(inputEl, timeStr) {
  if (!isWithinOfficeHours(timeStr)) {
    inputEl.setCustomValidity(`Office hours only (${OFFICE_START}–${OFFICE_END}).`);
    inputEl.reportValidity();
    return false;
  }
  inputEl.setCustomValidity('');
  return true;
}

export function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00');
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export function currentTimeHHMM() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

export function isFutureTimeOnDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return true;
  if (!isToday(dateStr)) return true;
  return timeStr > currentTimeHHMM();
}

export function validateFutureTimeForDate(inputEl, dateStr, timeStr, message = "Please select a future time for today's date.") {
  if (!isFutureTimeOnDate(dateStr, timeStr)) {
    inputEl.setCustomValidity(message);
    inputEl.reportValidity();
    return false;
  }
  inputEl.setCustomValidity('');
  return true;
}

export function getTomorrowDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

export function isTomorrowOrLater(dateStr) {
  if (!dateStr) return false;
  const selectedDate = new Date(dateStr + 'T00:00');
  if (Number.isNaN(selectedDate.getTime())) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);
  return selectedDate >= tomorrow;
}

export function validateMinimumTomorrow(inputEl, dateStr, message = 'Interview must be scheduled at least one day in advance. Please select tomorrow or a later date.') {
  if (!isTomorrowOrLater(dateStr)) {
    inputEl.setCustomValidity(message);
    inputEl.reportValidity();
    return false;
  }
  inputEl.setCustomValidity('');
  return true;
}
