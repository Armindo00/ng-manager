import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student, StudentBillingType } from "../types";
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
  billingTypeLabel,
  countStudentTrainingsInMonth,
  countStudentTrainingsTotal,
  DEFAULT_MONTHLY_FEE,
  isPackStudent,
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
    const suggested = isPackStudent(student)
      ? fee
      : suggestAmountForTrainings(fee, student.monthlyLimit, done);

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

  const [billingTypeDraft, setBillingTypeDraft] = useState<StudentBillingType>(
    student.billingType || "monthly"
  );
  const [monthlyLimitDraft, setMonthlyLimitDraft] = useState(
    String(student.monthlyLimit || "")
  );
  const [monthlyFeeDraft, setMonthlyFeeDraft] = useState(
    String(student.monthlyFee || resolvedFee || "")
  );
  const [packSizeDraft, setPackSizeDraft] = useState(
    String(student.packSize || "")
  );
  const [packPriceDraft, setPackPriceDraft] = useState(
    String(student.packPrice || "")
  );
  const [packRemainingDraft, setPackRemainingDraft] = useState(
    String(student.packRemaining || student.packSize || "")
  );
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingMonth, setSavingMonth] = useState<number | null>(null);
  const [savingPackPayment, setSavingPackPayment] = useState(false);
  const [monthDrafts, setMonthDrafts] = useState<Record<number, MonthDraft>>(
    () => buildMonthDrafts(student, payments, lessons, selectedYear)
  );

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
      const suggested =
        billingTypeDraft === "pack"
          ? Number(packPriceDraft) || fee
          : suggestAmountForTrainings(fee, expectedTrainings, trainingsDone);
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
    packPriceDraft,
    billingTypeDraft,
    expectedTrainings,
    resolvedFee,
    currentPeriod.month,
    currentPeriod.year,
  ]);

  async function savePlan() {
    const limitNumber = Number(monthlyLimitDraft || 0);
    const feeNumber = Number(monthlyFeeDraft || 0);
    const packSizeNumber = Number(packSizeDraft || 0);
    const packPriceNumber = Number(packPriceDraft || 0);
    const packRemainingNumber = Number(
      packRemainingDraft === "" ? packSizeNumber : packRemainingDraft
    );

    if (billingTypeDraft === "monthly") {
      if (!Number.isFinite(limitNumber) || limitNumber < 0 || limitNumber > 31) {
        toast.error("Número de treinos por mês inválido.");
        return;
      }
      if (!Number.isFinite(feeNumber) || feeNumber < 0) {
        toast.error("Valor mensal inválido.");
        return;
      }
    } else {
      if (!Number.isFinite(packSizeNumber) || packSizeNumber <= 0) {
        toast.error("Número de treinos do pack inválido.");
        return;
      }
      if (!Number.isFinite(packPriceNumber) || packPriceNumber < 0) {
        toast.error("Valor do pack inválido.");
        return;
      }
      if (
        !Number.isFinite(packRemainingNumber) ||
        packRemainingNumber < 0 ||
        packRemainingNumber > packSizeNumber
      ) {
        toast.error("Treinos por usar inválidos.");
        return;
      }
    }

    const nextStudent: Student = {
      ...student,
      billingType: billingTypeDraft,
      monthlyLimit: billingTypeDraft === "monthly" ? limitNumber : 0,
      monthlyFee: billingTypeDraft === "monthly" ? feeNumber : 0,
      packSize: billingTypeDraft === "pack" ? packSizeNumber : 0,
      packPrice: billingTypeDraft === "pack" ? packPriceNumber : 0,
      packRemaining: billingTypeDraft === "pack" ? packRemainingNumber : 0,
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
          <p className="page-description">
            {billingTypeDraft === "pack"
              ? "Pack de treinos — valor, saldo e presenças."
              : "Treinos previstos, valor da mensalidade e ajuste mês a mês."}
          </p>
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
            <span className="admin-section-kicker">Plano</span>
            <h2>
              {billingTypeDraft === "pack"
                ? "Pack do atleta"
                : "Mensalidade do atleta"}
            </h2>
          </div>
        </div>

        <div className="student-payment-plan-grid">
          <FormField label="Tipo de registo">
            <select
              value={billingTypeDraft}
              onChange={(event) =>
                setBillingTypeDraft(event.target.value as StudentBillingType)
              }
            >
              <option value="monthly">Mensalidade</option>
              <option value="pack">Pack de treinos</option>
            </select>
          </FormField>

          {billingTypeDraft === "monthly" ? (
            <>
              <FormField label="Treinos por mês (previstos)">
                <input
                  type="text"
                  inputMode="numeric"
                  value={monthlyLimitDraft}
                  onChange={(event) =>
                    setMonthlyLimitDraft(
                      event.target.value.replace(/[^\d]/g, "")
                    )
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
            </>
          ) : (
            <>
              <FormField label="Treinos do pack">
                <input
                  type="text"
                  inputMode="numeric"
                  value={packSizeDraft}
                  onChange={(event) =>
                    setPackSizeDraft(event.target.value.replace(/[^\d]/g, ""))
                  }
                />
              </FormField>

              <FormField label="Valor do pack (€)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={packPriceDraft}
                  onChange={(event) => setPackPriceDraft(event.target.value)}
                />
              </FormField>

              <FormField label="Treinos por usar">
                <input
                  type="text"
                  inputMode="numeric"
                  value={packRemainingDraft}
                  onChange={(event) =>
                    setPackRemainingDraft(
                      event.target.value.replace(/[^\d]/g, "")
                    )
                  }
                />
              </FormField>
            </>
          )}

          <div className="student-payment-plan-summary">
            <span>Resumo</span>
            <strong>
              {billingTypeDraft === "pack"
                ? `${packRemainingDraft || "0"}/${packSizeDraft || "0"} treinos · ${packPriceDraft || "0"}€`
                : `${monthlyLimitDraft || "0"} treinos · ${monthlyFeeDraft || "0"}€`}
            </strong>
            <p className="muted">
              {billingTypeDraft === "pack"
                ? `Presenças registadas: ${totalTrainingsDone}. Atualiza os treinos por usar quando consumirem o pack.`
                : "Se fizer menos treinos, podes ajustar o valor de cada mês abaixo."}
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
            {billingTypeDraft === "pack"
              ? "Presenças por mês. O pack não usa mensalidade — regista o pagamento do pack acima."
              : "Treinos feitos = presenças nesse mês. O valor sugerido é proporcional ao plano."}
          </p>
        </div>

        <div className="student-payment-months-wrap">
          <table className="student-payment-months-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Treinos feitos</th>
                {billingTypeDraft === "monthly" ? (
                  <>
                    <th>Previstos</th>
                    <th>Sugerido</th>
                    <th>Valor (€)</th>
                    <th>Estado</th>
                    <th>Ações</th>
                  </>
                ) : null}
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
                    {billingTypeDraft === "monthly" ? (
                      <>
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
                                void saveMonth(row.month, {
                                  useSuggested: true,
                                })
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
                      </>
                    ) : null}
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
