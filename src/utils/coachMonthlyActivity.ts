import type { Coach, Lesson } from "../types";
import type { VideoAnalysisSession } from "../types/videoAnalysis";
import { isDateInMonthYear } from "./dateUtils";
import { normalizePersonName } from "./studentNameMatch";

export type CoachMonthlyActivity = {
  coachId: string;
  coachName: string;
  waterSessions: number;
  videoSessions: number;
  total: number;
};

export function lessonCountsForCoach(
  lesson: Lesson,
  coachId: string,
  coachName: string
) {
  if (lesson.status !== "finished") return false;
  if (lesson.coachId === coachId) return true;

  const secondary = lesson.secondaryCoachName?.trim();
  if (!secondary) return false;

  return normalizePersonName(secondary) === normalizePersonName(coachName);
}

export function countCoachMonthlyActivity(options: {
  coachId: string;
  coachName: string;
  lessons: Lesson[];
  videoSessions: VideoAnalysisSession[];
  month: number;
  year: number;
}): CoachMonthlyActivity {
  const { coachId, coachName, lessons, videoSessions, month, year } = options;

  const waterSessions = lessons.filter(
    (lesson) =>
      isDateInMonthYear(lesson.date, month, year) &&
      lessonCountsForCoach(lesson, coachId, coachName)
  ).length;

  const videoCount = videoSessions.filter(
    (session) =>
      session.coachId === coachId &&
      isDateInMonthYear(session.date, month, year)
  ).length;

  return {
    coachId,
    coachName,
    waterSessions,
    videoSessions: videoCount,
    total: waterSessions + videoCount,
  };
}

export function buildCoachMonthlyReport(options: {
  coaches: Coach[];
  lessons: Lesson[];
  videoSessions: VideoAnalysisSession[];
  month: number;
  year: number;
}) {
  return options.coaches
    .map((coach) =>
      countCoachMonthlyActivity({
        coachId: coach.id,
        coachName: coach.name,
        lessons: options.lessons,
        videoSessions: options.videoSessions,
        month: options.month,
        year: options.year,
      })
    )
    .sort((a, b) => b.total - a.total || a.coachName.localeCompare(b.coachName));
}

export function shiftMonth(month: number, year: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}
