import type { Lesson, Student } from "../types";

type Props = {
  student: Student;
  lessons: Lesson[];
};

function StudentProfileStats({ student, lessons }: Props) {
  const studentLessons = lessons.filter((lesson) =>
    lesson.bookedStudentIds.includes(student.id)
  );

  const attendedLessons = studentLessons.filter((lesson) =>
    lesson.presentStudentIds.includes(student.id)
  );

  const attendanceRate =
    studentLessons.length === 0
      ? 0
      : Math.round((attendedLessons.length / studentLessons.length) * 100);

  return (
    <div className="stats-grid student-stats-grid">
      <div className="card stat-card">
        <span className="stat-label">Treinos marcados</span>
        <strong className="stat-number">{studentLessons.length}</strong>
      </div>

      <div className="card stat-card">
        <span className="stat-label">Presenças</span>
        <strong className="stat-number">{attendedLessons.length}</strong>
      </div>

      <div className="card stat-card">
        <span className="stat-label">Taxa de presença</span>
        <strong className="stat-number">{attendanceRate}%</strong>
      </div>

      <div className="card stat-card">
        <span className="stat-label">Pagamento</span>
        <strong className="stat-number small">
          {student.paid ? "Pago" : "Pendente"}
        </strong>
      </div>
    </div>
  );
}

export default StudentProfileStats;
