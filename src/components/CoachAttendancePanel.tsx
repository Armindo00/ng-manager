import { useMemo, useState } from "react";
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
  const [studentSearch, setStudentSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const bookedStudents = useMemo(
    () =>
      students
        .filter((student) => lesson.bookedStudentIds.includes(student.id))
        .sort((a, b) => a.name.localeCompare(b.name, "pt")),
    [students, lesson.bookedStudentIds]
  );

  const availableExtras = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return [];

    return students
      .filter(
        (student) =>
          !lesson.bookedStudentIds.includes(student.id) &&
          student.name.toLowerCase().includes(query)
      )
      .sort((a, b) => a.name.localeCompare(b.name, "pt"))
      .slice(0, 6);
  }, [students, lesson.bookedStudentIds, studentSearch]);

  const canEdit = canMarkAttendance(lesson) && lesson.status !== "draft";

  async function saveLesson(nextLesson: Lesson, successMessage: string) {
    if (saving) return;

    try {
      setSaving(true);
      await updateLesson(nextLesson);
      toast.success(successMessage);
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar o treino.");
    } finally {
      setSaving(false);
    }
  }

  async function setAttendance(studentId: string, present: boolean) {
    if (!canEdit) return;

    const isPresent = lesson.presentStudentIds.includes(studentId);
    if (present === isPresent) return;

    await saveLesson(
      {
        ...lesson,
        presentStudentIds: present
          ? [...lesson.presentStudentIds, studentId]
          : lesson.presentStudentIds.filter((id) => id !== studentId),
      },
      present ? "Presença marcada." : "Falta marcada."
    );
  }

  async function addExtraStudent(studentId: string) {
    if (!canEdit) return;

    await saveLesson(
      {
        ...lesson,
        bookedStudentIds: [...lesson.bookedStudentIds, studentId],
        presentStudentIds: [...lesson.presentStudentIds, studentId],
      },
      "Aluno extra adicionado e marcado como presente."
    );

    setStudentSearch("");
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
          Presentes: {presentCount}/{bookedStudents.length}. Marca presença ou
          falta. Se vier alguém extra, adiciona abaixo.
        </p>
      )}

      <div className="lesson-students-list">
        {bookedStudents.length === 0 ? (
          <p className="muted">Ainda não há alunos neste treino.</p>
        ) : (
          bookedStudents.map((student) => {
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
                      disabled={saving}
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
                      disabled={saving}
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
          })
        )}
      </div>

      {canEdit && (
        <div className="lesson-add-student coach-add-extra">
          <label className="field-label">
            Aluno extra
            <input
              placeholder="Pesquisar aluno para adicionar..."
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              disabled={saving}
            />
          </label>

          {studentSearch.trim() && (
            <div className="lesson-add-results">
              {availableExtras.map((student) => (
                <button
                  type="button"
                  key={student.id}
                  disabled={saving}
                  onClick={() => addExtraStudent(student.id)}
                >
                  Adicionar {student.name}
                </button>
              ))}

              {availableExtras.length === 0 && (
                <p className="muted">Nenhum aluno encontrado.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CoachAttendancePanel;
