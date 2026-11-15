import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, Lesson, Student, User } from "../types";
import type { FixedTraining } from "../data/fixedTrainings";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import {
  addLesson,
  deleteLesson,
  getLessons,
} from "../services/lessonsService";
import { ensureFixedTrainingsSeeded } from "../services/fixedTrainingsService";
import LessonDetailCard from "../components/LessonDetailCard";
import LessonsCalendar from "../components/LessonsCalendar";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import { formatCalendarDayLabel } from "../utils/calendarUtils";
import {
  buildMonthCalendarEntries,
  statusLabelForEntry,
  type CalendarEntry,
} from "../utils/fixedScheduleCalendar";
import { getTodayDate } from "../utils/dateUtils";
import {
  matchStudentIdsByNames,
  namesMatchLoose,
} from "../utils/studentNameMatch";
import { resolveCoachId } from "../utils/coachAccess";

type Props = {
  user: User;
};

function resolveCoachForGroup(
  coaches: Coach[],
  preferredName?: string
): Coach | null {
  if (coaches.length === 0) return null;
  if (preferredName?.trim()) {
    const matched = coaches.find((coach) =>
      namesMatchLoose(coach.name, preferredName)
    );
    if (matched) return matched;
  }
  return coaches[0];
}

function AdminLessons({ user }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [fixedTrainings, setFixedTrainings] = useState<FixedTraining[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [actingCoachId, setActingCoachId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id, user.role, user.name]);

  async function loadData() {
    try {
      setLoading(true);
      const [
        studentsData,
        coachesData,
        lessonsData,
        trainingsData,
        resolvedCoachId,
      ] = await Promise.all([
        getStudents(),
        getCoaches(),
        getLessons(),
        ensureFixedTrainingsSeeded(),
        resolveCoachId(user),
      ]);
      setStudents(studentsData);
      setCoaches(coachesData);
      setLessons(lessonsData);
      setFixedTrainings(trainingsData);
      setActingCoachId(resolvedCoachId);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar calendário.");
    } finally {
      setLoading(false);
    }
  }

  const selectedDayEntries = useMemo(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    return buildMonthCalendarEntries({
      year,
      month,
      lessons,
      fixedTrainings,
      includePlanned: true,
    }).filter((entry) => entry.date === selectedDate);
  }, [selectedDate, lessons, fixedTrainings]);

  const monthStats = useMemo(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    const entries = buildMonthCalendarEntries({
      year,
      month,
      lessons,
      fixedTrainings,
      includePlanned: true,
    });
    return {
      planned: entries.filter((entry) => entry.status === "planned").length,
      registered: entries.filter(
        (entry) =>
          entry.status === "published" || entry.status === "finished"
      ).length,
      finished: entries.filter((entry) => entry.status === "finished").length,
    };
  }, [selectedDate, lessons, fixedTrainings]);

  const today = getTodayDate();

  function handleSelectDay(entries: CalendarEntry[], date: string) {
    setSelectedDate(date);
    const withLesson = entries.filter((entry) => entry.lesson);
    if (withLesson.length === 1 && withLesson[0].lesson) {
      setSelectedLesson(withLesson[0].lesson);
    } else {
      setSelectedLesson(null);
    }
  }

  async function confirmDeleteLesson() {
    if (!lessonToDelete) return;

    try {
      await deleteLesson(lessonToDelete.id);
      if (selectedLesson?.id === lessonToDelete.id) {
        setSelectedLesson(null);
      }
      await loadData();
      setLessonToDelete(null);
      toast.success("Treino eliminado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar treino.");
    }
  }

  async function registerPlannedEntry(entry: CalendarEntry) {
    if (entry.date > today) {
      toast.error(
        "Só podes registar treinos de hoje ou de dias anteriores (esquecimento)."
      );
      return;
    }

    const group = fixedTrainings.find(
      (training) => training.id === entry.fixedTrainingId
    );
    if (!group) {
      toast.error("Grupo fixo não encontrado.");
      return;
    }

    const selfCoach =
      actingCoachId != null
        ? coaches.find((coach) => coach.id === actingCoachId) || null
        : null;
    const coach =
      user.role === "coach"
        ? selfCoach ||
          coaches.find((item) => namesMatchLoose(item.name, user.name)) ||
          null
        : resolveCoachForGroup(coaches, group.coachName || entry.coachName);
    if (!coach) {
      toast.error("Não há treinadores para associar ao treino.");
      return;
    }

    try {
      setRegisteringId(entry.id);

      const latestLessons = await getLessons();
      const alreadyOpen = latestLessons.find(
        (lesson) =>
          lesson.date === entry.date &&
          lesson.groupName === group.title &&
          lesson.status !== "draft"
      );
      if (alreadyOpen) {
        setLessons(latestLessons);
        setSelectedLesson(alreadyOpen);
        toast("Este grupo já estava registado — abrimos a sessão.", {
          icon: "ℹ️",
        });
        return;
      }

      const { matchedIds, unmatchedNames } = matchStudentIdsByNames(
        group.students,
        students
      );

      const lesson: Lesson = {
        id: crypto.randomUUID(),
        date: entry.date,
        time: "",
        beach: "",
        status: "published",
        groupName: group.title,
        coachId: coach.id,
        coachName: coach.name,
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
      setSelectedLesson(lesson);

      if (unmatchedNames.length > 0) {
        toast.error(
          `Sessão registada. ${unmatchedNames.length} aluno(s) da escala ainda não existem na app.`
        );
      } else {
        toast.success(
          entry.date < today
            ? "Treino passado registado. Podes marcar as presenças."
            : "Treino registado. Podes marcar as presenças."
        );
      }
    } catch (error) {
      console.error(error);
      try {
        const latestLessons = await getLessons();
        const existing = latestLessons.find(
          (lesson) =>
            lesson.date === entry.date &&
            lesson.groupName === group.title &&
            lesson.status !== "draft"
        );
        if (existing) {
          setLessons(latestLessons);
          setSelectedLesson(existing);
          toast("Este grupo já estava registado — abrimos a sessão.", {
            icon: "ℹ️",
          });
          return;
        }
      } catch {
        // ignore
      }
      toast.error("Erro ao registar o treino.");
    } finally {
      setRegisteringId(null);
    }
  }

  async function closeLessonModal() {
    setSelectedLesson(null);
    await loadData();
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Operação</p>
        <h1 className="page-title">Calendário</h1>
        <p className="page-description">
          Vê todos os treinos do dia, edita registos e marca presenças — inclusive
          de sessões passadas se o treinador se esqueceu de registar.
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar calendário...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Na escala (por registar)</span>
              <strong className="stat-number">{monthStats.planned}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Registados</span>
              <strong className="stat-number">{monthStats.registered}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Concluídos</span>
              <strong className="stat-number">{monthStats.finished}</strong>
            </div>
          </div>

          <div className="calendar-wrapper">
            <LessonsCalendar
              lessons={lessons}
              fixedTrainings={fixedTrainings}
              selectedDate={selectedDate}
              onSelectDay={handleSelectDay}
              title="Escala e treinos registados"
            />
          </div>

          <div className="card section-card">
            <h2>{formatCalendarDayLabel(selectedDate)}</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              {selectedDayEntries.length} treino
              {selectedDayEntries.length === 1 ? "" : "s"} neste dia
              {selectedDate < today
                ? " (passado — podes registar ou editar)"
                : selectedDate === today
                  ? " (hoje)"
                  : " (futuro — registo só no dia ou depois)"}
              .
            </p>

            {selectedDayEntries.length === 0 ? (
              <p className="muted">Sem grupos neste dia.</p>
            ) : (
              <div className="coach-session-list">
                {selectedDayEntries.map((entry) => {
                  const canRegisterPastOrToday =
                    entry.status === "planned" && entry.date <= today;

                  return (
                    <div
                      className="coach-session-card coach-session-card-static"
                      key={entry.id}
                    >
                      <div className="coach-session-card-main">
                        <strong>{entry.title}</strong>
                        <span>
                          {entry.coachName}
                          {entry.secondaryCoachName
                            ? ` + ${entry.secondaryCoachName}`
                            : ""}
                        </span>
                        <span>
                          {entry.studentCount} aluno
                          {entry.studentCount === 1 ? "" : "s"}
                          {entry.time ? ` · ${entry.time}` : ""}
                        </span>
                      </div>

                      <div className="calendar-entry-actions">
                        <span
                          className={`coach-session-card-status${
                            entry.status === "finished"
                              ? " status-finished"
                              : entry.status === "published"
                                ? " ready"
                                : ""
                          }`}
                        >
                          {statusLabelForEntry(entry)}
                        </span>

                        {entry.lesson && (
                          <>
                            <button
                              type="button"
                              className="primary-btn compact-btn"
                              onClick={() => setSelectedLesson(entry.lesson!)}
                            >
                              Editar / Presenças
                            </button>
                            {(user.role === "admin" ||
                              entry.lesson.coachId === actingCoachId) && (
                              <button
                                type="button"
                                className="danger-btn compact-btn"
                                onClick={() => setLessonToDelete(entry.lesson!)}
                              >
                                Apagar
                              </button>
                            )}
                          </>
                        )}

                        {canRegisterPastOrToday && (
                          <button
                            type="button"
                            className="primary-btn compact-btn"
                            disabled={registeringId === entry.id}
                            onClick={() => registerPlannedEntry(entry)}
                          >
                            {registeringId === entry.id
                              ? "A registar..."
                              : entry.date < today
                                ? "Registar (esquecimento)"
                                : "Registar e marcar"}
                          </button>
                        )}

                        {entry.status === "planned" && entry.date > today && (
                          <span className="muted">
                            Disponível no dia do treino
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {selectedLesson && (
        <Modal title="Ficha do treino" onClose={closeLessonModal}>
          <LessonDetailCard lesson={selectedLesson} students={students} />
        </Modal>
      )}

      {lessonToDelete && (
        <ConfirmDialog
          title="Eliminar treino"
          message="Apagar este treino registado? Esta ação não pode ser anulada."
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDeleteLesson}
          onCancel={() => setLessonToDelete(null)}
        />
      )}
    </div>
  );
}

export default AdminLessons;
