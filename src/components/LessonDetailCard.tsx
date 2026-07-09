import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, Lesson, Student } from "../types";
import { updateLesson } from "../services/lessonsService";
import { getCoaches } from "../services/coachesService";

type Props = {
  lesson: Lesson;
  students: Student[];
};

function LessonDetailCard({ lesson, students }: Props) {
  const [currentLesson, setCurrentLesson] = useState<Lesson>(lesson);
  const [coachNotes, setCoachNotes] = useState(lesson.coachNotes || "");
  const [coaches, setCoaches] = useState<Coach[]>([]);

  const bookedStudents = students.filter((student) =>
    currentLesson.bookedStudentIds.includes(student.id)
  );

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    try {
      setCoaches(await getCoaches());
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinadores.");
    }
  }

  async function saveLessonChanges(updatedLesson: Lesson, successMessage: string) {
    const previousLesson = currentLesson;

    setCurrentLesson(updatedLesson);

    try {
      await updateLesson(updatedLesson);
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar alterações.");
      setCurrentLesson(previousLesson);
    }
  }

  function updateField(field: keyof Lesson, value: string) {
    const updatedLesson = {
      ...currentLesson,
      [field]: value,
    };

    saveLessonChanges(updatedLesson, "Treino atualizado.");
  }

  function updateCoach(coachId: string) {
    const coach = coaches.find((item) => item.id === coachId);
    if (!coach) return;

    const updatedLesson: Lesson = {
      ...currentLesson,
      coachId: coach.id,
      coachName: coach.name,
    };

    saveLessonChanges(updatedLesson, "Treinador atualizado.");
  }

  async function publishLesson() {
    saveLessonChanges(
      { ...currentLesson, status: "published" },
      "Treino publicado com sucesso."
    );
  }

  async function finishLesson() {
    saveLessonChanges(
      { ...currentLesson, status: "finished" },
      "Treino concluído."
    );
  }

  async function togglePresence(studentId: string) {
    const isPresent = currentLesson.presentStudentIds.includes(studentId);

    const updatedLesson: Lesson = {
      ...currentLesson,
      presentStudentIds: isPresent
        ? currentLesson.presentStudentIds.filter((id) => id !== studentId)
        : [...currentLesson.presentStudentIds, studentId],
    };

    saveLessonChanges(
      updatedLesson,
      isPresent ? "Aluno marcado como ausente." : "Presença marcada."
    );
  }

  async function saveNotes() {
    saveLessonChanges(
      { ...currentLesson, coachNotes },
      "Notas guardadas."
    );
  }

  return (
    <div className="lesson-detail-card">
      <div className="lesson-detail-hero">
        <div>
          <span className="lesson-kicker">Treino</span>
          <h2>{currentLesson.groupName || "Treino extra"}</h2>
          <p>{currentLesson.beach || "Praia por definir"}</p>
        </div>

        <span className={"lesson-status status-" + currentLesson.status}>
          {currentLesson.status === "draft" && "Rascunho"}
          {currentLesson.status === "published" && "Publicado"}
          {currentLesson.status === "finished" && "Concluído"}
        </span>
      </div>

      <div className="lesson-actions-bar">
        {currentLesson.status === "draft" && (
          <button className="primary-btn" onClick={publishLesson}>
            📢 Publicar treino
          </button>
        )}

        {currentLesson.status === "published" && (
          <button className="primary-btn" onClick={finishLesson}>
            ✅ Concluir treino
          </button>
        )}

        {currentLesson.status === "finished" && (
          <span className="muted">Este treino já foi concluído.</span>
        )}
      </div>

      <div className="lesson-section">
        <h3>✏️ Editar treino</h3>

        <div className="lesson-edit-grid">
          <label>
            Data
            <input
              type="date"
              value={currentLesson.date}
              onChange={(e) => updateField("date", e.target.value)}
            />
          </label>

          <label>
            Hora
            <input
              type="time"
              value={currentLesson.time || ""}
              onChange={(e) => updateField("time", e.target.value)}
            />
          </label>

          <label>
            Praia
            <input
              value={currentLesson.beach || ""}
              onChange={(e) => updateField("beach", e.target.value)}
            />
          </label>

          <label>
            Treinador
            <select
              value={currentLesson.coachId}
              onChange={(e) => updateCoach(e.target.value)}
            >
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Carrinha
            <input
              value={currentLesson.van || ""}
              onChange={(e) => updateField("van", e.target.value)}
            />
          </label>

          <label>
            Hora de recolha
            <input
              value={currentLesson.pickupTime || ""}
              onChange={(e) => updateField("pickupTime", e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="lesson-detail-grid">
        <div>
          <span>📅 Data</span>
          <strong>{currentLesson.date}</strong>
        </div>

        <div>
          <span>🕒 Hora</span>
          <strong>{currentLesson.time || "--:--"}</strong>
        </div>

        <div>
          <span>👨‍🏫 Treinador</span>
          <strong>{currentLesson.coachName}</strong>
        </div>

        <div>
          <span>🚐 Carrinha</span>
          <strong>{currentLesson.van || "Por definir"}</strong>
        </div>
      </div>

      <div className="lesson-section">
        <div className="lesson-section-header">
          <h3>👥 Presenças</h3>
          <span>
            {currentLesson.presentStudentIds.length}/{bookedStudents.length}
          </span>
        </div>

        {bookedStudents.length === 0 && (
          <p className="muted">Ainda não existem alunos neste treino.</p>
        )}

        <div className="lesson-students-list">
          {bookedStudents.map((student) => {
            const isPresent = currentLesson.presentStudentIds.includes(student.id);

            return (
              <button
                type="button"
                className={isPresent ? "lesson-student-row present" : "lesson-student-row"}
                key={student.id}
                onClick={() => togglePresence(student.id)}
              >
                <span>{student.name}</span>
                <strong>{isPresent ? "✅ Presente" : "⬜ Ausente"}</strong>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lesson-section">
        <h3>📝 Notas do treinador</h3>

        <textarea
          rows={5}
          placeholder="Escreve notas sobre este treino..."
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
        />

        <button className="primary-btn" onClick={saveNotes}>
          Guardar notas
        </button>
      </div>
    </div>
  );
}

export default LessonDetailCard;
