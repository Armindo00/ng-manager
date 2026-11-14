import type { Lesson, Student } from "../types";
import { getCurrentMonthYear } from "../utils/dateUtils";
import { billingTypeLabel } from "../utils/studentPaymentPlan";
import {
  getStudentTrainingUsage,
  usageStatusLabel,
} from "../utils/studentTrainingUsage";

type Props = {
  student: Student;
  lessons?: Lesson[];
};

function StudentProfileCard({ student, lessons = [] }: Props) {
  const isPack = student.billingType === "pack";
  const { month, year } = getCurrentMonthYear();
  const usage = getStudentTrainingUsage(student, lessons, month, year);
  const showQuota =
    usage.status === "over" ||
    usage.status === "pack_empty" ||
    usage.status === "at_limit";

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

        <div className="student-profile-badges">
          <span className={student.paid ? "status-paid" : "status-pending"}>
            {student.paid ? "Pago" : "Pendente"}
          </span>
          {showQuota && (
            <span className={`quota-status ${usage.status === "at_limit" ? "is-limit" : "is-over"}`}>
              {usageStatusLabel(usage.status)}
            </span>
          )}
        </div>
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
          <span>Este mês</span>
          <strong>{usage.label}</strong>
        </div>

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
