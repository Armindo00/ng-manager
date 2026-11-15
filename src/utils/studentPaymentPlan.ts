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

/** Valor esperado a cobrar: plano base + extras mensais (fato / prancha). */
export function resolveExpectedCharge(student: Student) {
  if (isPackStudent(student)) {
    return student.packPrice > 0 ? student.packPrice : 0;
  }

  const base = student.monthlyFee > 0 ? student.monthlyFee : 0;
  return base + addonMonthlyTotal(student);
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
