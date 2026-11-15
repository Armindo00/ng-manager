import type { Lesson, Student } from "../types";
import { getCurrentMonthYear } from "../utils/dateUtils";
import {
  countStudentTrainingsInMonth,
  countStudentTrainingsTotal,
} from "../utils/studentPaymentPlan";
import { getStudentTrainingUsage } from "../utils/studentTrainingUsage";

type Props = {
  student: Student;
  lessons: Lesson[];
};

function StudentProfileStats({ student, lessons }: Props) {
  const { month, year } = getCurrentMonthYear();
  const usage = getStudentTrainingUsage(student, lessons, month, year);
  const thisMonth = countStudentTrainingsInMonth(
    student.id,
    lessons,
    month,
    year
  );
  const totalPresent = countStudentTrainingsTotal(student.id, lessons);

  const studentLessons = lessons.filter((lesson) =>
    lesson.bookedStudentIds.includes(student.id)
  );
  const attendanceRate =
    studentLessons.length === 0
      ? 0
      : Math.round((totalPresent / studentLessons.length) * 100);

  return (
    <div className="stats-grid student-stats-grid">
      <div className="card stat-card">
        <span className="stat-label">Este mês</span>
        <strong className="stat-number">{thisMonth}</strong>
        <span className="stat-sub">{usage.label}</span>
      </div>

      <div className="card stat-card">
        <span className="stat-label">Presenças totais</span>
        <strong className="stat-number">{totalPresent}</strong>
      </div>

      <div className="card stat-card">
        <span className="stat-label">Taxa de presença</span>
        <strong className="stat-number">{attendanceRate}%</strong>
      </div>

      <div className="card stat-card">
        <span className="stat-label">
          {student.billingType === "pack" ? "Pack" : "Pagamento"}
        </span>
        <strong className="stat-number small">
          {student.billingType === "pack"
            ? `${student.packRemaining}/${student.packSize}`
            : student.paid
              ? "Pago"
              : "Pendente"}
        </strong>
      </div>
    </div>
  );
}

export default StudentProfileStats;
