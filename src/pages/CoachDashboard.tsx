import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, Lesson, Student, User } from "../types";
import type { FixedTraining } from "../data/fixedTrainings";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import {
  addLesson,
  getLessons,
  updateLesson,
} from "../services/lessonsService";
import { ensureFixedTrainingsSeeded } from "../services/fixedTrainingsService";
import Modal from "../components/Modal";
import CoachAttendancePanel from "../components/CoachAttendancePanel";
import { resolveCoachId } from "../utils/coachAccess";
import { formatSessionCoaches } from "../utils/sessionCoaches";
import { matchStudentIdsByNames } from "../utils/studentNameMatch";
import {
  formatTodayLabel,
  getTodayDate,
  getWeekdayKey,
} from "../utils/dateUtils";
import { canFinishLesson } from "../utils/lessonWorkflow";

type Props = {
  user: User;
};

function CoachDashboard({ user }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [pendingGroup, setPendingGroup] = useState<FixedTraining | null>(null);
  const [creatingExtra, setCreatingExtra] = useState(false);
  const [extraTitle, setExtraTitle] = useState("Treino extra");
  const [extraStudentIds, setExtraStudentIds] = useState<string[]>([]);
  const [extraStudentSearch, setExtraStudentSearch] = useState("");
  const [secondaryCoachName, setSecondaryCoachName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [fixedTrainings, setFixedTrainings] = useState<FixedTraining[]>([]);

  const today = getTodayDate();
  const weekdayKey = getWeekdayKey(today);

  useEffect(() => {
    loadData();
  }, [user.id, user.role, user.name]);

  async function loadData(options?: { silent?: boolean }) {
    const silent = options?.silent === true;

    try {
      if (!silent) setLoading(true);

      const [
        lessonsData,
        studentsData,
        coachesData,
        trainingsData,
        resolvedCoachId,
      ] = await Promise.all([
        getLessons(),
        getStudents(),
        getCoaches(),
        ensureFixedTrainingsSeeded(),
        resolveCoachId(user),
      ]);

      setCoachId(resolvedCoachId);
      setCoaches(coachesData);
      setFixedTrainings(trainingsData);
      setLessons(
        lessonsData.sort((a, b) =>
          `${b.date} ${b.time || ""}`.localeCompare(
            `${a.date} ${a.time || ""}`
          )
        )
      );
      setStudents(studentsData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar os treinos.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function handleLessonUpdated(nextLesson: Lesson) {
    setLessons((current) =>
      current.map((item) => (item.id === nextLesson.id ? nextLesson : item))
    );
  }

  const todayGroups = useMemo(
    () => fixedTrainings.filter((group) => group.weekday === weekdayKey),
    [fixedTrainings, weekdayKey]
  );

  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  function findSessionForGroup(group: FixedTraining) {
    return lessons.find(
      (lesson) =>
        lesson.date === today &&
        lesson.groupName === group.title &&
        lesson.status !== "draft"
    );
  }

  const todayFixedTitles = useMemo(
    () => new Set(todayGroups.map((group) => group.title)),
    [todayGroups]
  );

  const todayExtraLessons = useMemo(
    () =>
      lessons.filter(
        (lesson) =>
          lesson.date === today &&
          lesson.status !== "draft" &&
          (!lesson.groupName || !todayFixedTitles.has(lesson.groupName))
      ),
    [lessons, today, todayFixedTitles]
  );

  const selectableExtraStudents = useMemo(() => {
    const term = extraStudentSearch.trim().toLowerCase();
    return students
      .filter((student) =>
        term ? student.name.toLowerCase().includes(term) : true
      )
      .sort((a, b) => a.name.localeCompare(b.name, "pt"));
  }, [students, extraStudentSearch]);

  function openGroup(group: FixedTraining) {
    const existing = findSessionForGroup(group);
    if (existing) {
      setSelectedLessonId(existing.id);
      return;
    }

    setPendingGroup(group);
    setSecondaryCoachName("");
  }

  function openCreateExtra() {
    setCreatingExtra(true);
    setExtraTitle("Treino extra");
    setExtraStudentIds([]);
    setExtraStudentSearch("");
    setSecondaryCoachName("");
  }

  function toggleExtraStudent(studentId: string) {
    setExtraStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  async function createExtraSession() {
    if (!coachId) {
      toast.error("Não foi possível identificar o treinador.");
      return;
    }
    if (extraStudentIds.length === 0) {
      toast.error("Escolhe pelo menos um aluno que foi ao treino.");
      return;
    }

    try {
      setSaving(true);

      const lesson: Lesson = {
        id: crypto.randomUUID(),
        date: today,
        time: "",
        beach: "",
        status: "published",
        groupName: extraTitle.trim() || "Treino extra",
        coachId,
        coachName: user.name,
        secondaryCoachName: secondaryCoachName.trim() || undefined,
        van: "",
        pickupTime: "",
        coachPickups: [],
        coachNotes: "",
        bookedStudentIds: extraStudentIds,
        presentStudentIds: [...extraStudentIds],
        responses: [],
      };

      await addLesson(lesson);
      await loadData();
      setCreatingExtra(false);
      setSelectedLessonId(lesson.id);
      toast.success("Treino extra registado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registar o treino extra.");
    } finally {
      setSaving(false);
    }
  }

  async function createSession() {
    if (!pendingGroup || !coachId) {
      toast.error("Não foi possível identificar o treinador.");
      return;
    }

    const { matchedIds, unmatchedNames } = matchStudentIdsByNames(
      pendingGroup.students,
      students
    );

    try {
      setSaving(true);

      const lesson: Lesson = {
        id: crypto.randomUUID(),
        date: today,
        time: "",
        beach: "",
        status: "published",
        groupName: pendingGroup.title,
        coachId,
        coachName: user.name,
        secondaryCoachName: secondaryCoachName.trim() || undefined,
        van: "",
        pickupTime: "",
        coachPickups: [],
        coachNotes: "",
        bookedStudentIds: matchedIds,
        presentStudentIds: [],
        responses: [],
      };

      await addLesson(lesson);
      await loadData();
      setSelectedLessonId(lesson.id);
      setPendingGroup(null);

      if (unmatchedNames.length > 0) {
        toast.error(
          `Sessão criada. ${unmatchedNames.length} aluno(s) ainda não existem na app e não entraram na lista.`
        );
      } else {
        toast.success("Treino registado. Podes marcar as presenças.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registar o treino.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSecondaryCoach(lesson: Lesson, nextSecondary: string) {
    try {
      await updateLesson({
        ...lesson,
        secondaryCoachName: nextSecondary.trim() || undefined,
      });
      await loadData();
      toast.success(
        nextSecondary.trim()
          ? "Segundo treinador atualizado."
          : "Segundo treinador removido."
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar treinadores.");
    }
  }

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

  if (loading) {
    return <p className="muted">A carregar treinos...</p>;
  }

  if (!coachId) {
    return (
      <p>
        Não foi possível ligar esta conta a um treinador. Garante que existes
        na lista de treinadores.
      </p>
    );
  }

  return (
    <div className="coach-dashboard-page dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Presenças · {formatTodayLabel()}</p>
        <h1 className="page-title">Treinos de hoje</h1>
        <p className="page-description">
          Escolhe o grupo que deste ou cria um treino extra e indica quem foi.
        </p>
      </header>

      <section className="card section-card">
        <div className="admin-section-heading">
          <div>
            <span className="admin-section-kicker">Hoje</span>
            <h2>Grupos de hoje</h2>
          </div>
          <div className="coach-hoje-heading-actions">
            <span className="coach-count-chip">
              {todayGroups.length + todayExtraLessons.length}
            </span>
            <button
              type="button"
              className="primary-btn coach-hoje-add-btn"
              onClick={openCreateExtra}
              aria-label="Criar treino extra"
              title="Criar treino extra"
            >
              +
            </button>
          </div>
        </div>

        {todayGroups.length === 0 && todayExtraLessons.length === 0 ? (
          <p className="muted">
            Não há grupos fixos para hoje. Usa + para registar um treino extra.
          </p>
        ) : (
          <div className="coach-session-list">
            {todayGroups.map((group) => {
              const session = findSessionForGroup(group);
              const presentCount = session
                ? session.presentStudentIds.filter((id) =>
                    session.bookedStudentIds.includes(id)
                  ).length
                : 0;

              return (
                <button
                  type="button"
                  className="coach-session-card"
                  key={group.id}
                  onClick={() => openGroup(group)}
                >
                  <div className="coach-session-card-main">
                    <strong>{group.title}</strong>
                    <span>{group.students.length} alunos fixos</span>
                    {session ? (
                      <span>
                        {formatSessionCoaches(
                          session.coachName,
                          session.secondaryCoachName
                        )}{" "}
                        · {presentCount}/{session.bookedStudentIds.length}{" "}
                        presentes
                      </span>
                    ) : (
                      <span>Ainda não registado hoje</span>
                    )}
                  </div>

                  <span
                    className={`coach-session-card-status${
                      session
                        ? session.status === "finished"
                          ? " status-finished"
                          : " ready"
                        : ""
                    }`}
                  >
                    {session
                      ? session.status === "finished"
                        ? "Concluído"
                        : "Abrir"
                      : "Registar"}
                  </span>
                </button>
              );
            })}

            {todayExtraLessons.map((lesson) => {
              const presentCount = lesson.presentStudentIds.filter((id) =>
                lesson.bookedStudentIds.includes(id)
              ).length;

              return (
                <button
                  type="button"
                  className="coach-session-card"
                  key={lesson.id}
                  onClick={() => setSelectedLessonId(lesson.id)}
                >
                  <div className="coach-session-card-main">
                    <strong>{lesson.groupName || "Treino extra"}</strong>
                    <span>Treino extra</span>
                    <span>
                      {formatSessionCoaches(
                        lesson.coachName,
                        lesson.secondaryCoachName
                      )}{" "}
                      · {presentCount}/{lesson.bookedStudentIds.length} presentes
                    </span>
                  </div>

                  <span
                    className={`coach-session-card-status${
                      lesson.status === "finished"
                        ? " status-finished"
                        : " ready"
                    }`}
                  >
                    {lesson.status === "finished" ? "Concluído" : "Abrir"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {creatingExtra && (
        <Modal title="Treino extra" onClose={() => setCreatingExtra(false)}>
          <div className="coach-session-modal">
            <p className="muted">
              Regista um treino fora dos grupos fixos e indica quem foi.
            </p>

            <label className="field-label">
              Nome do treino
              <input
                value={extraTitle}
                onChange={(event) => setExtraTitle(event.target.value)}
                placeholder="Treino extra"
              />
            </label>

            <label className="field-label">
              Segundo treinador (opcional)
              <select
                value={secondaryCoachName}
                onChange={(event) => setSecondaryCoachName(event.target.value)}
              >
                <option value="">Só eu</option>
                {coaches
                  .filter(
                    (coach) =>
                      coach.name.trim().toLowerCase() !==
                      user.name.trim().toLowerCase()
                  )
                  .map((coach) => (
                    <option key={coach.id} value={coach.name}>
                      {coach.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="field-label">
              Quem foi ao treino
              <input
                className="search-input"
                value={extraStudentSearch}
                onChange={(event) => setExtraStudentSearch(event.target.value)}
                placeholder="Pesquisar aluno..."
              />
            </label>

            <div className="coach-extra-student-picker">
              {selectableExtraStudents.length === 0 ? (
                <p className="muted">Sem alunos encontrados.</p>
              ) : (
                selectableExtraStudents.map((student) => {
                  const selected = extraStudentIds.includes(student.id);
                  return (
                    <button
                      type="button"
                      key={student.id}
                      className={`coach-extra-student-option${
                        selected ? " selected" : ""
                      }`}
                      onClick={() => toggleExtraStudent(student.id)}
                    >
                      <span>{student.name}</span>
                      <strong>{selected ? "Foi" : "Selecionar"}</strong>
                    </button>
                  );
                })
              )}
            </div>

            <p className="muted">
              {extraStudentIds.length} aluno(s) selecionado(s)
            </p>

            <button
              type="button"
              className="primary-btn"
              disabled={saving}
              onClick={createExtraSession}
            >
              {saving ? "A registar..." : "Registar treino extra"}
            </button>
          </div>
        </Modal>
      )}

      {pendingGroup && (
        <Modal
          title={`Registar · ${pendingGroup.title}`}
          onClose={() => setPendingGroup(null)}
        >
          <div className="coach-session-modal">
            <p className="muted">
              Vais registar este grupo para hoje como{" "}
              <strong>{user.name}</strong>. Se houve 2 treinadores, escolhe o
              segundo.
            </p>

            <label className="field-label">
              Segundo treinador (opcional)
              <select
                value={secondaryCoachName}
                onChange={(event) => setSecondaryCoachName(event.target.value)}
              >
                <option value="">Só eu</option>
                {coaches
                  .filter(
                    (coach) =>
                      coach.name.trim().toLowerCase() !==
                      user.name.trim().toLowerCase()
                  )
                  .map((coach) => (
                    <option key={coach.id} value={coach.name}>
                      {coach.name}
                    </option>
                  ))}
              </select>
            </label>

            <p className="muted">
              Alunos deste grupo: {pendingGroup.students.join(", ")}
            </p>

            <button
              type="button"
              className="primary-btn"
              disabled={saving}
              onClick={createSession}
            >
              {saving ? "A registar..." : "Registar treino e marcar presenças"}
            </button>
          </div>
        </Modal>
      )}

      {selectedLesson && (
        <Modal
          title={selectedLesson.groupName || "Treino"}
          onClose={() => setSelectedLessonId(null)}
        >
          <div className="coach-session-modal">
            <div className="coach-session-meta">
              <p>
                {selectedLesson.date}
                {selectedLesson.time ? ` · ${selectedLesson.time}` : ""}
              </p>
              <p>
                Treinadores:{" "}
                {formatSessionCoaches(
                  selectedLesson.coachName,
                  selectedLesson.secondaryCoachName
                )}
              </p>
            </div>

            <label className="field-label">
              Segundo treinador
              <select
                value={selectedLesson.secondaryCoachName || ""}
                onChange={(event) =>
                  saveSecondaryCoach(selectedLesson, event.target.value)
                }
              >
                <option value="">Só um treinador</option>
                {coaches
                  .filter((coach) => coach.id !== selectedLesson.coachId)
                  .map((coach) => (
                    <option key={coach.id} value={coach.name}>
                      {coach.name}
                    </option>
                  ))}
              </select>
            </label>

            <CoachAttendancePanel
              lesson={selectedLesson}
              students={students}
              onLessonUpdated={handleLessonUpdated}
              onSaved={() => loadData({ silent: true })}
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

export default CoachDashboard;
