import type { Student } from "../types";
import { billingTypeLabel } from "../utils/studentPaymentPlan";

type Props = {
  student: Student;
};

function StudentProfileCard({ student }: Props) {
  const isPack = student.billingType === "pack";

  return (
    <div className="student-profile-card">
      <div className="student-profile-header">
        <div className="student-avatar" aria-hidden>
          {student.name.charAt(0).toUpperCase()}
        </div>

        <div className="student-profile-heading">
          <h2>{student.name}</h2>
          <p>{student.level || "Nível por definir"}</p>
        </div>

        <span className={student.paid ? "status-paid" : "status-pending"}>
          {student.paid ? "Pago" : "Pendente"}
        </span>
      </div>

      <div className="student-profile-grid">
        <div>
          <span>Telefone</span>
          <strong>{student.phone || "—"}</strong>
        </div>

        <div>
          <span>Email</span>
          <strong>{student.email || "—"}</strong>
        </div>

        <div>
          <span>Tipo de registo</span>
          <strong>{billingTypeLabel(student.billingType)}</strong>
        </div>

        {isPack ? (
          <>
            <div>
              <span>Pack</span>
              <strong>
                {student.packRemaining}/{student.packSize} treinos
              </strong>
            </div>

            <div>
              <span>Valor do pack</span>
              <strong>
                {student.packPrice > 0 ? `${student.packPrice}€` : "Por definir"}
              </strong>
            </div>
          </>
        ) : (
          <>
            <div>
              <span>Plano</span>
              <strong>{student.monthlyLimit} treinos/mês</strong>
            </div>

            <div>
              <span>Mensalidade</span>
              <strong>
                {student.monthlyFee > 0
                  ? `${student.monthlyFee}€`
                  : "Por definir"}
              </strong>
            </div>
          </>
        )}

        <div>
          <span>Pickup habitual</span>
          <strong>{student.pickup || "Não definido"}</strong>
        </div>

        <div>
          <span>Treinador principal</span>
          <strong>{student.mainCoach || "Não definido"}</strong>
        </div>

        <div>
          <span>Observações</span>
          <strong>{student.notes || "Sem observações"}</strong>
        </div>
      </div>
    </div>
  );
}

export default StudentProfileCard;
