import { fixedTrainings, type FixedTraining } from "../data/fixedTrainings";
import type { Lesson } from "../types";
import {
  buildMonthDate,
  getLisbonMonthParts,
  getTodayDate,
  getWeekdayKey,
  type WeekdayKey,
} from "./dateUtils";

export type CalendarEntryStatus =
  | "planned"
  | "draft"
  | "published"
  | "finished";

export type CalendarEntry = {
  id: string;
  date: string;
  time: string;
  title: string;
  coachName: string;
  secondaryCoachName?: string;
  status: CalendarEntryStatus;
  kind: "fixed" | "lesson";
  studentCount: number;
  lesson?: Lesson;
  fixedTrainingId?: string;
};

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
}

export function getFixedTrainingsForWeekday(weekday: WeekdayKey) {
  return fixedTrainings.filter((training) => training.weekday === weekday);
}

export function findRegisteredLessonForGroup(
  lessons: Lesson[],
  date: string,
  group: FixedTraining
) {
  return lessons.find(
    (lesson) =>
      lesson.date === date &&
      lesson.groupName === group.title &&
      lesson.status !== "draft"
  );
}

export function buildMonthCalendarEntries(options: {
  year: number;
  month: number;
  lessons: Lesson[];
  includePlanned?: boolean;
}) {
  const { year, month, lessons, includePlanned = true } = options;
  const entries: CalendarEntry[] = [];
  const coveredKeys = new Set<string>();
  const totalDays = daysInMonth(year, month);

  for (const lesson of lessons) {
    const [lessonYear, lessonMonth] = lesson.date.split("-").map(Number);
    if (lessonYear !== year || lessonMonth !== month) continue;

    const entry: CalendarEntry = {
      id: lesson.id,
      date: lesson.date,
      time: lesson.time || "",
      title: lesson.groupName || "Treino",
      coachName: lesson.coachName || "—",
      secondaryCoachName: lesson.secondaryCoachName,
      status: lesson.status,
      kind: "lesson",
      studentCount: lesson.bookedStudentIds.length,
      lesson,
    };

    entries.push(entry);

    if (lesson.groupName && lesson.status !== "draft") {
      coveredKeys.add(`${lesson.date}::${lesson.groupName}`);
    }
  }

  if (includePlanned) {
    for (let day = 1; day <= totalDays; day += 1) {
      const date = buildMonthDate(year, month, day);
      const weekday = getWeekdayKey(date);

      for (const group of getFixedTrainingsForWeekday(weekday)) {
        const key = `${date}::${group.title}`;
        if (coveredKeys.has(key)) continue;

        entries.push({
          id: `planned:${group.id}:${date}`,
          date,
          time: "",
          title: group.title,
          coachName: group.coachName || "Por registar",
          status: "planned",
          kind: "fixed",
          studentCount: group.students.length,
          fixedTrainingId: group.id,
        });
      }
    }
  }

  return entries.sort((a, b) =>
    `${a.date} ${a.time} ${a.title}`.localeCompare(
      `${b.date} ${b.time} ${b.title}`
    )
  );
}

export function getUpcomingCalendarEntries(
  lessons: Lesson[],
  limit = 6
) {
  const today = getTodayDate();
  const { year, month } = getLisbonMonthParts();
  // cover current + next month for upcoming list
  const next =
    month === 12
      ? { year: year + 1, month: 1 }
      : { year, month: month + 1 };

  const entries = [
    ...buildMonthCalendarEntries({ year, month, lessons, includePlanned: true }),
    ...buildMonthCalendarEntries({
      year: next.year,
      month: next.month,
      lessons,
      includePlanned: true,
    }),
  ].filter(
    (entry) =>
      entry.date >= today &&
      (entry.status === "planned" ||
        entry.status === "published" ||
        entry.status === "draft")
  );

  return entries.slice(0, limit);
}

export function getEntryDotClass(entry: CalendarEntry) {
  if (entry.status === "planned") return "dot-planned";
  if (entry.status === "finished") return "dot-finished";
  if (entry.status === "draft") return "dot-draft";
  return "dot-published";
}

export function statusLabelForEntry(entry: CalendarEntry) {
  if (entry.status === "planned") return "Planeado";
  if (entry.status === "published") return "Registado";
  if (entry.status === "finished") return "Concluído";
  return "Rascunho";
}
