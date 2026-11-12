import { supabase } from "./supabase";
import type { Student } from "../types";

type DbStudent = {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: string;
  monthly_limit: number;
  monthly_fee?: number | null;
  paid: boolean;
  pickup: string;
  main_coach: string;
  notes: string;
};

function fromDb(student: DbStudent): Student {
  return {
    id: student.id,
    name: student.name,
    phone: student.phone,
    email: student.email,
    level: student.level,
    monthlyLimit: student.monthly_limit,
    monthlyFee: Number(student.monthly_fee ?? 0),
    paid: student.paid,
    pickup: student.pickup,
    mainCoach: student.main_coach,
    notes: student.notes,
  };
}

function toDb(student: Student) {
  return {
    id: student.id,
    name: student.name,
    phone: student.phone,
    email: student.email,
    level: student.level,
    monthly_limit: student.monthlyLimit,
    monthly_fee: student.monthlyFee,
    paid: student.paid,
    pickup: student.pickup,
    main_coach: student.mainCoach,
    notes: student.notes,
  };
}

export async function getStudents() {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("name");

  if (error) throw error;

  return (data || []).map(fromDb);
}

export async function getCurrentStudent(user: { role: string; studentId?: string }) {
  if (user.role !== "student") return null;

  if (user.studentId) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", user.studentId)
      .maybeSingle();

    if (error) throw error;
    if (data) return fromDb(data);
  }

  const { data, error } = await supabase.from("students").select("*").maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return fromDb(data);
}

function isMissingMonthlyFeeColumn(error: { message?: string; code?: string }) {
  const message = (error.message || "").toLowerCase();
  return (
    message.includes("monthly_fee") &&
    (message.includes("column") ||
      message.includes("schema cache") ||
      error.code === "PGRST204")
  );
}

function toDbWithoutMonthlyFee(student: Student) {
  const payload = toDb(student);
  delete (payload as { monthly_fee?: number }).monthly_fee;
  return payload;
}

export async function addStudent(student: Student) {
  const payload = toDb(student);
  const { error } = await supabase.from("students").insert(payload);

  if (!error) return;

  if (!isMissingMonthlyFeeColumn(error)) throw error;

  const { error: fallbackError } = await supabase
    .from("students")
    .insert(toDbWithoutMonthlyFee(student));

  if (fallbackError) throw fallbackError;
}

export async function updateStudent(student: Student) {
  const payload = toDb(student);
  const { error } = await supabase
    .from("students")
    .update(payload)
    .eq("id", student.id);

  if (!error) return;

  if (!isMissingMonthlyFeeColumn(error)) throw error;

  const { error: fallbackError } = await supabase
    .from("students")
    .update(toDbWithoutMonthlyFee(student))
    .eq("id", student.id);

  if (fallbackError) throw fallbackError;
}

export async function deleteStudent(id: string) {
  const { error } = await supabase.from("students").delete().eq("id", id);

  if (error) throw error;
}
