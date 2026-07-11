import { useEffect, useState } from "react";
import type { Student, User } from "../types";
import StudentPaymentHistory from "../components/StudentPaymentHistory";
import { loadStudentView } from "../utils/studentView";

type Props = {
  user: User;
};

function Payments({ user }: Props) {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id, user.studentId]);

  async function loadData() {
    const result = await loadStudentView(user);
    setStudent(result.student);
    setError(result.error);
    setLoading(result.loading);
  }

  if (loading) {
    return <p className="muted">A carregar...</p>;
  }

  if (!student) {
    return (
      <div className="card section-card">
        <h1 className="page-title">Pagamentos</h1>
        <p>{error || "Aluno não encontrado."}</p>
      </div>
    );
  }

  const pendingPayments = student.paid === false;

  return (
    <div>
      <h1 className="page-title">Pagamentos</h1>

      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-label">Estado da mensalidade</span>
          <strong className="stat-number small">
            {pendingPayments ? "Pendente" : "Em dia"}
          </strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Plano mensal</span>
          <strong className="stat-number">{student.monthlyLimit}</strong>
          <span className="muted">treinos / mês</span>
        </div>
      </div>

      <div className="card section-card">
        <StudentPaymentHistory student={student} />
      </div>
    </div>
  );
}

export default Payments;
