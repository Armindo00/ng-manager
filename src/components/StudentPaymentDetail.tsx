import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import {
  addPayment,
  ensureMonthPaymentAmount,
  syncStudentPaidStatus,
  updatePayment,
  type Payment,
  type PaymentStatus,
} from "../services/paymentsService";
import { updateStudent } from "../services/studentsService";
import StudentPlanFields, {
  draftFromStudentPlan,
  type StudentPlanDraft,
} from "./StudentPlanFields";
import { getCurrentMonthYear, getTodayDate } from "../utils/dateUtils";
import { addonMonthlyTotal } from "../data/pricingCatalog";
import {
  amountDueFromPlan,
  billingTypeLabel,
  countStudentTrainingsInMonth,
  countStudentTrainingsTotal,
  DEFAULT_MONTHLY_FEE,
  parseStudentPlanDraft,
  resolveStudentMonthlyFee,
  studentPlanLabel,
} from "../utils/studentPaymentPlan";

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type Props = {
  student: Student;
  payments: Payment[];
  lessons: Lesson[];
  selectedYear: number;
  yearOptions: number[];
  onYearChange: (year: number) => void;
  onBack: () => void;
  onStudentUpdated: (student: Student) => void;
  onPaymentUpserted: (payment: Payment) => void;
};

type MonthDraft = {
  amount: string;
  status: PaymentStatus;
};

function planAmountFromDraft(
  draft: StudentPlanDraft,
  student: Student,
  payments: Payment[]
) {
  if (draft.billingType === "pack") {
    const packPrice = Number(draft.packPrice || 0);
    if (packPrice > 0) return packPrice;
    return amountDueFromPlan(student) || resolveStudentMonthlyFee(student, payments);
  }

  const base = Number(draft.monthlyFee || 0);
  const withAddons =
    Math.round((base + addonMonthlyTotal(draft)) * 100) / 100;
  if (withAddons > 0) return withAddons;
  return amountDueFromPlan(student) || resolveStudentMonthlyFee(student, payments);
}

function buildMonthDrafts(
  student: Student,
  payments: Payment[],
  selectedYear: number,
  planAmount: number
) {
  const paymentByMonth = new Map<number, Payment>();

  for (const payment of payments) {
    if (payment.studentId === student.id && payment.year === selectedYear) {
      paymentByMonth.set(payment.month, payment);
    }
  }

  const drafts: Record<number, MonthDraft> = {};
  const due =
    planAmount > 0
      ? planAmount
      : resolveStudentMonthlyFee(student, payments, DEFAULT_MONTHLY_FEE);

  for (let month = 1; month <= 12; month += 1) {
    const payment = paymentByMonth.get(month);

    drafts[month] = {
      amount: payment ? String(payment.amount) : String(due),
      status: payment?.status || "pending",
    };
  }

  return drafts;
}

function StudentPaymentDetail({
  student,
  payments,
  lessons,
  selectedYear,
  yearOptions,
  onYearChange,
  onBack,
  onStudentUpdated,
  onPaymentUpserted,
}: Props) {
  const currentPeriod = getCurrentMonthYear();
  const resolvedFee = resolveStudentMonthlyFee(student, payments);

  const [planDraft, setPlanDraft] = useState<StudentPlanDraft>(() =>
    draftFromStudentPlan(student)
  );
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingMonth, setSavingMonth] = useState<number | null>(null);
  const [savingPackPayment, setSavingPackPayment] = useState(false);
  const planAmount = useMemo(
    () => planAmountFromDraft(planDraft, student, payments),
    [planDraft, student, payments]
  );

  const [monthDrafts, setMonthDrafts] = useState<Record<number, MonthDraft>>(
    () =>
      buildMonthDrafts(
        student,
        payments,
        selectedYear,
        planAmountFromDraft(draftFromStudentPlan(student), student, payments)
      )
  );

  const billingTypeDraft = planDraft.billingType;
  const monthlyLimitDraft = planDraft.monthlyLimit;
  const packPriceDraft = planDraft.packPrice;
  const packSizeDraft = planDraft.packSize;
  const packRemainingDraft = planDraft.packRemaining;
  const expectedTrainings =
    Number(monthlyLimitDraft) || student.monthlyLimit || 0;
  const totalTrainingsDone = useMemo(
    () => countStudentTrainingsTotal(student.id, lessons),
    [student.id, lessons]
  );

  const studentPayments = useMemo(
    () =>
      payments
        .filter((payment) => payment.studentId === student.id)
        .sort((a, b) => b.year - a.year || b.month - a.month),
    [payments, student.id]
  );

  const months = useMemo(() => {
    const due = planAmount > 0 ? planAmount : resolvedFee;
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const payment =
        payments.find(
          (item) =>
            item.studentId === student.id &&
            item.year === selectedYear &&
            item.month === month
        ) || null;
      const trainingsDone = countStudentTrainingsInMonth(
        student.id,
        lessons,
        month,
        selectedYear
      );
      return {
        month,
        label: MONTH_LABELS[index],
        payment,
        trainingsDone,
        suggested: due,
        isCurrent:
          month === currentPeriod.month && selectedYear === currentPeriod.year,
      };
    });
  }, [
    payments,
    lessons,
    student.id,
    selectedYear,
    planAmount,
    resolvedFee,
    currentPeriod.month,
    currentPeriod.year,
  ]);

  async function savePlan() {
    const parsed = parseStudentPlanDraft(planDraft);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }

    const nextStudent: Student = {
      ...student,
      ...parsed.value,
    };

    const due = amountDueFromPlan(nextStudent);

    try {
      setSavingPlan(true);
      await updateStudent(nextStudent);
      onStudentUpdated(nextStudent);

      if (due > 0) {
        const payment = await ensureMonthPaymentAmount({
          studentId: nextStudent.id,
          amount: due,
          month: currentPeriod.month,
          year: currentPeriod.year,
          notes:
            nextStudent.billingType === "pack"
              ? "Pack"
              : "Mensalidade (plano)",
        });
        if (payment) onPaymentUpserted(payment);
        setMonthDrafts(
          buildMonthDrafts(nextStudent, payments, selectedYear, due)
        );
      }

      toast.success(
        due > 0
          ? `Plano guardado · a cobrar ${due}€ este mês`
          : "Plano do atleta atualizado."
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar o plano do atleta.");
    } finally {
      setSavingPlan(false);
    }
  }

  function updateMonthDraft(month: number, patch: Partial<MonthDraft>) {
    setMonthDrafts((current) => ({
      ...current,
      [month]: {
        ...(current[month] || { amount: "", status: "pending" }),
        ...patch,
      },
    }));
  }

  async function saveMonth(month: number, options?: { useSuggested?: boolean }) {
    const row = months.find((item) => item.month === month);
    const draft = monthDrafts[month];
    if (!row || !draft) return;

    const amountNumber = Number(
      options?.useSuggested ? row.suggested : draft.amount
    );
    if (!Number.isFinite(amountNumber) || amountNumber < 0) {
      toast.error("Valor inválido.");
      return;
    }

    const status = draft.status;
    const existing = row.payment;

    const nextPayment: Payment = existing
      ? {
          ...existing,
          amount: amountNumber,
          status,
          paymentDate:
            status === "paid"
              ? existing.paymentDate || getTodayDate()
              : null,
        }
      : {
          id: crypto.randomUUID(),
          studentId: student.id,
          month,
          year: selectedYear,
          amount: amountNumber,
          status,
          paymentDate: status === "paid" ? getTodayDate() : null,
          paymentMethod: null,
          notes: billingTypeDraft === "pack" ? "Pack" : null,
        };

    try {
      setSavingMonth(month);
      if (existing) {
        await updatePayment(nextPayment);
      } else {
        await addPayment(nextPayment);
      }
      await syncStudentPaidStatus(student.id);
      updateMonthDraft(month, {
        amount: String(amountNumber),
        status,
      });
      onPaymentUpserted(nextPayment);
      toast.success(
        `${MONTH_LABELS[month - 1]} · ${amountNumber}€ guardado`
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar o valor do mês.");
    } finally {
      setSavingMonth(null);
    }
  }

  async function registerPackPayment() {
    const amountNumber = Number(packPriceDraft || student.packPrice || 0);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      toast.error("Indica o valor do pack antes de registar o pagamento.");
      return;
    }

    const existing = payments.find(
      (payment) =>
        payment.studentId === student.id &&
        payment.year === currentPeriod.year &&
        payment.month === currentPeriod.month
    );

    const nextPayment: Payment = existing
      ? {
          ...existing,
          amount: amountNumber,
          status: "paid",
          paymentDate: getTodayDate(),
          notes: existing.notes || "Pack",
        }
      : {
          id: crypto.randomUUID(),
          studentId: student.id,
          month: currentPeriod.month,
          year: currentPeriod.year,
          amount: amountNumber,
          status: "paid",
          paymentDate: getTodayDate(),
          paymentMethod: null,
          notes: "Pack",
        };

    try {
      setSavingPackPayment(true);
      if (existing) {
        await updatePayment(nextPayment);
      } else {
        await addPayment(nextPayment);
      }
      await syncStudentPaidStatus(student.id);
      onPaymentUpserted(nextPayment);
      toast.success(`Pagamento do pack registado · ${amountNumber}€`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registar pagamento do pack.");
    } finally {
      setSavingPackPayment(false);
    }
  }

  return (
    <div className="dashboard-page payments-page student-payment-detail-page">
      <header className="page-header payments-page-header">
        <div>
          <button
            type="button"
            className="compact-btn student-payment-back"
            onClick={onBack}
          >
            ← Voltar aos pagamentos
          </button>
          <p className="page-eyebrow">Atleta</p>
          <h1 className="page-title">{student.name}</h1>
          <p className="page-description">{studentPlanLabel(student)}</p>
        </div>
        <span
          className={`student-billing-badge is-${billingTypeDraft}`}
        >
          {billingTypeLabel(billingTypeDraft)}
        </span>
      </header>

      <section className="student-payment-plan-card">
        <div className="admin-section-heading">
          <div>
            <span className="admin-section-kicker">Preçário</span>
            <h2>Plano do atleta</h2>
          </div>
        </div>

        <div className="student-payment-plan-grid">
          <StudentPlanFields
            value={planDraft}
            onChange={(patch) =>
              setPlanDraft((current) => ({ ...current, ...patch }))
            }
          />

          <div className="student-payment-plan-summary">
            <span>Treinos feitos</span>
            <strong>{totalTrainingsDone} no total</strong>
            <p className="muted">
              {billingTypeDraft === "pack"
                ? `Saldo do pack: ${packRemainingDraft || "0"}/${packSizeDraft || "0"}. Atualiza quando consumirem o pack.`
                : "As presenças do mês aparecem na tabela abaixo e em Treinos a mais."}
            </p>
          </div>
        </div>

        <div className="form-fields-actions">
          <button
            type="button"
            className="primary-btn"
            disabled={savingPlan}
            onClick={() => void savePlan()}
          >
            {savingPlan ? "A guardar..." : "Guardar plano"}
          </button>
          {billingTypeDraft === "pack" && (
            <button
              type="button"
              className="compact-btn"
              disabled={savingPackPayment}
              onClick={() => void registerPackPayment()}
            >
              {savingPackPayment
                ? "A registar..."
                : "Registar pagamento do pack"}
            </button>
          )}
        </div>
      </section>

      {billingTypeDraft === "pack" && (
        <section className="payments-matrix-card student-payment-months-card">
          <div className="admin-section-heading">
            <div>
              <span className="admin-section-kicker">Histórico</span>
              <h2>Pagamentos do pack</h2>
            </div>
          </div>
          {studentPayments.length === 0 ? (
            <p className="muted">Ainda não há pagamentos registados.</p>
          ) : (
            <div className="student-payment-pack-history">
              {studentPayments.map((payment) => (
                <article key={payment.id} className="student-history-row payment-history-row">
                  <div>
                    <strong>
                      {payment.month}/{payment.year}
                    </strong>
                    <p>{payment.notes || "Pagamento"}</p>
                  </div>
                  <div>
                    <strong>{payment.amount}€</strong>
                    <p>
                      {payment.status === "paid"
                        ? "Pago"
                        : payment.status === "cancelled"
                          ? "Cancelado"
                          : "Pendente"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="payments-matrix-card student-payment-months-card">
        <div className="payments-matrix-toolbar">
          <div className="payments-matrix-toolbar-main student-payment-months-toolbar">
            <label className="field-label">
              Ano
              <select
                value={selectedYear}
                onChange={(event) => onYearChange(Number(event.target.value))}
              >
                {yearOptions.map((yearOption) => (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted payments-matrix-hint">
            Valor a cobrar = plano do preçário
            {planAmount > 0 ? ` (${planAmount}€)` : ""}.
            {billingTypeDraft === "pack"
              ? " Pack: o preço do pack fica definido automaticamente."
              : " Mensalidade: valor completo do plano (+ extras), não proporcional às presenças."}
          </p>
        </div>

        <div className="student-payment-months-wrap">
          <table className="student-payment-months-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Treinos feitos</th>
                <th>{billingTypeDraft === "pack" ? "Pack" : "Previstos"}</th>
                <th>A cobrar</th>
                <th>Valor (€)</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {months.map((row) => {
                const draft = monthDrafts[row.month] || {
                  amount: String(row.suggested || ""),
                  status: "pending" as PaymentStatus,
                };
                const busy = savingMonth === row.month;

                return (
                  <tr
                    key={row.month}
                    className={row.isCurrent ? "is-current-month" : undefined}
                  >
                    <th scope="row">{row.label}</th>
                    <td>
                      <strong>{row.trainingsDone}</strong>
                    </td>
                    <td>
                      {billingTypeDraft === "pack"
                        ? packSizeDraft || "—"
                        : expectedTrainings || "—"}
                    </td>
                    <td>{row.suggested.toFixed(2)}€</td>
                    <td>
                      <input
                        className="student-payment-amount-input"
                        type="text"
                        inputMode="decimal"
                        value={draft.amount}
                        disabled={busy}
                        onChange={(event) =>
                          updateMonthDraft(row.month, {
                            amount: event.target.value,
                          })
                        }
                      />
                    </td>
                    <td>
                      <select
                        value={draft.status}
                        disabled={busy}
                        onChange={(event) =>
                          updateMonthDraft(row.month, {
                            status: event.target.value as PaymentStatus,
                          })
                        }
                      >
                        <option value="pending">Pendente</option>
                        <option value="paid">Pago</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </td>
                    <td>
                      <div className="student-payment-month-actions">
                        <button
                          type="button"
                          className="compact-btn"
                          disabled={busy}
                          title="Preencher com o valor do plano"
                          onClick={() =>
                            void saveMonth(row.month, {
                              useSuggested: true,
                            })
                          }
                        >
                          Usar plano
                        </button>
                        <button
                          type="button"
                          className="primary-btn compact-btn"
                          disabled={busy}
                          onClick={() => void saveMonth(row.month)}
                        >
                          {busy ? "..." : "Guardar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default StudentPaymentDetail;
