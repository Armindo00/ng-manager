import { useState } from "react";
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
    await updateLesson(updatedLesson);
  }

  async function saveNotes() {
    const updatedLesson: Lesson = {
      ...currentLesson,
      coachNotes,
    };

    setCurrentLesson(updatedLesson);
    await updateLesson(updatedLesson);

    alert("Notas guardadas.");
  }

  return (
    <div className="lesson-detail-card">
      <h2>{currentLesson.groupName || "Treino extra"}</h2>

      <div className="lesson-detail-grid">
        <p>📅 Data: {currentLesson.date}</p>
        <p>🕒 Hora: {currentLesson.time || "--:--"}</p>
        <p>🏖️ Praia: {currentLesson.beach || "Por definir"}</p>
        <p>👨‍🏫 Treinador: {currentLesson.coachName}</p>
        <p>🚐 Carrinha: {currentLesson.van}</p>
        <p>📌 Estado: {currentLesson.status}</p>
      </div>

      <h3>👥 Lista de presenças</h3>

      {bookedStudents.length === 0 && (
        <p className="muted">Ainda não existem alunos neste treino.</p>
      )}

      {bookedStudents.map((student) => {
        const isPresent = currentLesson.presentStudentIds.includes(student.id);

        return (
          <label className="lesson-student-row" key={student.id}>
            <span>{student.name}</span>

            <input
              type="checkbox"
              checked={isPresent}
              onChange={() => togglePresence(student.id)}
            />

            <strong>{isPresent ? "✅ Presente" : "⬜ Ausente"}</strong>
          </label>
        );
      })}

      <div className="lesson-notes-box">
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
