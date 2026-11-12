import { supabase } from "./supabase";
import type { Student, StudentBillingType } from "../types";

type DbStudent = {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: string;
  monthly_limit: number;
  monthly_fee?: number | null;
  billing_type?: string | null;
  pack_size?: number | null;
  pack_price?: number | null;
  pack_remaining?: number | null;
  paid: boolean;
  pickup: string;
  main_coach: string;
  notes: string;
};

function normalizeBillingType(value: string | null | undefined): StudentBillingType {
  return value === "pack" ? "pack" : "monthly";
}

function fromDb(student: DbStudent): Student {
  return {
    id: student.id,
    name: student.name,
    phone: student.phone,
    email: student.email,
    level: student.level,
    billingType: normalizeBillingType(student.billing_type),
    monthlyLimit: student.monthly_limit,
    monthlyFee: Number(student.monthly_fee ?? 0),
    packSize: Number(student.pack_size ?? 0),
    packPrice: Number(student.pack_price ?? 0),
    packRemaining: Number(student.pack_remaining ?? 0),
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
    billing_type: student.billingType,
    monthly_limit: student.monthlyLimit,
    monthly_fee: student.monthlyFee,
    pack_size: student.packSize,
    pack_price: student.packPrice,
    pack_remaining: student.packRemaining,
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

const OPTIONAL_STUDENT_COLUMNS = [
  "monthly_fee",
  "billing_type",
  "pack_size",
  "pack_price",
  "pack_remaining",
] as const;

function missingOptionalColumn(error: { message?: string; code?: string }) {
  const message = (error.message || "").toLowerCase();
  if (!(message.includes("column") || message.includes("schema cache") || error.code === "PGRST204")) {
    return null;
  }

  return (
    OPTIONAL_STUDENT_COLUMNS.find((column) => message.includes(column)) || null
  );
}

function withoutColumn(
  payload: Record<string, unknown>,
  column: string
): Record<string, unknown> {
  const next = { ...payload };
  delete next[column];
  return next;
}

async function writeStudent(
  mode: "insert" | "update",
  student: Student
) {
  let payload: Record<string, unknown> = toDb(student);

  for (let attempt = 0; attempt < OPTIONAL_STUDENT_COLUMNS.length + 1; attempt += 1) {
    const result =
      mode === "insert"
        ? await supabase.from("students").insert(payload)
        : await supabase.from("students").update(payload).eq("id", student.id);

    if (!result.error) return;

    const missing = missingOptionalColumn(result.error);
    if (!missing || !(missing in payload)) throw result.error;

    payload = withoutColumn(payload, missing);
  }
}

export async function addStudent(student: Student) {
  await writeStudent("insert", student);
}

export async function updateStudent(student: Student) {
  await writeStudent("update", student);
}

export async function deleteStudent(id: string) {
  const { error } = await supabase.from("students").delete().eq("id", id);

  if (error) throw error;
}
