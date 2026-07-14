import { supabase } from "./supabase";
import type { Lesson, LessonResponse } from "../types";

type DbLesson = {
  id: string;
  date: string;
  time: string;
  beach: string;
  status: "draft" | "published" | "finished";
  group_id: string | null;
  group_name: string | null;
  coach_id: string;
  coach_name: string;
  van: string;
  pickup_time: string;
  coach_pickups: Lesson["coachPickups"];
  coach_notes: string;
  booked_student_ids: string[];
  present_student_ids: string[];
  responses: Lesson["responses"];
};

function fromDb(lesson: DbLesson): Lesson {
  return {
    id: lesson.id,
    date: lesson.date,
    time: lesson.time,
    beach: lesson.beach,
    status: lesson.status,
    groupId: lesson.group_id || undefined,
    groupName: lesson.group_name || undefined,
    coachId: lesson.coach_id,
    coachName: lesson.coach_name,
    van: lesson.van,
    pickupTime: lesson.pickup_time,
    coachPickups: lesson.coach_pickups || [],
    coachNotes: lesson.coach_notes || "",
    bookedStudentIds: lesson.booked_student_ids || [],
    presentStudentIds: lesson.present_student_ids || [],
    responses: lesson.responses || [],
  };
}

function toDb(lesson: Lesson) {
  return {
    id: lesson.id,
    date: lesson.date,
    time: lesson.time,
    beach: lesson.beach,
    status: lesson.status,
    group_id: lesson.groupId || null,
    group_name: lesson.groupName || null,
    coach_id: lesson.coachId,
    coach_name: lesson.coachName,
    van: lesson.van,
    pickup_time: lesson.pickupTime,
    coach_pickups: lesson.coachPickups || [],
    coach_notes: lesson.coachNotes || "",
    booked_student_ids: lesson.bookedStudentIds,
    present_student_ids: lesson.presentStudentIds,
    responses: lesson.responses || [],
  };
}

export async function getLessons() {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .order("date");

  if (error) throw error;

  return (data || []).map(fromDb);
}

export async function addLesson(lesson: Lesson) {
  const { error } = await supabase.from("lessons").insert(toDb(lesson));

  if (error) throw error;
}

export async function updateLesson(lesson: Lesson) {
  const { error } = await supabase
    .from("lessons")
    .update(toDb(lesson))
    .eq("id", lesson.id);

  if (error) throw error;
}

export async function updateLessonResponse(
  lessonId: string,
  response: LessonResponse
) {
  const { error } = await supabase.rpc("update_lesson_response", {
    p_lesson_id: lessonId,
    p_response: response,
  });

  if (error) throw error;
}

export async function deleteLesson(id: string) {
  const { error } = await supabase.from("lessons").delete().eq("id", id);

  if (error) throw error;
}
