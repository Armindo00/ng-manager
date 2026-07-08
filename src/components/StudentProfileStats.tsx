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
    <div className="student-stats-grid">
      <div className="student-stat-card">
        <span>🏄 Treinos marcados</span>
        <strong>{studentLessons.length}</strong>
      </div>

      <div className="student-stat-card">
        <span>✅ Presenças</span>
        <strong>{attendedLessons.length}</strong>
      </div>

      <div className="student-stat-card">
        <span>📊 Taxa de presença</span>
        <strong>{attendanceRate}%</strong>
      </div>

      <div className="student-stat-card">
        <span>💳 Pagamento</span>
        <strong>{student.paid ? "Pago" : "Pendente"}</strong>
      </div>
    </div>
  );
}

export default StudentProfileStats;
