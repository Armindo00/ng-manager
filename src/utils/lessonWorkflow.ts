import type { Lesson } from "../types";
import { getTodayDate } from "./dateUtils";

export { getTodayDate };

export function canMarkAttendance(lesson: Lesson) {
  return lesson.date <= getTodayDate();
}

export function canFinishLesson(lesson: Lesson) {
  return lesson.status !== "finished" && canMarkAttendance(lesson);
}
