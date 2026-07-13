import type { Lesson } from "../types";
import { getTodayDate } from "./dateUtils";

export { getTodayDate };

export function canMarkAttendance(lesson: Lesson) {
  return lesson.date <= getTodayDate();
}

export function isLessonPlanSent(lesson: Lesson) {
  return Boolean(lesson.beach?.trim() && lesson.time?.trim());
}

export function getPickupStudentsCount(lesson: Lesson) {
  return (lesson.responses || []).filter(
    (response) =>
      response.status === "confirmed" && response.transportType === "pickup"
  ).length;
}

export function isLessonPlanComplete(lesson: Lesson) {
  if (!isLessonPlanSent(lesson)) return false;

  const pickupStudents = getPickupStudentsCount(lesson);

  if (pickupStudents === 0) return true;

  return (lesson.coachPickups || []).some(
    (pickup) => pickup.location.trim() && pickup.time.trim()
  );
}

export function canSendLessonPlan(lesson: Lesson) {
  return lesson.status !== "finished";
}

export function canFinishLesson(lesson: Lesson) {
  return lesson.status === "published" && canMarkAttendance(lesson);
}
