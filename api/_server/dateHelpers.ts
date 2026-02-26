const EASTERN_TIME_ZONE = "America/New_York";

const ISO_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: EASTERN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function validateISODateString(dateString: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error(`Invalid ISO date string: ${dateString}`);
  }
}

export function getESTDateString(date: Date = new Date()): string {
  const formatted = ISO_DATE_FORMATTER.format(date);
  return formatted.replace(/\//g, "-");
}

export function shiftISODateString(dateString: string, dayOffset: number): string {
  validateISODateString(dateString);
  const [year, month, day] = dateString.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset));
  const shiftedYear = shifted.getUTCFullYear();
  const shiftedMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const shiftedDay = String(shifted.getUTCDate()).padStart(2, "0");
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

export function getYesterdayDateString(date: Date = new Date()): string {
  return shiftISODateString(getESTDateString(date), -1);
}

export function getTomorrowDateString(date: Date = new Date()): string {
  return shiftISODateString(getESTDateString(date), 1);
}

export function getDayBeforeYesterdayDateString(date: Date = new Date()): string {
  return shiftISODateString(getESTDateString(date), -2);
}
