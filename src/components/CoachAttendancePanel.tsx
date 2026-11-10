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
  const canEdit = canMarkAttendance(lesson) && lesson.status !== "draft";

  async function setAttendance(studentId: string, present: boolean) {
    if (!canEdit) return;

    const isPresent = lesson.presentStudentIds.includes(studentId);
    if (present === isPresent) return;

    try {
      await updateLesson({
        ...lesson,
        presentStudentIds: present
          ? [...lesson.presentStudentIds, studentId]
          : lesson.presentStudentIds.filter((id) => id !== studentId),
      });

      toast.success(present ? "Presença marcada." : "Falta marcada.");
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar presença.");
    }
  }

  if (bookedStudents.length === 0) {
    return <p className="muted">Sem alunos neste treino.</p>;
  }

  const presentCount = bookedStudents.filter((student) =>
    lesson.presentStudentIds.includes(student.id)
  ).length;

  return (
    <div className="coach-attendance-panel">
      {!canEdit ? (
        <div className="coach-attendance-locked">
          <p className="muted">
            As presenças só podem ser marcadas <strong>no dia do treino</strong>{" "}
            ou depois ({lesson.date}).
          </p>
        </div>
      ) : (
        <p className="muted">
          Presentes: {presentCount}/{bookedStudents.length}. Marca quem veio;
          os restantes ficam como falta.
        </p>
      )}

      <div className="lesson-students-list">
        {bookedStudents.map((student) => {
          const isPresent = lesson.presentStudentIds.includes(student.id);

          return (
            <div
              className={
                isPresent
                  ? "lesson-student-row present"
                  : "lesson-student-row absent"
              }
              key={student.id}
            >
              <span className="lesson-student-name">{student.name}</span>

              {canEdit ? (
                <div className="attendance-actions">
                  <button
                    type="button"
                    className={
                      isPresent
                        ? "attendance-btn present active"
                        : "attendance-btn present"
                    }
                    onClick={() => setAttendance(student.id, true)}
                  >
                    Presente
                  </button>
                  <button
                    type="button"
                    className={
                      !isPresent
                        ? "attendance-btn absent active"
                        : "attendance-btn absent"
                    }
                    onClick={() => setAttendance(student.id, false)}
                  >
                    Falta
                  </button>
                </div>
              ) : (
                <strong className="attendance-readonly">
                  {isPresent ? "Presente" : "Por marcar"}
                </strong>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CoachAttendancePanel;
