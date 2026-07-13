import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import { updateLesson } from "../services/lessonsService";
import { canMarkAttendance } from "../utils/lessonWorkflow";

type Props = {
  lesson: Lesson;
  students: Student[];
  onSaved: () => void;
};

function CoachAttendancePanel({ lesson, students, onSaved }: Props) {
  const bookedStudents = students.filter((student) =>
    lesson.bookedStudentIds.includes(student.id)
  );

  if (!canMarkAttendance(lesson)) {
    return (
      <div className="coach-attendance-locked">
        <p className="muted">
          As presenças só podem ser marcadas <strong>no dia do treino</strong> ou
          depois ({lesson.date}).
        </p>
      </div>
    );
  }

  async function togglePresence(studentId: string) {
    const isPresent = lesson.presentStudentIds.includes(studentId);

    try {
      await updateLesson({
        ...lesson,
        presentStudentIds: isPresent
          ? lesson.presentStudentIds.filter((id) => id !== studentId)
          : [...lesson.presentStudentIds, studentId],
      });

      toast.success(isPresent ? "Presença removida." : "Presença marcada.");
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao marcar presença.");
    }
  }

  if (bookedStudents.length === 0) {
    return <p className="muted">Sem alunos inscritos neste treino.</p>;
  }

  return (
    <div className="coach-attendance-panel">
      <p className="muted">
        Marca presenças durante ou depois do treino.
      </p>

      <div className="lesson-students-list">
        {bookedStudents.map((student) => {
          const isPresent = lesson.presentStudentIds.includes(student.id);
          const response = lesson.responses?.find(
            (item) => item.studentId === student.id
          );

          return (
            <button
              type="button"
              className={isPresent ? "lesson-student-row present" : "lesson-student-row"}
              key={student.id}
              onClick={() => togglePresence(student.id)}
            >
              <span>
                {student.name}
                <small className="student-response-status">
                  {response?.status === "confirmed" && "Confirmou"}
                  {response?.status === "declined" && "Não vai"}
                  {!response && "Sem resposta"}
                </small>
              </span>

              <strong>{isPresent ? "✅ Presente" : "⬜ Ausente"}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CoachAttendancePanel;
