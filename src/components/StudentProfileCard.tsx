import type { Student } from "../types";

type Props = {
  student: Student;
};

function StudentProfileCard({ student }: Props) {
  return (
    <div className="student-profile-card">
      <div className="student-profile-header">
        <div className="student-avatar">
          {student.name.charAt(0).toUpperCase()}
        </div>

        <div>
          <h2>{student.name}</h2>
          <p>{student.level}</p>
        </div>

        <span className={student.paid ? "status-paid" : "status-pending"}>
          {student.paid ? "Pago" : "Pendente"}
        </span>
      </div>

      <div className="student-profile-grid">
        <div>
          <span>📞 Telefone</span>
          <strong>{student.phone}</strong>
        </div>

        <div>
          <span>📧 Email</span>
          <strong>{student.email}</strong>
        </div>

        <div>
          <span>🏄 Plano</span>
          <strong>{student.monthlyLimit} treinos/mês</strong>
        </div>

        <div>
          <span>🚐 Pickup habitual</span>
          <strong>{student.pickup || "Não definido"}</strong>
        </div>

        <div>
          <span>👨‍🏫 Treinador principal</span>
          <strong>{student.mainCoach || "Não definido"}</strong>
        </div>

        <div>
          <span>📝 Observações</span>
          <strong>{student.notes || "Sem observações"}</strong>
        </div>
      </div>
    </div>
  );
}

export default StudentProfileCard;