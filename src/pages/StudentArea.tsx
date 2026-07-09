import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, MaterialRequest, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons, updateLesson } from "../services/lessonsService";

type Props = {
  user: User;
};

const emptyMaterial: MaterialRequest = {
  softboard: false,
  fiberBoard: false,
  wetsuit: false,
  lycra: false,
  leash: false,
  vest: false,
  other: "",
};

function StudentArea({ user }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const studentsData = await getStudents();
      const lessonsData = await getLessons();

      setStudents(studentsData);
      setLessons(lessonsData.filter((lesson) => lesson.status === "published"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinos.");
    } finally {
      setLoading(false);
    }
  }

  const student = students.find((s) => s.id === user.studentId);

  if (loading) {
    return <p className="muted">A carregar...</p>;
  }

  if (!student) {
    return <p>Aluno não encontrado.</p>;
  }

  const studentId = student.id;

  const myLessons = lessons.filter((lesson) =>
    lesson.bookedStudentIds.includes(studentId)
  );

  const attended = lessons.filter((lesson) =>
    lesson.presentStudentIds.includes(studentId)
  );

  async function respondToLesson(
    lesson: Lesson,
    status: "confirmed" | "declined"
  ) {
    const responses = lesson.responses || [];

    const filteredResponses = responses.filter(
      (response) => response.studentId !== studentId
    );

    const updatedLesson: Lesson = {
      ...lesson,
      responses: [
        ...filteredResponses,
        {
          studentId,
          status,
          transportType: "pickup",
          pickupLocation: "",
          availableFrom: "",
          material: emptyMaterial,
          notes: "",
        },
      ],
    };

    try {
      await updateLesson(updatedLesson);
      await loadData();

      toast.success(status === "confirmed" ? "Confirmaste presença." : "Marcaste que não vais.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar resposta.");
    }
  }

  return (
    <div>
      <h1 className="page-title">Área do Aluno</h1>

      <div className="stats-grid">
        <div className="card">
          <span className="stat-label">Nome</span>
          <strong className="stat-number small">{student.name}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Treinos permitidos</span>
          <strong className="stat-number">{student.monthlyLimit}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Treinos realizados</span>
          <strong className="stat-number">{attended.length}</strong>
        </div>
      </div>

      <div className="card section-card">
        <h2>Os meus treinos</h2>

        {myLessons.length === 0 && (
          <p className="muted">Não tens treinos atribuídos.</p>
        )}

        <div className="lesson-list">
          {myLessons.map((lesson) => {
            const response = lesson.responses?.find(
              (item) => item.studentId === studentId
            );

            const isConfirmed = response?.status === "confirmed";
            const isDeclined = response?.status === "declined";

            return (
              <div className="lesson-card" key={lesson.id}>
                <div>
                  <h3>
                    {lesson.date} · {lesson.time || "--:--"}
                  </h3>

                  {lesson.groupName && <p>Grupo: {lesson.groupName}</p>}

                  <p>🏖️ {lesson.beach || "Praia por definir"}</p>
                  <p>👨‍🏫 Treinador: {lesson.coachName}</p>
                  <p>🚐 Carrinha: {lesson.van || "Por definir"}</p>
                  <p>🕒 Pickup: {lesson.pickupTime || "Por definir"}</p>

                  {isConfirmed && <p className="muted">✅ Confirmado</p>}
                  {isDeclined && <p className="muted">❌ Não vou</p>}
                  {!isConfirmed && !isDeclined && (
                    <p className="muted">Ainda não respondeste.</p>
                  )}
                </div>

                <div className="student-lesson-actions">
                  <button
                    className="primary-btn"
                    onClick={() => respondToLesson(lesson, "confirmed")}
                  >
                    ✅ Vou
                  </button>

                  <button
                    className="danger-btn"
                    onClick={() => respondToLesson(lesson, "declined")}
                  >
                    ❌ Não vou
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StudentArea;
