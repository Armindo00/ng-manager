import { useEffect, useState } from "react";
import type { Lesson, Student, User } from "../types";
import { getLessons } from "../services/lessonsService";
import { getStudents } from "../services/studentsService";

type Props = {
  user: User;
};

function StudentCalendar({ user }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const studentsData = await getStudents();
    const lessonsData = await getLessons();

    const foundStudent = studentsData.find((s) => s.id === user.studentId);

    if (foundStudent) {
      setStudent(foundStudent);

      setLessons(
        lessonsData
          .filter(
            (lesson) =>
              lesson.bookedStudentIds.includes(foundStudent.id) &&
              lesson.status !== "draft"
          )
          .sort((a, b) => a.date.localeCompare(b.date))
      );
    }

    setLoading(false);
  }

  if (loading) return <p className="muted">A carregar...</p>;
  if (!student) return <p>Aluno não encontrado.</p>;

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
