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
