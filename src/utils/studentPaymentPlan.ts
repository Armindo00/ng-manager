import type { Lesson, Student } from "../types";
import type { Payment } from "../services/paymentsService";
import { isDateInMonthYear } from "./dateUtils";

export const DEFAULT_MONTHLY_FEE = 80;

export function isPackStudent(student: Pick<Student, "billingType">) {
  return student.billingType === "pack";
}

export function resolveStudentMonthlyFee(
  student: Student,
  payments: Payment[],
  fallback = DEFAULT_MONTHLY_FEE
) {
  if (isPackStudent(student) && student.packPrice > 0) return student.packPrice;
  if (student.monthlyFee > 0) return student.monthlyFee;

  const previous = payments
    .filter(
      (payment) =>
        payment.studentId === student.id &&
        payment.status === "paid" &&
        payment.amount > 0
    )
    .sort((a, b) => b.year - a.year || b.month - a.month)[0];

  return previous?.amount || fallback;
}

export function countStudentTrainingsInMonth(
  studentId: string,
  lessons: Lesson[],
  month: number,
  year: number
) {
  return lessons.filter(
    (lesson) =>
      isDateInMonthYear(lesson.date, month, year) &&
      lesson.presentStudentIds.includes(studentId)
  ).length;
}

export function countStudentTrainingsTotal(studentId: string, lessons: Lesson[]) {
  return lessons.filter((lesson) =>
    lesson.presentStudentIds.includes(studentId)
  ).length;
}

/** Sugere valor proporcional aos treinos feitos, sem ultrapassar a mensalidade. */
export function suggestAmountForTrainings(
  monthlyFee: number,
  monthlyLimit: number,
  trainingsDone: number
) {
  if (!(monthlyFee > 0)) return 0;
  if (!(monthlyLimit > 0)) return monthlyFee;

  const ratio = Math.min(1, Math.max(0, trainingsDone) / monthlyLimit);
  return Math.round(monthlyFee * ratio * 100) / 100;
}

export function billingTypeLabel(billingType: Student["billingType"]) {
  return billingType === "pack" ? "Pack" : "Mensalidade";
}
