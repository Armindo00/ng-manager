import { getCurrentMonthYear } from "../utils/dateUtils";
import { supabase } from "./supabase";

export type PaymentStatus = "pending" | "paid" | "cancelled";

export type Payment = {
  id: string;
  studentId: string;
  month: number;
  year: number;
  amount: number;
  status: PaymentStatus;
  paymentDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
};

type DbPayment = {
  id: string;
  student_id: string;
  month: number;
  year: number;
  amount: number;
  status: PaymentStatus;
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
};

function fromDb(payment: DbPayment): Payment {
  return {
    id: payment.id,
    studentId: payment.student_id,
    month: payment.month,
    year: payment.year,
    amount: Number(payment.amount),
    status: payment.status,
    paymentDate: payment.payment_date,
    paymentMethod: payment.payment_method,
    notes: payment.notes,
  };
}

function toDb(payment: Payment) {
  return {
    id: payment.id,
    student_id: payment.studentId,
    month: payment.month,
    year: payment.year,
    amount: payment.amount,
    status: payment.status,
    payment_date: payment.paymentDate,
    payment_method: payment.paymentMethod,
    notes: payment.notes,
  };
}

export async function getPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) throw error;

  return (data || []).map(fromDb);
}

export async function addPayment(payment: Payment) {
  const { error } = await supabase.from("payments").insert(toDb(payment));

  if (error) throw error;
}

export async function updatePayment(payment: Payment) {
  const { error } = await supabase
    .from("payments")
    .update(toDb(payment))
    .eq("id", payment.id);

  if (error) throw error;
}

export async function deletePayment(id: string) {
  const { error } = await supabase.from("payments").delete().eq("id", id);

  if (error) throw error;
}

export async function syncStudentPaidStatus(studentId: string) {
  const { month, year } = getCurrentMonthYear();

  const { data, error } = await supabase
    .from("payments")
    .select("id")
    .eq("student_id", studentId)
    .eq("month", month)
    .eq("year", year)
    .eq("status", "paid")
    .limit(1);

  if (error) throw error;

  const isPaid = (data?.length ?? 0) > 0;

  const { error: updateError } = await supabase
    .from("students")
    .update({ paid: isPaid })
    .eq("id", studentId);

  if (updateError) throw updateError;

  return isPaid;
}

/**
 * Garante um pagamento do mês com o valor do plano.
 * - Se não existe: cria pendente com `amount`.
 * - Se existe pendente/cancelado: atualiza o valor (não toca em pagos).
 */
export async function ensureMonthPaymentAmount(options: {
  studentId: string;
  amount: number;
  month?: number;
  year?: number;
  notes?: string | null;
}): Promise<Payment | null> {
  const current = getCurrentMonthYear();
  const month = options.month ?? current.month;
  const year = options.year ?? current.year;
  const amount = Math.round(options.amount * 100) / 100;

  if (!(amount > 0)) return null;

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("student_id", options.studentId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const created: Payment = {
      id: crypto.randomUUID(),
      studentId: options.studentId,
      month,
      year,
      amount,
      status: "pending",
      paymentDate: null,
      paymentMethod: null,
      notes: options.notes ?? null,
    };
    await addPayment(created);
    return created;
  }

  const existing = fromDb(data);
  if (existing.status === "paid") return existing;
  if (existing.amount === amount && existing.status === "pending") {
    return existing;
  }

  const next: Payment = {
    ...existing,
    amount,
    status: "pending",
    notes: options.notes ?? existing.notes,
  };
  await updatePayment(next);
  return next;
}
