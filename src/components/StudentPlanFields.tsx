import FormField from "./FormField";
import type { StudentBillingType } from "../types";
import {
  BOARD_STORAGE_FEE,
  CUSTOM_PLAN_ID,
  MONTHLY_PLANS,
  PACK_PLANS,
  SPECIAL_MONTHLY_PLANS,
  WETSUIT_RENTAL_FEE,
  addonMonthlyTotal,
  formatEuro,
  getPricingPlan,
} from "../data/pricingCatalog";

export type StudentPlanDraft = {
  planId: string;
  billingType: StudentBillingType;
  monthlyLimit: string;
  monthlyFee: string;
  packSize: string;
  packPrice: string;
  packRemaining: string;
  includesTransport: boolean;
  wetsuitRental: boolean;
  boardStorage: boolean;
};

type Props = {
  value: StudentPlanDraft;
  onChange: (patch: Partial<StudentPlanDraft>) => void;
  /** Em packs, mostrar campo de saldo por usar. */
  showPackRemaining?: boolean;
};

export function emptyPlanDraft(): StudentPlanDraft {
  return {
    planId: "",
    billingType: "monthly",
    monthlyLimit: "",
    monthlyFee: "",
    packSize: "",
    packPrice: "",
    packRemaining: "",
    includesTransport: false,
    wetsuitRental: false,
    boardStorage: false,
  };
}

export function draftFromStudentPlan(input: {
  planId?: string;
  billingType?: StudentBillingType;
  monthlyLimit?: number;
  monthlyFee?: number;
  packSize?: number;
  packPrice?: number;
  packRemaining?: number;
  includesTransport?: boolean;
  wetsuitRental?: boolean;
  boardStorage?: boolean;
}): StudentPlanDraft {
  const billingType = input.billingType || "monthly";
  return {
    planId: input.planId || "",
    billingType,
    monthlyLimit: input.monthlyLimit ? String(input.monthlyLimit) : "",
    monthlyFee: input.monthlyFee ? String(input.monthlyFee) : "",
    packSize: input.packSize ? String(input.packSize) : "",
    packPrice: input.packPrice ? String(input.packPrice) : "",
    packRemaining:
      input.packRemaining || input.packSize
        ? String(input.packRemaining ?? input.packSize)
        : "",
    includesTransport: Boolean(input.includesTransport),
    wetsuitRental: Boolean(input.wetsuitRental),
    boardStorage: Boolean(input.boardStorage),
  };
}

export function applyPlanSelection(
  planId: string,
  current: StudentPlanDraft
): StudentPlanDraft {
  if (!planId || planId === CUSTOM_PLAN_ID) {
    return { ...current, planId: planId || CUSTOM_PLAN_ID };
  }

  const plan = getPricingPlan(planId);
  if (!plan) return { ...current, planId: CUSTOM_PLAN_ID };

  if (plan.kind === "pack") {
    return {
      ...current,
      planId: plan.id,
      billingType: "pack",
      packSize: String(plan.trainings),
      packPrice: String(plan.price),
      packRemaining: String(plan.trainings),
      monthlyLimit: "",
      monthlyFee: "",
      includesTransport: false,
    };
  }

  return {
    ...current,
    planId: plan.id,
    billingType: "monthly",
    monthlyLimit: String(plan.trainings),
    monthlyFee: String(plan.price),
    packSize: "",
    packPrice: "",
    packRemaining: "",
    includesTransport: Boolean(plan.includesTransport),
  };
}

function StudentPlanFields({
  value,
  onChange,
  showPackRemaining = true,
}: Props) {
  const selectedPlan = getPricingPlan(value.planId);
  const isCustom =
    !value.planId || value.planId === CUSTOM_PLAN_ID || !selectedPlan;
  const addons = addonMonthlyTotal(value);
  const baseFee =
    value.billingType === "pack"
      ? Number(value.packPrice || 0)
      : Number(value.monthlyFee || 0);
  const expected =
    value.billingType === "pack" ? baseFee : baseFee + addons;

  return (
    <>
      <FormField label="Plano (preçário)">
        <select
          value={value.planId || ""}
          onChange={(event) =>
            onChange(applyPlanSelection(event.target.value, value))
          }
        >
          <option value="">Escolher plano…</option>
          <optgroup label="Mensalidades">
            {MONTHLY_PLANS.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.label} · {formatEuro(plan.price)} · ≈{plan.trainings}/mês
              </option>
            ))}
          </optgroup>
          <optgroup label="Videoanálise">
            {SPECIAL_MONTHLY_PLANS.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.label} · {formatEuro(plan.price)} · ≈{plan.trainings}/mês
              </option>
            ))}
          </optgroup>
          <optgroup label="Packs (sem transporte)">
            {PACK_PLANS.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.label} · {formatEuro(plan.price)}
              </option>
            ))}
          </optgroup>
          <option value={CUSTOM_PLAN_ID}>Personalizado</option>
        </select>
      </FormField>

      {selectedPlan && (
        <p className="muted plan-hint">{selectedPlan.description}</p>
      )}

      {isCustom && (
        <FormField label="Tipo de registo">
          <select
            value={value.billingType}
            onChange={(event) =>
              onChange({
                planId: CUSTOM_PLAN_ID,
                billingType: event.target.value as StudentBillingType,
              })
            }
          >
            <option value="monthly">Mensalidade</option>
            <option value="pack">Pack de treinos</option>
          </select>
        </FormField>
      )}

      {value.billingType === "monthly" ? (
        <>
          <FormField label="Treinos por mês">
            <input
              type="number"
              min={0}
              max={31}
              placeholder="Ex: 8"
              value={monthlyLimitValue(value)}
              disabled={!isCustom}
              onChange={(event) =>
                onChange({
                  planId: CUSTOM_PLAN_ID,
                  monthlyLimit: event.target.value,
                })
              }
            />
          </FormField>
          <FormField label="Mensalidade base (€)">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 190"
              value={value.monthlyFee}
              disabled={!isCustom}
              onChange={(event) =>
                onChange({
                  planId: CUSTOM_PLAN_ID,
                  monthlyFee: event.target.value,
                })
              }
            />
          </FormField>
          {isCustom && (
            <label className="quota-filter-toggle">
              <input
                type="checkbox"
                checked={value.includesTransport}
                onChange={(event) =>
                  onChange({
                    planId: CUSTOM_PLAN_ID,
                    includesTransport: event.target.checked,
                  })
                }
              />
              Inclui transporte
            </label>
          )}
        </>
      ) : (
        <>
          <FormField label="Treinos do pack">
            <input
              type="number"
              min={0}
              max={100}
              placeholder="Ex: 10"
              value={value.packSize}
              disabled={!isCustom}
              onChange={(event) =>
                onChange({
                  planId: CUSTOM_PLAN_ID,
                  packSize: event.target.value,
                })
              }
            />
          </FormField>
          <FormField label="Valor do pack (€)">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 275"
              value={value.packPrice}
              disabled={!isCustom}
              onChange={(event) =>
                onChange({
                  planId: CUSTOM_PLAN_ID,
                  packPrice: event.target.value,
                })
              }
            />
          </FormField>
          {showPackRemaining && (
            <FormField label="Treinos por usar">
              <input
                type="number"
                min={0}
                max={100}
                placeholder="Ex: 10"
                value={value.packRemaining}
                onChange={(event) =>
                  onChange({ packRemaining: event.target.value })
                }
              />
            </FormField>
          )}
        </>
      )}

      {value.billingType === "monthly" && (
        <div className="plan-addons">
          <span className="plan-addons-label">Extras mensais</span>
          <label className="quota-filter-toggle">
            <input
              type="checkbox"
              checked={value.wetsuitRental}
              onChange={(event) =>
                onChange({ wetsuitRental: event.target.checked })
              }
            />
            Aluguer de fato ({formatEuro(WETSUIT_RENTAL_FEE)}/mês)
          </label>
          <label className="quota-filter-toggle">
            <input
              type="checkbox"
              checked={value.boardStorage}
              onChange={(event) =>
                onChange({ boardStorage: event.target.checked })
              }
            />
            Guardar pranchas ({formatEuro(BOARD_STORAGE_FEE)}/mês)
          </label>
        </div>
      )}

      {expected > 0 && (
        <p className="plan-expected">
          Valor esperado: <strong>{formatEuro(expected)}</strong>
          {value.billingType === "monthly" && addons > 0
            ? ` (plano ${formatEuro(baseFee)} + extras ${formatEuro(addons)})`
            : ""}
        </p>
      )}
    </>
  );
}

function monthlyLimitValue(value: StudentPlanDraft) {
  return value.monthlyLimit;
}

export default StudentPlanFields;
