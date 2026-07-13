import { supabase } from "./supabase";
import type { User } from "../types";

type DbUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "coach" | "admin";
  student_id: string | null;
  must_change_password?: boolean | null;
};

function fromDb(user: DbUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.student_id || undefined,
    mustChangePassword: user.must_change_password ?? false,
  };
}

export function requiresPasswordChange(user: User) {
  return Boolean(user.mustChangePassword) && user.role !== "admin";
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
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .ilike("email", normalizedEmail)
    .single();

  if (error) throw error;

  return fromDb(data);
}
