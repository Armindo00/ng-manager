import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons, updateLesson } from "../services/lessonsService";
import Modal from "../components/Modal";
import CoachAttendancePanel from "../components/CoachAttendancePanel";
import { resolveCoachId } from "../utils/coachAccess";
import { canFinishLesson, canMarkAttendance } from "../utils/lessonWorkflow";

type Props = {
  user: User;
};

function lessonTitle(lesson: Lesson) {
  return lesson.groupName?.trim() || "Treino";
}

function CoachArea({ user }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [coachId, setCoachId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id, user.role, user.name]);

  async function loadData() {
    try {
      setLoading(true);

      const [studentsData, lessonsData, resolvedCoachId] = await Promise.all([
        getStudents(),
        getLessons(),
        resolveCoachId(user),
      ]);

      setCoachId(resolvedCoachId);

      const coachLessons = lessonsData
        .filter(
          (lesson) =>
            Boolean(resolvedCoachId) &&
            lesson.coachId === resolvedCoachId &&
            lesson.status !== "draft"
        )
        .sort((a, b) =>
          `${b.date} ${b.time || ""}`.localeCompare(
            `${a.date} ${a.time || ""}`
          )
        );

      setStudents(studentsData);
      setLessons(coachLessons);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinos.");
    } finally {
      setLoading(false);
    }
  }

  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  const filteredLessons = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return lessons;

    return lessons.filter((lesson) => {
      const title = lessonTitle(lesson).toLowerCase();
      return (
        title.includes(normalized) ||
        lesson.date.includes(normalized) ||
        (lesson.beach || "").toLowerCase().includes(normalized)
      );
    });
  }, [lessons, query]);

  async function finishLesson(lesson: Lesson) {
    if (!canFinishLesson(lesson)) {
      toast.error("Só podes finalizar o treino no dia do treino ou depois.");
      return;
    }

    try {
      await updateLesson({ ...lesson, status: "finished" });
      await loadData();
      toast.success("Treino finalizado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao finalizar treino.");
    }
  }

  return (
    <div>
      <h1 className="page-title">Os meus treinos</h1>
      <p className="muted coach-area-intro">
        Escolhe o treino (já vem com título e alunos fixos), marca presenças e
        faltas, e adiciona um aluno extra se for preciso.
      </p>

      {loading ? (
        <p className="muted">A carregar treinos...</p>
      ) : !coachId ? (
        <p>
          Não foi possível ligar esta conta a um treinador. Garante que existes
          na lista de treinadores.
        </p>
      ) : (
        <>
          <label className="field-label coach-session-search">
            Procurar treino
            <input
              placeholder="Nome do treino, data..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          {filteredLessons.length === 0 ? (
            <p className="muted">Sem treinos para mostrar.</p>
          ) : (
            <div className="coach-session-list">
              {filteredLessons.map((lesson) => {
                const presentCount = lesson.presentStudentIds.filter((id) =>
                  lesson.bookedStudentIds.includes(id)
                ).length;
                const readyForAttendance = canMarkAttendance(lesson);

                return (
                  <button
                    type="button"
                    className="coach-session-card"
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                  >
                    <div className="coach-session-card-main">
                      <strong>{lessonTitle(lesson)}</strong>
                      <span>
                        {lesson.date}
                        {lesson.time ? ` · ${lesson.time}` : ""}
                      </span>
                      <span>
                        {lesson.bookedStudentIds.length} alunos · {presentCount}{" "}
                        presentes
                      </span>
                    </div>

                    <span
                      className={`coach-session-card-status status-${lesson.status}${
                        readyForAttendance && lesson.status !== "finished"
                          ? " ready"
                          : ""
                      }`}
                    >
                      {lesson.status === "finished"
                        ? "Concluído"
                        : readyForAttendance
                          ? "Marcar"
                          : "Agendado"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedLesson && (
        <Modal
          title={lessonTitle(selectedLesson)}
          onClose={() => setSelectedLessonId(null)}
        >
          <div className="coach-session-modal">
            <div className="coach-session-meta">
              <p>
                {selectedLesson.date}
                {selectedLesson.time ? ` · ${selectedLesson.time}` : ""}
              </p>
              {selectedLesson.beach ? <p>{selectedLesson.beach}</p> : null}
            </div>

            <CoachAttendancePanel
              lesson={selectedLesson}
              students={students}
              onSaved={loadData}
            />

            {canFinishLesson(selectedLesson) && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => finishLesson(selectedLesson)}
              >
                Finalizar treino
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CoachArea;
