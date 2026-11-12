import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import {
  addPayment,
  syncStudentPaidStatus,
  updatePayment,
  type Payment,
  type PaymentStatus,
} from "../services/paymentsService";
import { updateStudent } from "../services/studentsService";
import FormField from "./FormField";
import { getCurrentMonthYear, getTodayDate } from "../utils/dateUtils";
import {
  countStudentTrainingsInMonth,
  DEFAULT_MONTHLY_FEE,
  resolveStudentMonthlyFee,
  suggestAmountForTrainings,
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

function buildMonthDrafts(
  student: Student,
  payments: Payment[],
  lessons: Lesson[],
  selectedYear: number
) {
  const fee = resolveStudentMonthlyFee(student, payments);
  const paymentByMonth = new Map<number, Payment>();

  for (const payment of payments) {
    if (payment.studentId === student.id && payment.year === selectedYear) {
      paymentByMonth.set(payment.month, payment);
    }
  }

  const drafts: Record<number, MonthDraft> = {};

  for (let month = 1; month <= 12; month += 1) {
    const payment = paymentByMonth.get(month);
    const done = countStudentTrainingsInMonth(
      student.id,
      lessons,
      month,
      selectedYear
    );
    const suggested = suggestAmountForTrainings(
      fee,
      student.monthlyLimit,
      done
    );

    drafts[month] = {
      amount: payment
        ? String(payment.amount)
        : suggested > 0
          ? String(suggested)
          : String(fee || DEFAULT_MONTHLY_FEE),
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

  const [monthlyLimitDraft, setMonthlyLimitDraft] = useState(
    String(student.monthlyLimit || "")
  );
  const [monthlyFeeDraft, setMonthlyFeeDraft] = useState(String(resolvedFee));
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingMonth, setSavingMonth] = useState<number | null>(null);
  const [monthDrafts, setMonthDrafts] = useState<Record<number, MonthDraft>>(
    () => buildMonthDrafts(student, payments, lessons, selectedYear)
  );

  const expectedTrainings =
    Number(monthlyLimitDraft) || student.monthlyLimit || 0;

  const months = useMemo(() => {
    const fee = Number(monthlyFeeDraft) || resolvedFee;
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
      const suggested = suggestAmountForTrainings(
        fee,
        expectedTrainings,
        trainingsDone
      );
      return {
        month,
        label: MONTH_LABELS[index],
        payment,
        trainingsDone,
        suggested,
        isCurrent:
          month === currentPeriod.month && selectedYear === currentPeriod.year,
      };
    });
  }, [
    payments,
    lessons,
    student.id,
    selectedYear,
    monthlyFeeDraft,
    expectedTrainings,
    resolvedFee,
    currentPeriod.month,
    currentPeriod.year,
  ]);

  async function savePlan() {
    const limitNumber = Number(monthlyLimitDraft);
    const feeNumber = Number(monthlyFeeDraft);

    if (!Number.isFinite(limitNumber) || limitNumber < 0 || limitNumber > 31) {
      toast.error("Número de treinos por mês inválido.");
      return;
    }
    if (!Number.isFinite(feeNumber) || feeNumber < 0) {
      toast.error("Valor mensal inválido.");
      return;
    }

    const nextStudent: Student = {
      ...student,
      monthlyLimit: limitNumber,
      monthlyFee: feeNumber,
    };

    try {
      setSavingPlan(true);
      await updateStudent(nextStudent);
      onStudentUpdated(nextStudent);
      toast.success("Plano do atleta atualizado.");
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
          notes: null,
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
          <p className="page-description">
            Treinos previstos, valor da mensalidade e ajuste mês a mês.
          </p>
        </div>
      </header>

      <section className="student-payment-plan-card">
        <div className="admin-section-heading">
          <div>
            <span className="admin-section-kicker">Plano</span>
            <h2>Mensalidade do atleta</h2>
          </div>
        </div>

        <div className="student-payment-plan-grid">
          <FormField label="Treinos por mês (previstos)">
            <input
              type="text"
              inputMode="numeric"
              value={monthlyLimitDraft}
              onChange={(event) =>
                setMonthlyLimitDraft(event.target.value.replace(/[^\d]/g, ""))
              }
            />
          </FormField>

          <FormField label="Valor a pagar à escola (€)">
            <input
              type="text"
              inputMode="decimal"
              value={monthlyFeeDraft}
              onChange={(event) => setMonthlyFeeDraft(event.target.value)}
            />
          </FormField>

          <div className="student-payment-plan-summary">
            <span>Resumo</span>
            <strong>
              {monthlyLimitDraft || "0"} treinos · {monthlyFeeDraft || "0"}€
            </strong>
            <p className="muted">
              Se fizer menos treinos, podes ajustar o valor de cada mês abaixo.
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
        </div>
      </section>

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
            Treinos feitos = presenças nesse mês. O valor sugerido é proporcional
            ao plano (sem ultrapassar a mensalidade).
          </p>
        </div>

        <div className="student-payment-months-wrap">
          <table className="student-payment-months-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Treinos feitos</th>
                <th>Previstos</th>
                <th>Sugerido</th>
                <th>Valor (€)</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {months.map((row) => {
                const draft = monthDrafts[row.month] || {
                  amount: "",
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
                    <td>{expectedTrainings || "—"}</td>
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
                          title="Usar valor sugerido pelos treinos"
                          onClick={() =>
                            void saveMonth(row.month, { useSuggested: true })
                          }
                        >
                          Usar sugerido
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
