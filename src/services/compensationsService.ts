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
}) {
  const compensation: LessonCompensation = {
    id: crypto.randomUUID(),
    studentId: input.studentId,
    missedLessonId: input.missedLessonId,
    compensationLessonId: null,
    reason: input.reason.trim(),
    status: "pending",
    adminNotes: "",
    createdAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("lesson_compensations")
    .upsert(toDb(compensation), { onConflict: "student_id,missed_lesson_id" });

  if (error) throw error;

  return compensation;
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
  if (lesson.bookedStudentIds.includes(compensation.studentId)) {
    await saveCompensation({
      ...compensation,
      compensationLessonId: lesson.id,
      status: "scheduled",
    });
    return;
  }

  await updateLesson({
    ...lesson,
    bookedStudentIds: [...lesson.bookedStudentIds, compensation.studentId],
  });

  await saveCompensation({
    ...compensation,
    compensationLessonId: lesson.id,
    status: "scheduled",
  });
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
