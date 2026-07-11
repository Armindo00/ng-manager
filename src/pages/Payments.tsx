import { useEffect, useState } from "react";
import type { Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import StudentPaymentHistory from "../components/StudentPaymentHistory";

type Props = {
  user: User;
};

function Payments({ user }: Props) {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const studentsData = await getStudents();
    const foundStudent = studentsData.find(
      (item) => item.id === user.studentId
    );

    setStudent(foundStudent || null);
    setLoading(false);
  }

  if (loading) {
    return <p className="muted">A carregar...</p>;
  }

  if (!student) {
    return <p>Aluno não encontrado.</p>;
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
