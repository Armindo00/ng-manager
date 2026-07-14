const TIMEZONE = "Europe/Lisbon";

const WEEKDAY_TO_JS: Record<string, number> = {
  Domingo: 0,
  Segunda: 1,
  Terça: 2,
  Quarta: 3,
  Quinta: 4,
  Sexta: 5,
  Sábado: 6,
};

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

export function formatTodayLabel() {
  return new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: TIMEZONE,
  });
}

export function formatDisplayDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: TIMEZONE,
  });
}

export function getTodayIsoDate() {
  return getTodayDate();
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days, 12));
  return next.toISOString().slice(0, 10);
}

export function getWeekdayLabel(date: string) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`));

  const map: Record<string, string> = {
    Sun: "Domingo",
    Mon: "Segunda",
    Tue: "Terça",
    Wed: "Quarta",
    Thu: "Quinta",
    Fri: "Sexta",
    Sat: "Sábado",
  };

  return map[weekday] ?? "Domingo";
}

export function getScheduleDates(
  weekDay: string,
  repeatUntil: string,
  fromDate = getTodayDate()
) {
  const dates: string[] = [];
  let current = fromDate;

  while (current <= repeatUntil) {
    if (getWeekdayLabel(current) === weekDay) {
      dates.push(current);
    }
    current = addDays(current, 1);
  }

  return dates;
}

export function getLisbonMonthParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value || 2026),
    month: Number(parts.find((part) => part.type === "month")?.value || 1),
  };
}

export function formatMonthName(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1, 12))
    .toLocaleDateString("pt-PT", {
      month: "long",
      year: "numeric",
      timeZone: TIMEZONE,
    });
}

export function buildMonthDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export { TIMEZONE, WEEKDAY_TO_JS };
