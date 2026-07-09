import { useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import { updateLesson } from "../services/lessonsService";

type Props = {
  lesson: Lesson;
  students: Student[];
};

function LessonDetailCard({ lesson, students }: Props) {
  const [currentLesson, setCurrentLesson] = useState<Lesson>(lesson);
  const [coachNotes, setCoachNotes] = useState(lesson.coachNotes || "");

  const bookedStudents = students.filter((student) =>
    currentLesson.bookedStudentIds.includes(student.id)
  );

  async function togglePresence(studentId: string) {
    const isPresent = currentLesson.presentStudentIds.includes(studentId);

    const updatedLesson: Lesson = {
      ...currentLesson,
      presentStudentIds: isPresent
        ? currentLesson.presentStudentIds.filter((id) => id !== studentId)
        : [...currentLesson.presentStudentIds, studentId],
    };

    setCurrentLesson(updatedLesson);

    try {
      await updateLesson(updatedLesson);
      toast.success(isPresent ? "Aluno marcado como ausente." : "Presença marcada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar presença.");
      setCurrentLesson(currentLesson);
    }
  }

  async function saveNotes() {
    const updatedLesson: Lesson = {
      ...currentLesson,
      coachNotes,
    };

    setCurrentLesson(updatedLesson);

    try {
      await updateLesson(updatedLesson);
      toast.success("Notas guardadas.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar notas.");
    }
  }

  return (
    <div className="lesson-detail-card">
      <div className="lesson-detail-hero">
        <div>
          <span className="lesson-kicker">Treino</span>
          <h2>{currentLesson.groupName || "Treino extra"}</h2>
          <p>{currentLesson.beach || "Praia por definir"}</p>
        </div>

        <span className="lesson-status">{currentLesson.status}</span>
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
