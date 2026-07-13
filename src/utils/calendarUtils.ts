import type { Lesson } from "../types";
import { getTodayDate } from "./lessonWorkflow";

export function pickInitialCalendarDate(lessons: Lesson[]) {
  const today = getTodayDate();
  const dates = [...new Set(lessons.map((lesson) => lesson.date))].sort();

  return dates.find((date) => date >= today) ?? dates[dates.length - 1] ?? today;
}

export function getNextLesson(lessons: Lesson[]) {
  const today = getTodayDate();

  return [...lessons]
    .filter((lesson) => lesson.status === "published" && lesson.date >= today)
    .sort((a, b) =>
      `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`)
    )[0];
}

export function formatCalendarDayLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function getLessonDotClass(
  lesson: Lesson,
  options?: { studentId?: string }
) {
  if (options?.studentId) {
    const response = lesson.responses?.find(
      (item) => item.studentId === options.studentId
    );

    if (!response) return "dot-pending";
    if (response.status === "confirmed") return "dot-confirmed";
    return "dot-declined";
  }

  if (lesson.status === "finished") return "dot-finished";
  if (lesson.status === "draft") return "dot-draft";
  return "dot-published";
}
