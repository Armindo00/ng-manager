import type { Lesson, Student } from "../types";

type Props = {
  student: Student;
  lessons: Lesson[];
};

function StudentLessonHistory({ student, lessons }: Props) {
  const studentLessons = lessons
    .filter((lesson) => lesson.bookedStudentIds.includes(student.id))
    .sort((a, b) => b.date.localeCompare(a.date));

  function getStatus(lesson: Lesson) {
    if (lesson.presentStudentIds.includes(student.id)) return "✅ Presente";

    const response = lesson.responses?.find(
      (item) => item.studentId === student.id
    );

    if (response?.status === "declined") return "❌ Não foi";
    if (response?.status === "confirmed") return "⏳ Confirmado";

    return "⏳ Por responder";
  }

  return (
    <div className="student-history">
      <h3>📅 Histórico de treinos</h3>

      {studentLessons.length === 0 && (
        <p className="muted">Ainda não existem treinos para este aluno.</p>
      )}

      {studentLessons.map((lesson) => (
        <div className="student-history-row" key={lesson.id}>
          <div>
            <strong>{lesson.date}</strong>
            <p>{lesson.time || "--:--"} · {lesson.beach || "Praia por definir"}</p>
          </div>

          <div>
            <span>{lesson.groupName || "Treino extra"}</span>
            <strong>{getStatus(lesson)}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StudentLessonHistory;
