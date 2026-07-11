import { supabase } from "./supabase";

export type StudentAccess = {
  studentId: string;
  appUserId: string;
  email: string;
  blocked: boolean;
};

export type StudentAuthResult = {
  hasAccess: boolean;
  blocked: boolean;
  email?: string;
  password?: string;
  error?: string;
};

type Action = "create" | "reset-password" | "toggle-block" | "delete-access" | "update-email";

async function invokeStudentAuth(
  action: Action,
  studentId: string,
  options?: { name?: string; email?: string }
): Promise<StudentAuthResult> {
  const { data, error } = await supabase.functions.invoke("admin-student-auth", {
    body: {
      action,
      studentId,
      name: options?.name,
      email: options?.email,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as StudentAuthResult;
}

export async function getStudentAccessMap() {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, student_id, email, blocked")
    .eq("role", "student");

  if (error) throw error;

  const map = new Map<string, StudentAccess>();

  for (const row of data || []) {
    if (!row.student_id) continue;

    map.set(row.student_id, {
      studentId: row.student_id,
      appUserId: row.id,
      email: row.email,
      blocked: row.blocked ?? false,
    });
  }

  return map;
}

export async function createStudentAccess(
  studentId: string,
  name: string,
  email: string
) {
  return invokeStudentAuth("create", studentId, { name, email });
}

export async function resetStudentPassword(studentId: string) {
  return invokeStudentAuth("reset-password", studentId);
}

export async function toggleStudentBlock(studentId: string) {
  return invokeStudentAuth("toggle-block", studentId);
}

export async function deleteStudentAccess(studentId: string) {
  return invokeStudentAuth("delete-access", studentId);
}

export async function updateStudentAccessEmail(studentId: string, email: string) {
  return invokeStudentAuth("update-email", studentId, { email });
}
