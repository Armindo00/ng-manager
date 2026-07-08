import { supabase } from "./supabase";
import type { User } from "../types";

type DbUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "coach" | "admin";
  student_id: string | null;
};

function fromDb(user: DbUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.student_id || undefined,
  };
}

export async function getUsers() {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .order("role");

  if (error) throw error;

  return (data || []).map(fromDb);
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("email", email)
    .single();

  if (error) throw error;

  return fromDb(data);
}
