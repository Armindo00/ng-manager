import { useEffect, useState } from "react";
import type { Student } from "../types";
import { getPayments, type Payment } from "../services/paymentsService";

type Props = {
  student: Student;
};

function StudentPaymentHistory({ student }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    loadPayments();
  }, [student.id]);

  async function loadPayments() {
    const data = await getPayments();
    setPayments(
      data
        .filter((payment) => payment.studentId === student.id)
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        })
    );
  }

  function statusText(status: string) {
    if (status === "paid") return "Pago";
    if (status === "cancelled") return "Cancelado";
    return "Pendente";
  }

  return (
    <div className="student-payment-history">
      <h3>💳 Histórico de pagamentos</h3>

      {payments.length === 0 && (
        <p className="muted">Ainda não existem pagamentos para este aluno.</p>
      )}

      {payments.map((payment) => (
        <div className="payment-history-row" key={payment.id}>
          <div>
            <strong>
              {payment.month}/{payment.year}
            </strong>
            <p>{payment.paymentMethod || "Método não definido"}</p>
          </div>

          <div>
            <strong>{payment.amount}€</strong>
            <p>
              <span className={`payment-status payment-status-${payment.status}`}>
                {statusText(payment.status)}
              </span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StudentPaymentHistory;
