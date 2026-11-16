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
import EmptyState from "../components/EmptyState";
import LoadingBlock from "../components/LoadingBlock";
import { resolveCoachId } from "../utils/coachAccess";
import { formatSessionCoaches } from "../utils/sessionCoaches";
import { matchStudentIdsByNames } from "../utils/studentNameMatch";
import {
  formatTodayLabel,
  getTodayDate,
  getWeekdayKey,
} from "../utils/dateUtils";
import { canFinishLesson } from "../utils/lessonWorkflow";
import { buildCoachAttentionAlerts } from "../utils/coachAttentionAlerts";
import { getVanTasks, getVans } from "../services/vansService";
import { getInventoryItems } from "../services/inventoryService";
import type { InventoryItem } from "../types/inventory";
import type { Van, VanTask } from "../types/van";
import { addVideoAnalysisSession } from "../services/videoAnalysisService";

type Props = {
  user: User;
};

type ExtraSessionKind = "water" | "video";

function CoachDashboard({ user }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [pendingGroup, setPendingGroup] = useState<FixedTraining | null>(null);
  const [creatingExtra, setCreatingExtra] = useState(false);
  const [extraKind, setExtraKind] = useState<ExtraSessionKind | null>(null);
  const [extraTitle, setExtraTitle] = useState("Treino extra");
  const [extraStudentIds, setExtraStudentIds] = useState<string[]>([]);
  const [extraStudentSearch, setExtraStudentSearch] = useState("");
  const [secondaryCoachName, setSecondaryCoachName] = useState("");
  const [videoNotes, setVideoNotes] = useState("");
  const [sessionDate, setSessionDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [fixedTrainings, setFixedTrainings] = useState<FixedTraining[]>([]);
  const [vanTasks, setVanTasks] = useState<VanTask[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

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
        vanTasksData,
        vansData,
        inventoryData,
      ] = await Promise.all([
        getLessons(),
        getStudents(),
        getCoaches(),
        ensureFixedTrainingsSeeded(),
        resolveCoachId(user),
        getVanTasks().catch(() => [] as VanTask[]),
        getVans().catch(() => [] as Van[]),
        getInventoryItems().catch(() => [] as InventoryItem[]),
      ]);

      setCoachId(resolvedCoachId);
      setCoaches(coachesData);
      setFixedTrainings(trainingsData);
      setVanTasks(vanTasksData);
      setVans(vansData);
      setInventoryItems(inventoryData);
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

  function handleStudentUpdated(nextStudent: Student) {
    setStudents((current) =>
      current.map((item) => (item.id === nextStudent.id ? nextStudent : item))
    );
  }

  const todayGroups = useMemo(() => {
    const normalize = (value: string) => value.trim().toLowerCase();
    const myName = normalize(user.name);
    return fixedTrainings
      .filter((group) => group.weekday === weekdayKey)
      .slice()
      .sort((a, b) => {
        const rank = (group: FixedTraining) => {
          if (!group.coachName?.trim()) return 1;
          return normalize(group.coachName) === myName ? 0 : 2;
        };
        const diff = rank(a) - rank(b);
        if (diff !== 0) return diff;
        return a.title.localeCompare(b.title, "pt");
      });
  }, [fixedTrainings, weekdayKey, user.name]);

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

  const attentionAlerts = useMemo(
    () =>
      buildCoachAttentionAlerts({
        user,
        lessons,
        fixedTrainings,
        vanTasks,
        vans,
        inventoryItems,
        today,
      }),
    [user, lessons, fixedTrainings, vanTasks, vans, inventoryItems, today]
  );

  function openGroup(group: FixedTraining) {
    const existing = findSessionForGroup(group);
    if (existing) {
      setSelectedLessonId(existing.id);
      return;
    }

    setSessionDate(today);
    setPendingGroup(group);
    setSecondaryCoachName("");
  }

  function openCreateExtra() {
    setCreatingExtra(true);
    setExtraKind(null);
    setSessionDate(today);
    setExtraTitle("Treino extra");
    setExtraStudentIds([]);
    setExtraStudentSearch("");
    setSecondaryCoachName("");
    setVideoNotes("");
  }

  function closeCreateExtra() {
    setCreatingExtra(false);
    setExtraKind(null);
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
    if (!sessionDate || sessionDate > today) {
      toast.error("A data tem de ser hoje ou um dia anterior.");
      return;
    }

    try {
      setSaving(true);

      const lesson: Lesson = {
        id: crypto.randomUUID(),
        date: sessionDate,
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
      closeCreateExtra();
      setSelectedLessonId(lesson.id);
      toast.success("Treino de água registado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registar o treino extra.");
    } finally {
      setSaving(false);
    }
  }

  async function createVideoSession() {
    if (!coachId) {
      toast.error("Não foi possível identificar o treinador.");
      return;
    }
    if (!sessionDate || sessionDate > today) {
      toast.error("A data tem de ser hoje ou um dia anterior.");
      return;
    }
    if (extraStudentIds.length === 0) {
      toast.error("Escolhe pelo menos um aluno da videoanálise.");
      return;
    }

    try {
      setSaving(true);
      await addVideoAnalysisSession({
        id: crypto.randomUUID(),
        coachId,
        coachName: user.name,
        date: sessionDate,
        notes: videoNotes.trim(),
        studentIds: extraStudentIds,
      });
      closeCreateExtra();
      toast.success("Sessão de videoanálise registada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registar a videoanálise.");
    } finally {
      setSaving(false);
    }
  }

  async function createSession() {
    if (!pendingGroup || !coachId) {
      toast.error("Não foi possível identificar o treinador.");
      return;
    }
    if (!sessionDate || sessionDate > today) {
      toast.error("A data tem de ser hoje ou um dia anterior.");
      return;
    }

    const { matchedIds, unmatchedNames } = matchStudentIdsByNames(
      pendingGroup.students,
      students
    );

    try {
      setSaving(true);

      // Evita duplicar se outro treinador já registou o mesmo grupo nesse dia.
      const latestLessons = await getLessons();
      const alreadyOpen = latestLessons.find(
        (lesson) =>
          lesson.date === sessionDate &&
          lesson.groupName === pendingGroup.title &&
          lesson.status !== "draft"
      );
      if (alreadyOpen) {
        setLessons(latestLessons);
        setPendingGroup(null);
        setSelectedLessonId(alreadyOpen.id);
        toast("Este grupo já estava registado — abrimos a sessão existente.", {
          icon: "ℹ️",
        });
        return;
      }

      const lesson: Lesson = {
        id: crypto.randomUUID(),
        date: sessionDate,
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
        toast.success(
          sessionDate < today
            ? "Treino passado registado. Podes marcar as presenças."
            : "Treino registado. Podes marcar as presenças."
        );
      }
    } catch (error) {
      console.error(error);
      // Corrida: outro coach criou no mesmo instante (índice único).
      try {
        const latestLessons = await getLessons();
        const existing = latestLessons.find(
          (lesson) =>
            lesson.date === sessionDate &&
            lesson.groupName === pendingGroup.title &&
            lesson.status !== "draft"
        );
        if (existing) {
          setLessons(latestLessons);
          setPendingGroup(null);
          setSelectedLessonId(existing.id);
          toast("Este grupo já estava registado — abrimos a sessão existente.", {
            icon: "ℹ️",
          });
          return;
        }
      } catch {
        // ignore
      }
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
    return <LoadingBlock label="A carregar treinos de hoje..." />;
  }

  if (!coachId) {
    return (
      <EmptyState
        title="Conta sem treinador"
        description="Não foi possível ligar esta conta a um treinador. Garante que existes na lista de treinadores."
      />
    );
  }

  return (
    <div className="coach-dashboard-page dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">NextGeneration · {formatTodayLabel()}</p>
        <h1 className="page-title">Treinos de hoje</h1>
        <p className="page-description">
          Escolhe o grupo de hoje, cria um treino extra, ou altera a data no
          registo se te esqueceste de marcar um treino passado.
        </p>
      </header>

      {attentionAlerts.length > 0 && (
        <section className="card section-card admin-attention-card">
          <div className="admin-section-heading">
            <div>
              <span className="admin-section-kicker">Atenção</span>
              <h2>Avisos</h2>
            </div>
            <span className="coach-count-chip">{attentionAlerts.length}</span>
          </div>
          <ul className="admin-alert-list">
            {attentionAlerts.map((alert) => (
              <li key={alert.id}>
                <div className="admin-alert-static">
                  <strong
                    className={
                      alert.severity === "danger"
                        ? "admin-alert-title is-danger"
                        : "admin-alert-title"
                    }
                  >
                    {alert.text}
                  </strong>
                  {alert.detail ? (
                    <span className="admin-alert-detail">{alert.detail}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
          <EmptyState
            title="Sem grupos para hoje"
            description="Não há grupos fixos neste dia. Usa + para registar um treino extra."
            action={
              <button
                type="button"
                className="primary-btn"
                onClick={openCreateExtra}
              >
                Criar treino extra
              </button>
            }
          />
        ) : (
          <div className="coach-session-list">
            {todayGroups.map((group) => {
              const session = findSessionForGroup(group);
              const presentCount = session
                ? session.presentStudentIds.filter((id) =>
                    session.bookedStudentIds.includes(id)
                  ).length
                : 0;
              const assignedCoach = group.coachName?.trim();

              return (
                <button
                  type="button"
                  className="coach-session-card"
                  key={group.id}
                  onClick={() => openGroup(group)}
                >
                  <div className="coach-session-card-main">
                    <strong>{group.title}</strong>
                    <span>
                      {group.students.length} alunos fixos
                      {assignedCoach ? ` · ${assignedCoach}` : ""}
                    </span>
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
        <Modal
          title={
            extraKind === "video"
              ? "Videoanálise"
              : extraKind === "water"
                ? "Treino de água"
                : "Novo treino"
          }
          onClose={closeCreateExtra}
        >
          <div className="coach-session-modal">
            {extraKind === null ? (
              <>
                <p className="muted">
                  Que tipo de sessão queres registar para este dia?
                </p>
                <div className="coach-extra-kind-picker">
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => setExtraKind("water")}
                  >
                    Treino de água
                  </button>
                  <button
                    type="button"
                    className="compact-btn"
                    onClick={() => setExtraKind("video")}
                  >
                    Videoanálise
                  </button>
                </div>
              </>
            ) : null}

            {extraKind === "water" ? (
              <>
                <p className="muted">
                  Regista um treino de água fora dos grupos fixos e indica quem
                  foi. Podes escolher um dia anterior se foi esquecimento.
                </p>

                <button
                  type="button"
                  className="compact-btn"
                  onClick={() => setExtraKind(null)}
                >
                  ← Mudar tipo
                </button>

                <label className="field-label">
                  Data do treino
                  <input
                    type="date"
                    value={sessionDate}
                    max={today}
                    onChange={(event) => setSessionDate(event.target.value)}
                  />
                </label>

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
                    onChange={(event) =>
                      setSecondaryCoachName(event.target.value)
                    }
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
                    onChange={(event) =>
                      setExtraStudentSearch(event.target.value)
                    }
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
                  {saving ? "A registar..." : "Registar treino de água"}
                </button>
              </>
            ) : null}

            {extraKind === "video" ? (
              <>
                <p className="muted">
                  Regista uma sessão de videoanálise. Aparece em Os meus
                  treinos / relatório mensal.
                </p>

                <button
                  type="button"
                  className="compact-btn"
                  onClick={() => setExtraKind(null)}
                >
                  ← Mudar tipo
                </button>

                <label className="field-label">
                  Data da sessão
                  <input
                    type="date"
                    value={sessionDate}
                    max={today}
                    onChange={(event) => setSessionDate(event.target.value)}
                  />
                </label>

                <label className="field-label">
                  Quem esteve na videoanálise
                  <input
                    className="search-input"
                    value={extraStudentSearch}
                    onChange={(event) =>
                      setExtraStudentSearch(event.target.value)
                    }
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

                <label className="field-label">
                  Notas (opcional)
                  <textarea
                    rows={3}
                    value={videoNotes}
                    onChange={(event) => setVideoNotes(event.target.value)}
                    placeholder="Ex: revisão de bottom turn, foco em timing..."
                  />
                </label>

                <button
                  type="button"
                  className="primary-btn"
                  disabled={saving}
                  onClick={createVideoSession}
                >
                  {saving ? "A registar..." : "Registar videoanálise"}
                </button>
              </>
            ) : null}
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
              Vais registar este grupo como <strong>{user.name}</strong>. Se te
              esqueceste, escolhe a data real do treino (hoje ou anterior).
            </p>

            <label className="field-label">
              Data do treino
              <input
                type="date"
                value={sessionDate}
                max={today}
                onChange={(event) => setSessionDate(event.target.value)}
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
              onStudentUpdated={handleStudentUpdated}
              onSaved={() => loadData({ silent: true })}
            />

            {selectedLesson.status === "finished" ? (
              <div className="coach-session-sticky-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={async () => {
                    try {
                      await updateLesson({
                        ...selectedLesson,
                        status: "published",
                      });
                      await loadData({ silent: true });
                      toast.success("Treino reaberto como registado.");
                    } catch (error) {
                      console.error(error);
                      toast.error("Erro ao reabrir treino.");
                    }
                  }}
                >
                  Reabrir (voltar a registado)
                </button>
              </div>
            ) : (
              canFinishLesson(selectedLesson) && (
                <div className="coach-session-sticky-actions">
                  <button
                    type="button"
                    className="compact-btn"
                    onClick={() => finishLesson(selectedLesson)}
                  >
                    Concluir treino
                  </button>
                </div>
              )
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CoachDashboard;
