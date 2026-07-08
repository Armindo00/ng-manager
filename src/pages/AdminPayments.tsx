import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Student } from "../types";
import { getStudents } from "../services/studentsService";
import {
  getPayments,
  addPayment,
  updatePayment,
  deletePayment,
  type Payment,
  type PaymentStatus,
} from "../services/paymentsService";
import ConfirmDialog from "../components/ConfirmDialog";
import ActionButtons from "../components/ActionButtons";

function AdminPayments() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
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
        paymentDate:
          status === "paid" ? new Date().toISOString().split("T")[0] : null,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
      };

      await addPayment(newPayment);
      await loadData();

      toast.success("Pagamento criado com sucesso!");

      setStudentId("");
      setMonth(String(new Date().getMonth() + 1));
      setYear(String(new Date().getFullYear()));
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
        paymentDate: new Date().toISOString().split("T")[0],
      });

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

        <div className="form-row">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Selecionar aluno</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>

          <input type="number" placeholder="Mês" value={month} onChange={(e) => setMonth(e.target.value)} />
          <input type="number" placeholder="Ano" value={year} onChange={(e) => setYear(e.target.value)} />
          <input type="number" placeholder="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} />

          <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="cancelled">Cancelado</option>
          </select>

          <input placeholder="Método" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
          <input placeholder="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />

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
                <td>{getStudentName(payment.studentId)}</td>
                <td>{payment.month}/{payment.year}</td>
                <td>{payment.amount}€</td>
                <td>{statusText(payment.status)}</td>
                <td>{payment.paymentMethod || "-"}</td>
                <td>{payment.paymentDate || "-"}</td>
                <td>
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
