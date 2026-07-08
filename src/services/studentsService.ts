import { supabase } from "./supabase";
import type { Student } from "../types";

type DbStudent = {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: string;
  monthly_limit: number;
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

export async function addStudent(student: Student) {
  const { error } = await supabase.from("students").insert(toDb(student));

  if (error) throw error;
}

export async function updateStudent(student: Student) {
  const { error } = await supabase
    .from("students")
    .update(toDb(student))
    .eq("id", student.id);

  if (error) throw error;
}

export async function deleteStudent(id: string) {
  const { error } = await supabase.from("students").delete().eq("id", id);

  if (error) throw error;
}
