import type { Lesson, Student } from "../types";
import { getCurrentMonthYear, isDateInMonthYear } from "./dateUtils";
import {
  countStudentTrainingsInMonth,
  isPackStudent,
} from "./studentPaymentPlan";

export type TrainingUsageStatus =
  | "ok"
  | "at_limit"
  | "over"
  | "pack_empty"
  | "unlimited";

export type StudentTrainingUsage = {
  studentId: string;
  studentName: string;
  billingType: Student["billingType"];
  month: number;
  year: number;
  done: number;
  limit: number;
  remaining: number | null;
  overBy: number;
  status: TrainingUsageStatus;
  label: string;
};

function monthLessons(lessons: Lesson[], month: number, year: number) {
  return lessons.filter((lesson) => isDateInMonthYear(lesson.date, month, year));
}

/**
 * Conta presentes no mês. Se `excludeLessonId` for dado, ignora essa sessão
 * (útil para prever o impacto de marcar Presente nesta aula).
 */
export function countPresentInMonth(
  studentId: string,
  lessons: Lesson[],
  month: number,
  year: number,
  excludeLessonId?: string
) {
  return monthLessons(lessons, month, year).filter(
    (lesson) =>
      lesson.id !== excludeLessonId &&
      lesson.presentStudentIds.includes(studentId)
  ).length;
}

export function getStudentTrainingUsage(
  student: Student,
  lessons: Lesson[],
  month = getCurrentMonthYear().month,
  year = getCurrentMonthYear().year,
  options?: { excludeLessonId?: string; extraPresent?: boolean }
): StudentTrainingUsage {
  const baseDone = countPresentInMonth(
    student.id,
    lessons,
    month,
    year,
    options?.excludeLessonId
  );
  const done = baseDone + (options?.extraPresent ? 1 : 0);

  if (isPackStudent(student)) {
    if (student.packSize <= 0) {
      return {
        studentId: student.id,
        studentName: student.name,
        billingType: "pack",
        month,
        year,
        done,
        limit: 0,
        remaining: null,
        overBy: 0,
        status: "unlimited",
        label: `${done} treinos este mês · pack sem tamanho`,
      };
    }

    // After marking present, remaining would drop by 1 if not already present.
    const remainingAfter = options?.extraPresent
      ? student.packRemaining - 1
      : student.packRemaining;
    const remaining = Math.max(0, remainingAfter);
    let status: TrainingUsageStatus = "ok";
    if (remainingAfter < 0) status = "over";
    else if (remainingAfter === 0) status = "pack_empty";
    else if (remainingAfter === 1 && !options?.extraPresent) status = "at_limit";

    return {
      studentId: student.id,
      studentName: student.name,
      billingType: "pack",
      month,
      year,
      done,
      limit: student.packSize,
      remaining,
      overBy: remainingAfter < 0 ? Math.abs(remainingAfter) : 0,
      status,
      label:
        status === "over"
          ? `Pack ultrapassado · ${done} este mês · saldo ${student.packRemaining}/${student.packSize}`
          : status === "pack_empty"
            ? `Pack esgotado · ${done} este mês`
            : `${Math.max(0, student.packRemaining)}/${student.packSize} no pack · ${done} este mês`,
    };
  }

  const limit = student.monthlyLimit > 0 ? student.monthlyLimit : 0;
  if (limit <= 0) {
    return {
      studentId: student.id,
      studentName: student.name,
      billingType: "monthly",
      month,
      year,
      done,
      limit: 0,
      remaining: null,
      overBy: 0,
      status: "unlimited",
      label: `${done} treinos este mês · sem limite`,
    };
  }

  const overBy = Math.max(0, done - limit);
  const remaining = Math.max(0, limit - done);
  const status: TrainingUsageStatus =
    overBy > 0 ? "over" : done === limit ? "at_limit" : "ok";

  return {
    studentId: student.id,
    studentName: student.name,
    billingType: "monthly",
    month,
    year,
    done,
    limit,
    remaining,
    overBy,
    status,
    label:
      status === "over"
        ? `${done}/${limit} · +${overBy} a mais`
        : status === "at_limit"
          ? `${done}/${limit} · no limite`
          : `${done}/${limit} este mês`,
  };
}

export function listTrainingUsage(
  students: Student[],
  lessons: Lesson[],
  month = getCurrentMonthYear().month,
  year = getCurrentMonthYear().year
) {
  return students
    .map((student) => getStudentTrainingUsage(student, lessons, month, year))
    .sort((a, b) => {
      const rank = (status: TrainingUsageStatus) => {
        if (status === "over") return 0;
        if (status === "pack_empty") return 1;
        if (status === "at_limit") return 2;
        if (status === "ok") return 3;
        return 4;
      };
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      if (b.overBy !== a.overBy) return b.overBy - a.overBy;
      return a.studentName.localeCompare(b.studentName, "pt");
    });
}

export function listOverQuotaStudents(
  students: Student[],
  lessons: Lesson[],
  month = getCurrentMonthYear().month,
  year = getCurrentMonthYear().year
) {
  return listTrainingUsage(students, lessons, month, year).filter(
    (item) => item.status === "over" || item.status === "pack_empty"
  );
}

export function usageStatusLabel(status: TrainingUsageStatus) {
  if (status === "over") return "A mais";
  if (status === "pack_empty") return "Pack esgotado";
  if (status === "at_limit") return "No limite";
  if (status === "unlimited") return "Sem limite";
  return "OK";
}

/** Ajusta packRemaining ao passar de ausente→presente (+1 consume) ou presente→ausente (repor). */
export function applyPackRemainingDelta(
  student: Student,
  delta: -1 | 1
): Student {
  if (!isPackStudent(student) || student.packSize <= 0) return student;

  // Allow negative remaining so overage is visible; never exceed packSize when restoring.
  const nextRemaining = Math.min(
    student.packSize,
    student.packRemaining + delta
  );

  if (nextRemaining === student.packRemaining) return student;

  return {
    ...student,
    packRemaining: nextRemaining,
  };
}

export function wouldExceedQuotaOnPresent(
  student: Student,
  lessons: Lesson[],
  lesson: Lesson
) {
  const alreadyPresent = lesson.presentStudentIds.includes(student.id);
  if (alreadyPresent) return null;

  const period = {
    month: Number(lesson.date.slice(5, 7)),
    year: Number(lesson.date.slice(0, 4)),
  };

  const projected = getStudentTrainingUsage(
    student,
    lessons,
    period.month,
    period.year,
    { excludeLessonId: lesson.id, extraPresent: true }
  );

  if (projected.status === "over" || projected.status === "pack_empty") {
    return projected;
  }

  // Monthly: becoming over or hitting over
  if (
    student.billingType === "monthly" &&
    student.monthlyLimit > 0 &&
    projected.done > student.monthlyLimit
  ) {
    return projected;
  }

  return null;
}

// Re-export helper already used elsewhere for payment sheets
export { countStudentTrainingsInMonth };
