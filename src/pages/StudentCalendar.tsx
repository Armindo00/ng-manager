import { useEffect, useState } from "react";
import type { Lesson, Student, User } from "../types";
import { getLessons } from "../services/lessonsService";
import { loadStudentView } from "../utils/studentView";

type Props = {
  user: User;
};

function StudentCalendar({ user }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id, user.studentId]);

  async function loadData() {
    setLoading(true);

    const studentResult = await loadStudentView(user);
    const lessonsData = await getLessons();

    if (!studentResult.student) {
      setStudent(null);
      setLessons([]);
      setError(studentResult.error);
      setLoading(false);
      return;
    }

    const foundStudent = studentResult.student;
    setStudent(foundStudent);
    setError(null);

    setLessons(
      lessonsData
        .filter(
          (lesson) =>
            lesson.bookedStudentIds.includes(foundStudent.id) &&
            lesson.status !== "draft"
        )
        .sort((a, b) => a.date.localeCompare(b.date))
    );

    setLoading(false);
  }

  if (loading) return <p className="muted">A carregar...</p>;
  if (!student) return <p>{error || "Aluno não encontrado."}</p>;

  return (
    <div>
      <h1 className="page-title">Calendário</h1>

      {lessons.length === 0 && (
        <p className="muted">Ainda não tens treinos no calendário.</p>
      )}

      <div className="lesson-list">
        {lessons.map((lesson) => (
          <div className="lesson-card" key={lesson.id}>
            <div>
              <h3>{lesson.date}</h3>
              <p>Hora: {lesson.time}</p>
              <p>Praia: {lesson.beach}</p>
              <p>Grupo: {lesson.groupName || "Treino"}</p>
              <p>Estado: {lesson.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentCalendar;
