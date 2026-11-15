import type { Lesson, Student } from "../types";
import type { Payment } from "../services/paymentsService";
import {
  addonMonthlyTotal,
  planSummaryLabel,
} from "../data/pricingCatalog";
import { isDateInMonthYear } from "./dateUtils";

/** Fallback = plano mais baixo do preçário (1x sem transporte). */
export const DEFAULT_MONTHLY_FEE = 95;

export function isPackStudent(student: Pick<Student, "billingType">) {
  return student.billingType === "pack";
}

/**
 * Valor a cobrar no fim do mês / no pagamento do pack,
 * tirado do plano do preçário (+ extras).
 */
export function resolveExpectedCharge(student: Student) {
  if (isPackStudent(student)) {
    return student.packPrice > 0 ? student.packPrice : 0;
  }

  const base = student.monthlyFee > 0 ? student.monthlyFee : 0;
  return Math.round((base + addonMonthlyTotal(student)) * 100) / 100;
}

/** Alias explícito: quanto o aluno tem de pagar segundo o plano. */
export function amountDueFromPlan(student: Student) {
  return resolveExpectedCharge(student);
}

export function resolveStudentMonthlyFee(
  student: Student,
  payments: Payment[],
  fallback = DEFAULT_MONTHLY_FEE
) {
  const expected = resolveExpectedCharge(student);
  if (expected > 0) return expected;

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

export function studentPlanLabel(student: Student) {
  return planSummaryLabel(student);
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

/** Taxa de presença no mês: presentes / inscritos no treino (booked). */
export function studentAttendanceRateInMonth(
  studentId: string,
  lessons: Lesson[],
  month: number,
  year: number
) {
  const monthLessons = lessons.filter(
    (lesson) =>
      lesson.status !== "draft" &&
      isDateInMonthYear(lesson.date, month, year) &&
      lesson.bookedStudentIds.includes(studentId)
  );
  const booked = monthLessons.length;
  const present = monthLessons.filter((lesson) =>
    lesson.presentStudentIds.includes(studentId)
  ).length;

  return {
    booked,
    present,
    rate: booked === 0 ? 0 : Math.round((present / booked) * 100),
  };
}

/**
 * @deprecated Prefer amountDueFromPlan — o valor a cobrar é o do plano,
 * não proporcional às presenças.
 */
export function suggestAmountForTrainings(
  monthlyFee: number,
  _monthlyLimit: number,
  _trainingsDone: number
) {
  return monthlyFee > 0 ? monthlyFee : 0;
}

export function billingTypeLabel(billingType: Student["billingType"]) {
  return billingType === "pack" ? "Pack" : "Mensalidade";
}

export type ParsedPlanFields = {
  planId: string;
  billingType: Student["billingType"];
  monthlyLimit: number;
  monthlyFee: number;
  packSize: number;
  packPrice: number;
  packRemaining: number;
  includesTransport: boolean;
  wetsuitRental: boolean;
  boardStorage: boolean;
};

/** Valida e normaliza o draft do formulário de plano. Devolve erro em PT ou os campos. */
export function parseStudentPlanDraft(draft: {
  planId: string;
  billingType: Student["billingType"];
  monthlyLimit: string;
  monthlyFee: string;
  packSize: string;
  packPrice: string;
  packRemaining: string;
  includesTransport: boolean;
  wetsuitRental: boolean;
  boardStorage: boolean;
}): { ok: true; value: ParsedPlanFields } | { ok: false; error: string } {
  const feeNumber = draft.monthlyFee.trim() === "" ? 0 : Number(draft.monthlyFee);
  const packPriceNumber =
    draft.packPrice.trim() === "" ? 0 : Number(draft.packPrice);
  const packSizeNumber =
    draft.packSize.trim() === "" ? 0 : Number(draft.packSize);
  const packRemainingNumber =
    draft.packRemaining.trim() === ""
      ? packSizeNumber
      : Number(draft.packRemaining);
  const monthlyLimitNumber =
    draft.monthlyLimit.trim() === "" ? 0 : Number(draft.monthlyLimit);

  if (draft.billingType === "monthly") {
    if (!Number.isFinite(monthlyLimitNumber) || monthlyLimitNumber < 0) {
      return { ok: false, error: "Indica os treinos por mês." };
    }
    if (!Number.isFinite(feeNumber) || feeNumber < 0) {
      return { ok: false, error: "Valor mensal inválido." };
    }
  } else {
    if (!Number.isFinite(packSizeNumber) || packSizeNumber <= 0) {
      return { ok: false, error: "Indica o número de treinos do pack." };
    }
    if (!Number.isFinite(packPriceNumber) || packPriceNumber < 0) {
      return { ok: false, error: "Valor do pack inválido." };
    }
    if (!Number.isFinite(packRemainingNumber)) {
      return { ok: false, error: "Treinos por usar inválidos." };
    }
  }

  return {
    ok: true,
    value: {
      planId: draft.planId || "custom",
      billingType: draft.billingType,
      monthlyLimit: draft.billingType === "monthly" ? monthlyLimitNumber : 0,
      monthlyFee: draft.billingType === "monthly" ? feeNumber : 0,
      packSize: draft.billingType === "pack" ? packSizeNumber : 0,
      packPrice: draft.billingType === "pack" ? packPriceNumber : 0,
      packRemaining: draft.billingType === "pack" ? packRemainingNumber : 0,
      includesTransport:
        draft.billingType === "monthly" ? draft.includesTransport : false,
      wetsuitRental:
        draft.billingType === "monthly" ? draft.wetsuitRental : false,
      boardStorage:
        draft.billingType === "monthly" ? draft.boardStorage : false,
    },
  };
}
