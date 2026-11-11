import { supabase } from "./supabase";
import type { CompensationStatus, LessonCompensation } from "../types/compensation";
import { getLessons, updateLesson, updateLessonResponse } from "./lessonsService";
import type { Lesson, LessonResponse } from "../types";

type DbCompensation = {
  id: string;
  student_id: string;
  missed_lesson_id: string;
  compensation_lesson_id: string | null;
  reason: string;
  status: CompensationStatus;
  admin_notes: string;
  created_at: string;
};

export const OPEN_COMPENSATION_STATUSES: CompensationStatus[] = [
  "pending",
  "approved",
  "scheduled",
];

function fromDb(row: DbCompensation): LessonCompensation {
  return {
    id: row.id,
    studentId: row.student_id,
    missedLessonId: row.missed_lesson_id,
    compensationLessonId: row.compensation_lesson_id,
    reason: row.reason,
    status: row.status,
    adminNotes: row.admin_notes || "",
    createdAt: row.created_at,
  };
}

function toDb(compensation: LessonCompensation) {
  return {
    id: compensation.id,
    student_id: compensation.studentId,
    missed_lesson_id: compensation.missedLessonId,
    compensation_lesson_id: compensation.compensationLessonId,
    reason: compensation.reason,
    status: compensation.status,
    admin_notes: compensation.adminNotes,
  };
}

export function isOpenCompensation(compensation: LessonCompensation) {
  return OPEN_COMPENSATION_STATUSES.includes(compensation.status);
}

export function countOpenCompensations(
  compensations: LessonCompensation[],
  studentId: string
) {
  return compensations.filter(
    (item) => item.studentId === studentId && isOpenCompensation(item)
  ).length;
}

export async function declineLessonWithCompensation(
  lesson: Lesson,
  studentId: string,
  reason: string
) {
  const response: LessonResponse = {
    studentId,
    status: "declined",
    transportType: "pickup",
    pickupLocation: "",
    availableFrom: "",
    material: {
      softboard: false,
      fiberBoard: false,
      wetsuit: false,
      lycra: false,
      leash: false,
      vest: false,
      other: "",
    },
    notes: "",
    declineReason: reason.trim(),
  };

  await updateLessonResponse(lesson.id, response);

  await createCompensation({
    studentId,
    missedLessonId: lesson.id,
    reason: reason.trim(),
  });
}

export async function getCompensations() {
  const { data, error } = await supabase
    .from("lesson_compensations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => fromDb(row as DbCompensation));
}

export async function createCompensation(input: {
  studentId: string;
  missedLessonId: string;
  reason: string;
  status?: CompensationStatus;
}) {
  const { data: existingRows, error: existingError } = await supabase
    .from("lesson_compensations")
    .select("*")
    .eq("student_id", input.studentId)
    .eq("missed_lesson_id", input.missedLessonId)
    .limit(1);

  if (existingError) throw existingError;

  const existing = existingRows?.[0]
    ? fromDb(existingRows[0] as DbCompensation)
    : null;

  const compensation: LessonCompensation = {
    id: existing?.id || crypto.randomUUID(),
    studentId: input.studentId,
    missedLessonId: input.missedLessonId,
    compensationLessonId: existing?.compensationLessonId || null,
    reason: input.reason.trim(),
    status: input.status || existing?.status || "pending",
    adminNotes: existing?.adminNotes || "",
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  const { error } = await supabase
    .from("lesson_compensations")
    .upsert(toDb(compensation));

  if (error) throw error;

  return compensation;
}

export async function markStudentForCompensation(
  lesson: Lesson,
  studentId: string
) {
  const nextLesson: Lesson = {
    ...lesson,
    presentStudentIds: lesson.presentStudentIds.filter((id) => id !== studentId),
  };

  await updateLesson(nextLesson);

  await createCompensation({
    studentId,
    missedLessonId: lesson.id,
    reason: "Compensação noutro treino (marcada pelo treinador)",
    status: "approved",
  });

  return nextLesson;
}

export async function clearOpenCompensationForMissedLesson(
  studentId: string,
  missedLessonId: string
) {
  const { data, error } = await supabase
    .from("lesson_compensations")
    .select("*")
    .eq("student_id", studentId)
    .eq("missed_lesson_id", missedLessonId)
    .in("status", ["pending", "approved"]);

  if (error) throw error;

  for (const row of data || []) {
    const { error: deleteError } = await supabase
      .from("lesson_compensations")
      .delete()
      .eq("id", row.id);

    if (deleteError) throw deleteError;
  }
}

export async function saveCompensation(compensation: LessonCompensation) {
  const { error } = await supabase
    .from("lesson_compensations")
    .upsert(toDb(compensation));

  if (error) throw error;
}

export async function updateCompensationStatus(
  compensation: LessonCompensation,
  status: CompensationStatus,
  adminNotes?: string
) {
  await saveCompensation({
    ...compensation,
    status,
    adminNotes: adminNotes ?? compensation.adminNotes,
  });
}

export async function scheduleCompensation(
  compensation: LessonCompensation,
  lesson: Lesson
) {
  if (!lesson.bookedStudentIds.includes(compensation.studentId)) {
    await updateLesson({
      ...lesson,
      bookedStudentIds: [...lesson.bookedStudentIds, compensation.studentId],
    });
  }

  await saveCompensation({
    ...compensation,
    compensationLessonId: lesson.id,
    status: "scheduled",
  });
}

/**
 * Adds a student who owes makeup sessions into the current lesson,
 * linking the oldest open compensation that is not yet scheduled.
 */
export async function addCompensationStudentToLesson(
  lesson: Lesson,
  studentId: string,
  compensations: LessonCompensation[]
) {
  const open = compensations
    .filter(
      (item) =>
        item.studentId === studentId &&
        (item.status === "pending" || item.status === "approved") &&
        item.missedLessonId !== lesson.id
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const target = open[0];
  if (!target) {
    throw new Error("Este aluno não tem compensações por agendar.");
  }

  const nextLesson: Lesson = {
    ...lesson,
    bookedStudentIds: lesson.bookedStudentIds.includes(studentId)
      ? lesson.bookedStudentIds
      : [...lesson.bookedStudentIds, studentId],
    presentStudentIds: lesson.presentStudentIds.includes(studentId)
      ? lesson.presentStudentIds
      : [...lesson.presentStudentIds, studentId],
  };

  await updateLesson(nextLesson);

  await saveCompensation({
    ...target,
    compensationLessonId: lesson.id,
    status: "scheduled",
  });

  return { lesson: nextLesson, compensation: target };
}

export async function syncCompletedCompensations() {
  const [compensations, lessons] = await Promise.all([
    getCompensations(),
    getLessons(),
  ]);

  const scheduled = compensations.filter(
    (item) => item.status === "scheduled" && item.compensationLessonId
  );

  for (const compensation of scheduled) {
    const lesson = lessons.find(
      (item) => item.id === compensation.compensationLessonId
    );

    if (!lesson) continue;

    const isDone =
      lesson.status === "finished" &&
      lesson.presentStudentIds.includes(compensation.studentId);

    if (isDone) {
      await saveCompensation({
        ...compensation,
        status: "completed",
      });
    }
  }
}
