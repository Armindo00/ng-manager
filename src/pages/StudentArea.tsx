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

      const today = new Date().toISOString().split("T")[0];

      setStudents(studentsData);
      setLessons(
        lessonsData.filter(
          (lesson) => lesson.status === "published" && lesson.date >= today
        )
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinos.");
    } finally {
      setLoading(false);
    }
  }

  const student = students.find((s) => s.id === user.studentId);

  if (loading) return <p className="muted">A carregar...</p>;
  if (!student) return <p>Aluno não encontrado.</p>;

  const studentId = student.id;

  const myLessons = lessons
    .filter((lesson) => lesson.bookedStudentIds.includes(studentId))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const attended = lessons.filter((lesson) =>
    lesson.presentStudentIds.includes(studentId)
  );

  function getResponse(lesson: Lesson) {
    return lesson.responses?.find((response) => response.studentId === studentId);
  }

  const pendingLessons = myLessons.filter((lesson) => !getResponse(lesson));
  const confirmedLessons = myLessons.filter(
    (lesson) => getResponse(lesson)?.status === "confirmed"
  );
  const declinedLessons = myLessons.filter(
    (lesson) => getResponse(lesson)?.status === "declined"
  );

  async function respondToLesson(
    lesson: Lesson,
    status: "confirmed" | "declined"
  ) {
    const filteredResponses = (lesson.responses || []).filter(
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

      toast.success(
        status === "confirmed"
          ? "Confirmaste presença."
          : "Marcaste que não vais."
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar resposta.");
    }
  }

  function renderLessonCard(lesson: Lesson) {
    const response = getResponse(lesson);
    const isConfirmed = response?.status === "confirmed";
    const isDeclined = response?.status === "declined";

    return (
      <div className="lesson-card student-lesson-card" key={lesson.id}>
        <div>
          <h3>
            {lesson.date} · {lesson.time || "--:--"}
          </h3>

          {lesson.groupName && <p>Grupo: {lesson.groupName}</p>}

          <p>🏖️ {lesson.beach || "Praia por definir"}</p>
          <p>👨‍🏫 Treinador: {lesson.coachName}</p>
          <p>🚐 Carrinha: {lesson.van || "Por definir"}</p>
          <p>🕒 Pickup: {lesson.pickupTime || "Por definir"}</p>

          {isConfirmed && <p className="student-status confirmed">✅ Vou</p>}
          {isDeclined && <p className="student-status declined">❌ Não vou</p>}
          {!isConfirmed && !isDeclined && (
            <p className="student-status pending">⏳ Por responder</p>
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
        <h2>⏳ Por responder</h2>

        {pendingLessons.length === 0 && (
          <p className="muted">Não tens treinos por responder.</p>
        )}

        <div className="lesson-list">{pendingLessons.map(renderLessonCard)}</div>
      </div>

      <div className="card section-card">
        <h2>✅ Vou</h2>

        {confirmedLessons.length === 0 && (
          <p className="muted">Ainda não confirmaste nenhum treino.</p>
        )}

        <div className="lesson-list">{confirmedLessons.map(renderLessonCard)}</div>
      </div>

      <div className="card section-card">
        <h2>❌ Não vou</h2>

        {declinedLessons.length === 0 && (
          <p className="muted">Nenhum treino recusado.</p>
        )}

        <div className="lesson-list">{declinedLessons.map(renderLessonCard)}</div>
      </div>
    </div>
  );
}

export default StudentArea;
