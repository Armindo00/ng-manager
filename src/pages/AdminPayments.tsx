import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Student } from "../types";
import { getStudents } from "../services/studentsService";
import {
  getPayments,
  addPayment,
  updatePayment,
  deletePayment,
  syncStudentPaidStatus,
  type Payment,
  type PaymentStatus,
} from "../services/paymentsService";
import FormField from "../components/FormField";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import { getCurrentMonthYear, getTodayDate } from "../utils/dateUtils";

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const DEFAULT_AMOUNT = 80;

type CellTarget = {
  studentId: string;
  month: number;
  year: number;
  payment: Payment | null;
};

function AdminPayments() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const currentPeriod = getCurrentMonthYear();
  const [selectedYear, setSelectedYear] = useState(currentPeriod.year);
  const [defaultAmount, setDefaultAmount] = useState(String(DEFAULT_AMOUNT));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cellTarget, setCellTarget] = useState<CellTarget | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(String(currentPeriod.month));
  const [year, setYear] = useState(String(currentPeriod.year));
  const [amount, setAmount] = useState(String(DEFAULT_AMOUNT));
  const [status, setStatus] = useState<PaymentStatus>("paid");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [studentsData, paymentsData] = await Promise.all([
        getStudents(),
        getPayments(),
      ]);
      setStudents(studentsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar pagamentos.");
    } finally {
      setLoading(false);
    }
  }

  const paymentMap = useMemo(() => {
    const map = new Map<string, Payment>();
    for (const payment of payments) {
      map.set(`${payment.studentId}:${payment.year}-${payment.month}`, payment);
    }
    return map;
  }, [payments]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([currentPeriod.year, selectedYear]);
    for (const payment of payments) years.add(payment.year);
    for (let offset = -2; offset <= 1; offset += 1) {
      years.add(currentPeriod.year + offset);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [payments, currentPeriod.year, selectedYear]);

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...students]
      .filter((student) =>
        term ? student.name.toLowerCase().includes(term) : true
      )
      .sort((a, b) => a.name.localeCompare(b.name, "pt"));
  }, [students, search]);

  const yearPayments = useMemo(
    () => payments.filter((payment) => payment.year === selectedYear),
    [payments, selectedYear]
  );

  const stats = useMemo(() => {
    const pending = yearPayments.filter((payment) => payment.status === "pending");
    const paid = yearPayments.filter((payment) => payment.status === "paid");
    return {
      pending: pending.length,
      paid: paid.length,
      pendingAmount: pending.reduce((sum, payment) => sum + payment.amount, 0),
      paidAmount: paid.reduce((sum, payment) => sum + payment.amount, 0),
      missingCells: Math.max(
        0,
        visibleStudents.length * 12 -
          yearPayments.filter((payment) => payment.status !== "cancelled").length
      ),
    };
  }, [yearPayments, visibleStudents.length]);

  function getStudentName(id: string) {
    return students.find((student) => student.id === id)?.name || "Aluno";
  }

  function getPayment(studentIdValue: string, monthValue: number) {
    return (
      paymentMap.get(`${studentIdValue}:${selectedYear}-${monthValue}`) || null
    );
  }

  function suggestedAmount(studentIdValue: string) {
    const fromDefault = Number(defaultAmount);
    if (Number.isFinite(fromDefault) && fromDefault > 0) return fromDefault;

    const previous = payments
      .filter(
        (payment) =>
          payment.studentId === studentIdValue && payment.status === "paid"
      )
      .sort((a, b) => b.year - a.year || b.month - a.month)[0];

    return previous?.amount || DEFAULT_AMOUNT;
  }

  function resetCreateForm(overrides?: Partial<{
    studentId: string;
    month: string;
    year: string;
    amount: string;
    status: PaymentStatus;
  }>) {
    setStudentId(overrides?.studentId || "");
    setMonth(overrides?.month || String(currentPeriod.month));
    setYear(overrides?.year || String(selectedYear));
    setAmount(overrides?.amount || defaultAmount || String(DEFAULT_AMOUNT));
    setStatus(overrides?.status || "paid");
    setPaymentMethod("");
    setNotes("");
  }

  function openCreateModal() {
    resetCreateForm({ year: String(selectedYear) });
    setShowCreateModal(true);
  }

  async function createPayment() {
    if (!studentId || !month || !year || !amount) {
      toast.error("Preenche aluno, mês, ano e valor.");
      return;
    }

    const monthNumber = Number(month);
    const yearNumber = Number(year);
    const amountNumber = Number(amount);

    if (
      !Number.isFinite(monthNumber) ||
      monthNumber < 1 ||
      monthNumber > 12 ||
      !Number.isFinite(yearNumber) ||
      !Number.isFinite(amountNumber) ||
      amountNumber < 0
    ) {
      toast.error("Mês, ano ou valor inválidos.");
      return;
    }

    const existing = paymentMap.get(
      `${studentId}:${yearNumber}-${monthNumber}`
    );
    if (existing) {
      toast.error("Já existe pagamento para este aluno neste mês.");
      return;
    }

    try {
      setSaving(true);
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        studentId,
        month: monthNumber,
        year: yearNumber,
        amount: amountNumber,
        status,
        paymentDate: status === "paid" ? getTodayDate() : null,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
      };

      await addPayment(newPayment);
      await syncStudentPaidStatus(studentId);
      await loadData();
      setShowCreateModal(false);
      setSelectedYear(yearNumber);
      toast.success("Pagamento registado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function quickMarkPaid(student: Student, monthValue: number) {
    const existing = getPayment(student.id, monthValue);
    if (existing?.status === "paid") {
      setCellTarget({
        studentId: student.id,
        month: monthValue,
        year: selectedYear,
        payment: existing,
      });
      return;
    }

    try {
      setSaving(true);
      if (existing) {
        await updatePayment({
          ...existing,
          status: "paid",
          paymentDate: getTodayDate(),
        });
      } else {
        await addPayment({
          id: crypto.randomUUID(),
          studentId: student.id,
          month: monthValue,
          year: selectedYear,
          amount: suggestedAmount(student.id),
          status: "paid",
          paymentDate: getTodayDate(),
          paymentMethod: null,
          notes: null,
        });
      }
      await syncStudentPaidStatus(student.id);
      await loadData();
      toast.success(`${student.name} · ${MONTH_LABELS[monthValue - 1]} pago`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao marcar pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function markAsPaid(payment: Payment) {
    try {
      setSaving(true);
      await updatePayment({
        ...payment,
        status: "paid",
        paymentDate: getTodayDate(),
      });
      await syncStudentPaidStatus(payment.studentId);
      await loadData();
      setCellTarget(null);
      toast.success("Pagamento marcado como pago.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function markAsPending(payment: Payment) {
    try {
      setSaving(true);
      await updatePayment({
        ...payment,
        status: "pending",
        paymentDate: null,
      });
      await syncStudentPaidStatus(payment.studentId);
      await loadData();
      setCellTarget(null);
      toast.success("Pagamento marcado como pendente.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeletePayment() {
    if (!paymentToDelete) return;

    try {
      setSaving(true);
      await deletePayment(paymentToDelete.id);
      await syncStudentPaidStatus(paymentToDelete.studentId);
      await loadData();
      setPaymentToDelete(null);
      setCellTarget(null);
      toast.success("Pagamento eliminado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar pagamento.");
    } finally {
      setSaving(false);
    }
  }

  function cellClass(payment: Payment | null, monthValue: number) {
    const classes = ["payments-matrix-cell"];
    if (monthValue === currentPeriod.month && selectedYear === currentPeriod.year) {
      classes.push("is-current-month");
    }
    if (!payment) {
      classes.push("is-empty");
      return classes.join(" ");
    }
    classes.push(`is-${payment.status}`);
    return classes.join(" ");
  }

  function cellLabel(payment: Payment | null) {
    if (!payment) return "—";
    if (payment.status === "paid") return "Pago";
    if (payment.status === "cancelled") return "Canc.";
    return "Pend.";
  }

  return (
    <div className="dashboard-page payments-page">
      <header className="page-header payments-page-header">
        <div>
          <p className="page-eyebrow">Gestão</p>
          <h1 className="page-title">Pagamentos</h1>
          <p className="page-description">
            Folha mensal por aluno — estado de cada mês num só olhar.
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={openCreateModal}>
          Registar pagamento
        </button>
      </header>

      <div className="payments-stats-strip">
        <div>
          <span>Pagos {selectedYear}</span>
          <strong>{stats.paid}</strong>
        </div>
        <div>
          <span>Pendentes</span>
          <strong>{stats.pending}</strong>
        </div>
        <div>
          <span>Recebido</span>
          <strong>{stats.paidAmount.toFixed(0)}€</strong>
        </div>
        <div>
          <span>Em falta</span>
          <strong>{stats.pendingAmount.toFixed(0)}€</strong>
        </div>
      </div>

      <section className="payments-matrix-card">
        <div className="payments-matrix-toolbar">
          <div className="payments-matrix-toolbar-main">
            <label className="field-label">
              Ano
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {yearOptions.map((yearOption) => (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              Pesquisar aluno
              <input
                className="search-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome do aluno..."
              />
            </label>

            <label className="field-label">
              Valor rápido (€)
              <input
                type="text"
                inputMode="decimal"
                value={defaultAmount}
                onChange={(event) => setDefaultAmount(event.target.value)}
                placeholder="80"
              />
            </label>
          </div>

          <p className="muted payments-matrix-hint">
            Clica numa célula vazia ou pendente para marcar como pago. Clica num
            pago para ver detalhes.
          </p>
        </div>

        {loading ? (
          <p className="muted">A carregar folha de pagamentos...</p>
        ) : visibleStudents.length === 0 ? (
          <p className="muted">Sem alunos para mostrar.</p>
        ) : (
          <div className="payments-matrix-wrap">
            <table className="payments-matrix-table">
              <thead>
                <tr>
                  <th className="payments-matrix-student-col">Aluno</th>
                  {MONTH_LABELS.map((label, index) => (
                    <th
                      key={label}
                      className={
                        index + 1 === currentPeriod.month &&
                        selectedYear === currentPeriod.year
                          ? "is-current-month"
                          : undefined
                      }
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => (
                  <tr key={student.id}>
                    <th scope="row" className="payments-matrix-student-col">
                      <span>{student.name}</span>
                    </th>
                    {MONTH_LABELS.map((_, index) => {
                      const monthValue = index + 1;
                      const payment = getPayment(student.id, monthValue);
                      return (
                        <td key={`${student.id}-${monthValue}`}>
                          <button
                            type="button"
                            className={cellClass(payment, monthValue)}
                            disabled={saving}
                            title={
                              payment
                                ? `${cellLabel(payment)} · ${payment.amount}€`
                                : "Sem registo — clicar para marcar pago"
                            }
                            onClick={() => {
                              if (payment?.status === "paid") {
                                setCellTarget({
                                  studentId: student.id,
                                  month: monthValue,
                                  year: selectedYear,
                                  payment,
                                });
                                return;
                              }
                              void quickMarkPaid(student, monthValue);
                            }}
                          >
                            {cellLabel(payment)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="payments-matrix-legend">
          <span className="payments-legend-item is-paid">Pago</span>
          <span className="payments-legend-item is-pending">Pendente</span>
          <span className="payments-legend-item is-empty">Sem registo</span>
          <span className="payments-legend-item is-cancelled">Cancelado</span>
        </div>
      </section>

      {showCreateModal && (
        <Modal title="Registar pagamento" onClose={() => setShowCreateModal(false)}>
          <div className="form-fields-grid">
            <FormField label="Aluno">
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              >
                <option value="">Selecionar aluno</option>
                {students
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, "pt"))
                  .map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
              </select>
            </FormField>

            <FormField label="Mês">
              <select value={month} onChange={(event) => setMonth(event.target.value)}>
                {MONTH_LABELS.map((label, index) => (
                  <option key={label} value={String(index + 1)}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Ano">
              <input
                type="text"
                inputMode="numeric"
                value={year}
                onChange={(event) =>
                  setYear(event.target.value.replace(/[^\d]/g, ""))
                }
              />
            </FormField>

            <FormField label="Valor (€)">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </FormField>

            <FormField label="Estado">
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as PaymentStatus)
                }
              >
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </FormField>

            <FormField label="Método">
              <input
                placeholder="MB Way, transferência..."
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              />
            </FormField>

            <FormField label="Notas">
              <input
                placeholder="Opcional"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </FormField>
          </div>

          <div className="form-fields-actions">
            <button
              type="button"
              className="compact-btn"
              onClick={() => setShowCreateModal(false)}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={createPayment}
              disabled={saving}
            >
              {saving ? "A guardar..." : "Guardar pagamento"}
            </button>
          </div>
        </Modal>
      )}

      {cellTarget?.payment && (
        <Modal
          title={`${getStudentName(cellTarget.studentId)} · ${
            MONTH_LABELS[cellTarget.month - 1]
          } ${cellTarget.year}`}
          onClose={() => setCellTarget(null)}
        >
          <div className="payments-cell-detail">
            <p>
              <strong>Estado:</strong>{" "}
              {cellTarget.payment.status === "paid"
                ? "Pago"
                : cellTarget.payment.status === "cancelled"
                  ? "Cancelado"
                  : "Pendente"}
            </p>
            <p>
              <strong>Valor:</strong> {cellTarget.payment.amount}€
            </p>
            <p>
              <strong>Método:</strong>{" "}
              {cellTarget.payment.paymentMethod || "—"}
            </p>
            <p>
              <strong>Data:</strong> {cellTarget.payment.paymentDate || "—"}
            </p>
            <p>
              <strong>Notas:</strong> {cellTarget.payment.notes || "—"}
            </p>

            <div className="form-fields-actions">
              {cellTarget.payment.status !== "paid" && (
                <button
                  type="button"
                  className="primary-btn"
                  disabled={saving}
                  onClick={() => markAsPaid(cellTarget.payment!)}
                >
                  Marcar pago
                </button>
              )}
              {cellTarget.payment.status === "paid" && (
                <button
                  type="button"
                  className="compact-btn"
                  disabled={saving}
                  onClick={() => markAsPending(cellTarget.payment!)}
                >
                  Marcar pendente
                </button>
              )}
              <button
                type="button"
                className="danger-btn compact-btn"
                disabled={saving}
                onClick={() => setPaymentToDelete(cellTarget.payment)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {paymentToDelete && (
        <ConfirmDialog
          title="Eliminar pagamento"
          message={`Eliminar o pagamento de ${getStudentName(
            paymentToDelete.studentId
          )}?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDeletePayment}
          onCancel={() => setPaymentToDelete(null)}
        />
      )}
    </div>
  );
}

export default AdminPayments;
