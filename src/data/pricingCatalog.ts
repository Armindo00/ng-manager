/**
 * Preçário oficial Next Generation.
 * Mensalidades: frequência semanal × 4 semanas ≈ treinos/mês.
 */

export const WEEKS_PER_MONTH = 4;

export const WETSUIT_RENTAL_FEE = 5;
export const BOARD_STORAGE_FEE = 7.5;
export const PRIVATE_LESSON_FEE = 90;
export const GROUP_LESSON_FEE = 35;
export const SINGLE_TRANSPORT_FEE = 7.5;

export type PricingPlanKind = "monthly" | "pack";

export type PricingPlan = {
  id: string;
  kind: PricingPlanKind;
  /** Rótulo curto no select (ex: "2x / semana · com transporte"). */
  label: string;
  /** Descrição completa. */
  description: string;
  /** Treinos incluídos por mês (mensalidade) ou no pack. */
  trainings: number;
  /** Valor base do plano (€), sem extras. */
  price: number;
  /** Só mensalidades. */
  weeksPerWeek?: 1 | 2 | 3 | 4;
  includesTransport?: boolean;
};

export const MONTHLY_PLANS: PricingPlan[] = [
  {
    id: "monthly-1-transport",
    kind: "monthly",
    weeksPerWeek: 1,
    includesTransport: true,
    trainings: 1 * WEEKS_PER_MONTH,
    price: 115,
    label: "1x / semana · com transporte",
    description: "1 treino/semana com transporte · 115€/mês",
  },
  {
    id: "monthly-1",
    kind: "monthly",
    weeksPerWeek: 1,
    includesTransport: false,
    trainings: 1 * WEEKS_PER_MONTH,
    price: 95,
    label: "1x / semana · sem transporte",
    description: "1 treino/semana sem transporte · 95€/mês",
  },
  {
    id: "monthly-2-transport",
    kind: "monthly",
    weeksPerWeek: 2,
    includesTransport: true,
    trainings: 2 * WEEKS_PER_MONTH,
    price: 220,
    label: "2x / semana · com transporte",
    description: "2 treinos/semana com transporte · 220€/mês",
  },
  {
    id: "monthly-2",
    kind: "monthly",
    weeksPerWeek: 2,
    includesTransport: false,
    trainings: 2 * WEEKS_PER_MONTH,
    price: 190,
    label: "2x / semana · sem transporte",
    description: "2 treinos/semana sem transporte · 190€/mês",
  },
  {
    id: "monthly-3-transport",
    kind: "monthly",
    weeksPerWeek: 3,
    includesTransport: true,
    trainings: 3 * WEEKS_PER_MONTH,
    price: 290,
    label: "3x / semana · com transporte",
    description: "3 treinos/semana com transporte · 290€/mês",
  },
  {
    id: "monthly-3",
    kind: "monthly",
    weeksPerWeek: 3,
    includesTransport: false,
    trainings: 3 * WEEKS_PER_MONTH,
    price: 245,
    label: "3x / semana · sem transporte",
    description: "3 treinos/semana sem transporte · 245€/mês",
  },
  {
    id: "monthly-4-transport",
    kind: "monthly",
    weeksPerWeek: 4,
    includesTransport: true,
    trainings: 4 * WEEKS_PER_MONTH,
    price: 355,
    label: "4x / semana · com transporte",
    description: "4 treinos/semana com transporte · 355€/mês",
  },
  {
    id: "monthly-4",
    kind: "monthly",
    weeksPerWeek: 4,
    includesTransport: false,
    trainings: 4 * WEEKS_PER_MONTH,
    price: 300,
    label: "4x / semana · sem transporte",
    description: "4 treinos/semana sem transporte · 300€/mês",
  },
];

/** Mensalidades especiais (fora da grelha água × transporte). */
export const SPECIAL_MONTHLY_PLANS: PricingPlan[] = [
  {
    id: "monthly-video-analysis",
    kind: "monthly",
    includesTransport: false,
    trainings: 4,
    price: 200,
    label: "Videoanálise",
    description: "Treinos por videoanálise · 200€/mês · ≈4 sessões/mês",
  },
];

export const PACK_PLANS: PricingPlan[] = [
  {
    id: "pack-5",
    kind: "pack",
    trainings: 5,
    price: 150,
    includesTransport: false,
    label: "Pack 5 treinos",
    description: "Pack de 5 aulas sem transporte · 150€",
  },
  {
    id: "pack-10",
    kind: "pack",
    trainings: 10,
    price: 275,
    includesTransport: false,
    label: "Pack 10 treinos",
    description: "Pack de 10 aulas sem transporte · 275€",
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  ...MONTHLY_PLANS,
  ...SPECIAL_MONTHLY_PLANS,
  ...PACK_PLANS,
];

export const CUSTOM_PLAN_ID = "custom";

export function getPricingPlan(planId: string | null | undefined) {
  if (!planId || planId === CUSTOM_PLAN_ID) return null;
  return PRICING_PLANS.find((plan) => plan.id === planId) || null;
}

export function formatEuro(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}€` : `${rounded.toFixed(1).replace(".", ",")}€`;
}

export function addonMonthlyTotal(options: {
  wetsuitRental?: boolean;
  boardStorage?: boolean;
}) {
  return (
    (options.wetsuitRental ? WETSUIT_RENTAL_FEE : 0) +
    (options.boardStorage ? BOARD_STORAGE_FEE : 0)
  );
}

/** Tenta reconhecer um plano do catálogo a partir dos valores já guardados. */
export function matchPricingPlanId(input: {
  billingType: "monthly" | "pack";
  monthlyLimit: number;
  monthlyFee: number;
  packSize: number;
  packPrice: number;
  includesTransport?: boolean;
  planId?: string;
}): string {
  if (input.planId && getPricingPlan(input.planId)) return input.planId;

  if (input.billingType === "pack") {
    const pack = PACK_PLANS.find(
      (plan) =>
        plan.trainings === input.packSize && plan.price === input.packPrice
    );
    return pack?.id || CUSTOM_PLAN_ID;
  }

  const monthly = [...MONTHLY_PLANS, ...SPECIAL_MONTHLY_PLANS].find((plan) => {
    if (plan.trainings !== input.monthlyLimit || plan.price !== input.monthlyFee) {
      return false;
    }
    if (typeof input.includesTransport === "boolean") {
      return Boolean(plan.includesTransport) === input.includesTransport;
    }
    return true;
  });

  return monthly?.id || CUSTOM_PLAN_ID;
}

export function planSummaryLabel(input: {
  planId?: string;
  billingType: "monthly" | "pack";
  monthlyLimit: number;
  monthlyFee: number;
  packSize: number;
  packPrice: number;
  packRemaining?: number;
  includesTransport?: boolean;
  wetsuitRental?: boolean;
  boardStorage?: boolean;
}) {
  const plan = getPricingPlan(input.planId || matchPricingPlanId(input));
  const addonBits = [
    input.wetsuitRental ? `fato ${formatEuro(WETSUIT_RENTAL_FEE)}` : null,
    input.boardStorage ? `prancha ${formatEuro(BOARD_STORAGE_FEE)}` : null,
  ].filter(Boolean);

  if (plan) {
    const base =
      plan.kind === "pack"
        ? `${plan.label} · ${formatEuro(plan.price)}`
        : `${plan.label} · ${plan.trainings} treinos/mês · ${formatEuro(plan.price)}`;
    return addonBits.length ? `${base} + ${addonBits.join(" + ")}` : base;
  }

  if (input.billingType === "pack") {
    const remaining =
      typeof input.packRemaining === "number"
        ? ` · ${input.packRemaining}/${input.packSize} por usar`
        : "";
    return `Pack personalizado · ${input.packSize} treinos · ${formatEuro(input.packPrice)}${remaining}`;
  }

  const transport =
    typeof input.includesTransport === "boolean"
      ? input.includesTransport
        ? " · com transporte"
        : " · sem transporte"
      : "";
  const base = `Plano personalizado · ${input.monthlyLimit} treinos/mês · ${formatEuro(input.monthlyFee)}${transport}`;
  return addonBits.length ? `${base} + ${addonBits.join(" + ")}` : base;
}
