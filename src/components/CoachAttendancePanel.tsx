import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import type { LessonCompensation } from "../types/compensation";
import { updateLesson } from "../services/lessonsService";
import { getLessons } from "../services/lessonsService";
import {
  addCompensationStudentToLesson,
  clearOpenCompensationForMissedLesson,
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

function formatMissedLessonLabel(lesson: Lesson | undefined) {
  if (!lesson) return "treino anterior";
  const date = new Date(`${lesson.date}T12:00:00`).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
  });
  return `${date}${lesson.groupName ? ` · ${lesson.groupName}` : ""}`;
}

function CoachAttendancePanel({ lesson, students, onSaved }: Props) {
  const [studentSearch, setStudentSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [compensations, setCompensations] = useState<LessonCompensation[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    loadSideData();
  }, [lesson.id]);

  async function loadSideData() {
    try {
      const [compensationsData, lessonsData] = await Promise.all([
        getCompensations(),
        getLessons(),
      ]);
      setCompensations(compensationsData);
      setAllLessons(lessonsData);
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

  /** Alunos deste treino que vão compensar noutro dia. */
  const owedMakeupIds = useMemo(() => {
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

  /** Alunos que estão neste treino a compensar uma falta anterior. */
  const compensatingHere = useMemo(() => {
    const map = new Map<string, LessonCompensation>();
    for (const item of compensations) {
      if (
        item.compensationLessonId === lesson.id &&
        (item.status === "scheduled" || item.status === "completed")
      ) {
        map.set(item.studentId, item);
      }
    }
    return map;
  }, [compensations, lesson.id]);

  const compensationCandidates = useMemo(() => {
    const byStudent = new Map<string, { count: number; oldest: LessonCompensation }>();

    for (const item of compensations) {
      if (lesson.bookedStudentIds.includes(item.studentId)) continue;
      if (item.missedLessonId === lesson.id) continue;
      if (item.status !== "pending" && item.status !== "approved") continue;

      const existing = byStudent.get(item.studentId);
      if (!existing) {
        byStudent.set(item.studentId, { count: 1, oldest: item });
        continue;
      }

      existing.count += 1;
      if (item.createdAt < existing.oldest.createdAt) {
        existing.oldest = item;
      }
    }

    return [...byStudent.entries()]
      .map(([studentId, info]) => ({
        student: students.find((item) => item.id === studentId),
        count: info.count,
        oldest: info.oldest,
      }))
      .filter(
        (
          item
        ): item is {
          student: Student;
          count: number;
          oldest: LessonCompensation;
        } => Boolean(item.student)
      )
      .sort((a, b) => a.student.name.localeCompare(b.student.name, "pt"));
  }, [students, compensations, lesson.bookedStudentIds, lesson.id]);

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
    if (owedMakeupIds.has(studentId)) return "makeup";
    if (lesson.presentStudentIds.includes(studentId)) return "present";
    return "absent";
  }

  function getCompensatingLabel(studentId: string) {
    const link = compensatingHere.get(studentId);
    if (!link) return null;
    const missed = allLessons.find((item) => item.id === link.missedLessonId);
    return formatMissedLessonLabel(missed);
  }

  async function saveLesson(nextLesson: Lesson, successMessage: string) {
    if (saving) return;

    try {
      setSaving(true);
      await updateLesson(nextLesson);
      toast.success(successMessage);
      await loadSideData();
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
        await loadSideData();
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
      await loadSideData();
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
      const result = await addCompensationStudentToLesson(
        lesson,
        studentId,
        compensations
      );
      const missed = allLessons.find(
        (item) => item.id === result.compensation.missedLessonId
      );
      toast.success(
        `Registado a compensar: ${formatMissedLessonLabel(missed)}.`
      );
      setStudentSearch("");
      await loadSideData();
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
  const owedMakeupCount = bookedStudents.filter(
    (student) => getStatus(student.id) === "makeup"
  ).length;
  const compensatingHereCount = bookedStudents.filter((student) =>
    compensatingHere.has(student.id)
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
          {owedMakeupCount > 0
            ? ` · ${owedMakeupCount} a compensar noutro treino`
            : ""}
          {compensatingHereCount > 0
            ? ` · ${compensatingHereCount} em compensação neste treino`
            : ""}
          .
        </p>
      )}

      <div className="lesson-students-list">
        {bookedStudents.length === 0 ? (
          <p className="muted">Ainda não há alunos neste treino.</p>
        ) : (
          bookedStudents.map((student) => {
            const status = getStatus(student.id);
            const compensatingLabel = getCompensatingLabel(student.id);
            const isCompensatingHere = Boolean(compensatingLabel);

            return (
              <div
                className={`lesson-student-row ${
                  isCompensatingHere
                    ? "compensating"
                    : status === "present"
                      ? "present"
                      : status === "makeup"
                        ? "makeup"
                        : "absent"
                }`}
                key={student.id}
              >
                <div className="lesson-student-main">
                  <span className="lesson-student-name">{student.name}</span>
                  {compensatingLabel && (
                    <span className="lesson-compensation-tag">
                      A compensar · {compensatingLabel}
                    </span>
                  )}
                </div>

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
                    {!isCompensatingHere && (
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
                    )}
                  </div>
                ) : (
                  <strong className="attendance-readonly">
                    {isCompensatingHere
                      ? `A compensar · ${compensatingLabel}`
                      : status === "present"
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
                  Ao adicionar, fica registado neste treino como compensação.
                </span>
              </div>

              <div className="compensation-add-list">
                {filteredCompensationCandidates.map(
                  ({ student, count, oldest }) => {
                    const missed = allLessons.find(
                      (item) => item.id === oldest.missedLessonId
                    );
                    return (
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
                            {missed
                              ? ` · próximo: ${formatMissedLessonLabel(missed)}`
                              : ""}
                          </small>
                        </span>
                        <span className="compensation-add-action">
                          Registar compensação
                        </span>
                      </button>
                    );
                  }
                )}
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
