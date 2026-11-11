import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import type { LessonCompensation } from "../types/compensation";
import { updateLesson } from "../services/lessonsService";
import {
  addCompensationStudentToLesson,
  clearOpenCompensationForMissedLesson,
  countOpenCompensations,
  getCompensations,
  markStudentForCompensation,
} from "../services/compensationsService";
import { canMarkAttendance } from "../utils/lessonWorkflow";

type AttendanceStatus = "present" | "absent" | "makeup";

type Props = {
  lesson: Lesson;
  students: Student[];
  onSaved: () => void;
};

function CoachAttendancePanel({ lesson, students, onSaved }: Props) {
  const [studentSearch, setStudentSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [compensations, setCompensations] = useState<LessonCompensation[]>([]);

  useEffect(() => {
    loadCompensations();
  }, [lesson.id]);

  async function loadCompensations() {
    try {
      setCompensations(await getCompensations());
    } catch (error) {
      console.error(error);
    }
  }

  const bookedStudents = useMemo(
    () =>
      students
        .filter((student) => lesson.bookedStudentIds.includes(student.id))
        .sort((a, b) => a.name.localeCompare(b.name, "pt")),
    [students, lesson.bookedStudentIds]
  );

  const makeupIdsForLesson = useMemo(() => {
    return new Set(
      compensations
        .filter(
          (item) =>
            item.missedLessonId === lesson.id &&
            (item.status === "pending" || item.status === "approved")
        )
        .map((item) => item.studentId)
    );
  }, [compensations, lesson.id]);

  const compensationCandidates = useMemo(() => {
    const byStudent = new Map<string, number>();

    for (const student of students) {
      if (lesson.bookedStudentIds.includes(student.id)) continue;
      const count = countOpenCompensations(compensations, student.id);
      if (count > 0) byStudent.set(student.id, count);
    }

    return [...byStudent.entries()]
      .map(([studentId, count]) => ({
        student: students.find((item) => item.id === studentId)!,
        count,
      }))
      .filter((item) => item.student)
      .sort((a, b) => a.student.name.localeCompare(b.student.name, "pt"));
  }, [students, compensations, lesson.bookedStudentIds]);

  const filteredCompensationCandidates = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return compensationCandidates;
    return compensationCandidates.filter((item) =>
      item.student.name.toLowerCase().includes(query)
    );
  }, [compensationCandidates, studentSearch]);

  const availableExtras = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return [];

    const compensationIds = new Set(
      compensationCandidates.map((item) => item.student.id)
    );

    return students
      .filter(
        (student) =>
          !lesson.bookedStudentIds.includes(student.id) &&
          !compensationIds.has(student.id) &&
          student.name.toLowerCase().includes(query)
      )
      .sort((a, b) => a.name.localeCompare(b.name, "pt"))
      .slice(0, 6);
  }, [
    students,
    lesson.bookedStudentIds,
    studentSearch,
    compensationCandidates,
  ]);

  const canEdit = canMarkAttendance(lesson) && lesson.status !== "draft";

  function getStatus(studentId: string): AttendanceStatus {
    if (makeupIdsForLesson.has(studentId)) return "makeup";
    if (lesson.presentStudentIds.includes(studentId)) return "present";
    return "absent";
  }

  async function saveLesson(nextLesson: Lesson, successMessage: string) {
    if (saving) return;

    try {
      setSaving(true);
      await updateLesson(nextLesson);
      toast.success(successMessage);
      await loadCompensations();
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar o treino.");
    } finally {
      setSaving(false);
    }
  }

  async function setAttendance(studentId: string, status: AttendanceStatus) {
    if (!canEdit || saving) return;
    if (getStatus(studentId) === status) return;

    try {
      setSaving(true);

      if (status === "makeup") {
        await markStudentForCompensation(lesson, studentId);
        toast.success("Aluno enviado para compensações.");
        await loadCompensations();
        onSaved();
        return;
      }

      await clearOpenCompensationForMissedLesson(studentId, lesson.id);

      const nextLesson: Lesson = {
        ...lesson,
        presentStudentIds:
          status === "present"
            ? lesson.presentStudentIds.includes(studentId)
              ? lesson.presentStudentIds
              : [...lesson.presentStudentIds, studentId]
            : lesson.presentStudentIds.filter((id) => id !== studentId),
      };

      await updateLesson(nextLesson);
      toast.success(
        status === "present" ? "Presença marcada." : "Falta marcada."
      );
      await loadCompensations();
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar presença.");
    } finally {
      setSaving(false);
    }
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

  async function addFromCompensation(studentId: string) {
    if (!canEdit || saving) return;

    try {
      setSaving(true);
      await addCompensationStudentToLesson(lesson, studentId, compensations);
      toast.success("Aluno de compensação adicionado ao treino.");
      setStudentSearch("");
      await loadCompensations();
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao adicionar aluno de compensação."
      );
    } finally {
      setSaving(false);
    }
  }

  const presentCount = bookedStudents.filter(
    (student) => getStatus(student.id) === "present"
  ).length;
  const makeupCount = bookedStudents.filter(
    (student) => getStatus(student.id) === "makeup"
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
          Presentes: {presentCount}/{bookedStudents.length}
          {makeupCount > 0 ? ` · ${makeupCount} a compensar` : ""}. Opções:
          Presente, Falta ou Compensa noutro treino.
        </p>
      )}

      <div className="lesson-students-list">
        {bookedStudents.length === 0 ? (
          <p className="muted">Ainda não há alunos neste treino.</p>
        ) : (
          bookedStudents.map((student) => {
            const status = getStatus(student.id);

            return (
              <div
                className={`lesson-student-row ${
                  status === "present"
                    ? "present"
                    : status === "makeup"
                      ? "makeup"
                      : "absent"
                }`}
                key={student.id}
              >
                <span className="lesson-student-name">{student.name}</span>

                {canEdit ? (
                  <div className="attendance-actions">
                    <button
                      type="button"
                      className={
                        status === "present"
                          ? "attendance-btn present active"
                          : "attendance-btn present"
                      }
                      disabled={saving}
                      onClick={() => setAttendance(student.id, "present")}
                    >
                      Presente
                    </button>
                    <button
                      type="button"
                      className={
                        status === "absent"
                          ? "attendance-btn absent active"
                          : "attendance-btn absent"
                      }
                      disabled={saving}
                      onClick={() => setAttendance(student.id, "absent")}
                    >
                      Falta
                    </button>
                    <button
                      type="button"
                      className={
                        status === "makeup"
                          ? "attendance-btn makeup active"
                          : "attendance-btn makeup"
                      }
                      disabled={saving}
                      onClick={() => setAttendance(student.id, "makeup")}
                    >
                      Compensa noutro treino
                    </button>
                  </div>
                ) : (
                  <strong className="attendance-readonly">
                    {status === "present"
                      ? "Presente"
                      : status === "makeup"
                        ? "Compensa noutro treino"
                        : "Falta / por marcar"}
                  </strong>
                )}
              </div>
            );
          })
        )}
      </div>

      {canEdit && (
        <div className="lesson-add-student coach-add-extra">
          {compensationCandidates.length > 0 && (
            <div className="compensation-add-block">
              <div className="compensation-add-heading">
                <strong>Da lista de compensações</strong>
                <span className="muted">
                  {compensationCandidates.length} aluno
                  {compensationCandidates.length === 1 ? "" : "s"} com treinos a
                  compensar
                </span>
              </div>

              <div className="compensation-add-list">
                {filteredCompensationCandidates.map(({ student, count }) => (
                  <button
                    type="button"
                    className="compensation-add-row"
                    key={student.id}
                    disabled={saving}
                    onClick={() => addFromCompensation(student.id)}
                  >
                    <span>
                      <strong>{student.name}</strong>
                      <small>
                        {count} treino{count === 1 ? "" : "s"} a compensar
                      </small>
                    </span>
                    <span className="compensation-add-action">Adicionar</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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

              {availableExtras.length === 0 &&
                filteredCompensationCandidates.length === 0 && (
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
