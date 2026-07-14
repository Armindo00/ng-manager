const TIMEZONE = "Europe/Lisbon";

export function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getCurrentMonthYear() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    month: "numeric",
    year: "numeric",
  }).formatToParts(new Date());

  return {
    month: Number(parts.find((part) => part.type === "month")?.value || 1),
    year: Number(parts.find((part) => part.type === "year")?.value || 2026),
  };
}

export function isDateInMonthYear(date: string, month: number, year: number) {
  const [dateYear, dateMonth] = date.split("-").map(Number);
  return dateYear === year && dateMonth === month;
}

export function formatMonthYear(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}
