import { useEffect, useState } from "react";
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
import { getCurrentMonthYear, getTodayDate } from "../utils/dateUtils";
import ActionButtons from "../components/ActionButtons";

function AdminPayments() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const [studentId, setStudentId] = useState("");
  const initialPeriod = getCurrentMonthYear();
  const [month, setMonth] = useState(String(initialPeriod.month));
  const [year, setYear] = useState(String(initialPeriod.year));
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setStudents(await getStudents());
      setPayments(await getPayments());
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar pagamentos.");
    }
  }

  async function createPayment() {
    if (!studentId || !month || !year || !amount) {
      toast.error("Preenche aluno, mês, ano e valor.");
      return;
    }

    try {
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        studentId,
        month: Number(month),
        year: Number(year),
        amount: Number(amount),
        status,
        paymentDate: status === "paid" ? getTodayDate() : null,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
      };

      await addPayment(newPayment);
      await syncStudentPaidStatus(studentId);
      await loadData();

      toast.success("Pagamento criado com sucesso!");

      setStudentId("");
      const period = getCurrentMonthYear();
      setMonth(String(period.month));
      setYear(String(period.year));
      setAmount("");
      setStatus("pending");
      setPaymentMethod("");
      setNotes("");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar pagamento.");
    }
  }

  async function markAsPaid(payment: Payment) {
    try {
      await updatePayment({
        ...payment,
        status: "paid",
        paymentDate: getTodayDate(),
      });

      await syncStudentPaidStatus(payment.studentId);
      await loadData();
      toast.success("Pagamento marcado como pago!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar pagamento.");
    }
  }

  async function confirmDeletePayment() {
    if (!paymentToDelete) return;

    try {
      await deletePayment(paymentToDelete.id);
      await syncStudentPaidStatus(paymentToDelete.studentId);
      await loadData();
      setPaymentToDelete(null);
      toast.success("Pagamento apagado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar pagamento.");
    }
  }

  function getStudentName(id: string) {
    return students.find((student) => student.id === id)?.name || "Aluno";
  }

  function statusText(status: PaymentStatus) {
    if (status === "paid") return "Pago";
    if (status === "cancelled") return "Cancelado";
    return "Pendente";
  }

  return (
    <div>
      <h1 className="page-title">Pagamentos</h1>

      <div className="card section-card">
        <h2>Novo pagamento</h2>

        <div className="form-fields-grid">
          <FormField label="Aluno">
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Selecionar aluno</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Mês">
            <input
              type="number"
              min={1}
              max={12}
              placeholder="1–12"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </FormField>

          <FormField label="Ano">
            <input
              type="number"
              min={2020}
              max={2100}
              placeholder="Ex: 2026"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </FormField>

          <FormField label="Valor (€)">
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Ex: 80"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FormField>

          <FormField label="Estado">
            <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </FormField>

          <FormField label="Método de pagamento">
            <input
              placeholder="Ex: MB Way, transferência"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
          </FormField>

          <FormField label="Notas (opcional)">
            <input
              placeholder="Detalhes extra"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>
        </div>
        <div className="form-fields-actions">
          <button className="primary-btn" onClick={createPayment}>
            Criar pagamento
          </button>
        </div>
      </div>

      <div className="card section-card">
        <h2>Histórico de pagamentos</h2>

        <table className="data-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Mês/Ano</th>
              <th>Valor</th>
              <th>Estado</th>
              <th>Método</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="data-table-primary" data-label="Aluno">
                  {getStudentName(payment.studentId)}
                </td>
                <td data-label="Mês/Ano">
                  {payment.month}/{payment.year}
                </td>
                <td data-label="Valor">{payment.amount}€</td>
                <td data-label="Estado">
                  <span className={`payment-status payment-status-${payment.status}`}>
                    {statusText(payment.status)}
                  </span>
                </td>
                <td data-label="Método">{payment.paymentMethod || "-"}</td>
                <td data-label="Data">{payment.paymentDate || "-"}</td>
                <td data-label="Ações">
                  <div className="payment-actions">
                    {payment.status !== "paid" && (
                      <button
                        className="primary-btn compact-btn"
                        onClick={() => markAsPaid(payment)}
                      >
                        Marcar pago
                      </button>
                    )}

                    <ActionButtons
                      onDelete={() => setPaymentToDelete(payment)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {payments.length === 0 && (
          <p className="muted">Ainda não existem pagamentos registados.</p>
        )}
      </div>

      {paymentToDelete && (
        <ConfirmDialog
          title="⚠️ Eliminar pagamento"
          message={
            "Tens a certeza que pretendes eliminar o pagamento de " +
            getStudentName(paymentToDelete.studentId) +
            "? Esta ação não pode ser desfeita."
          }
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
