import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons, updateLesson } from "../services/lessonsService";
import CoachLessonSetup from "../components/CoachLessonSetup";
import CoachStudentResponsesPanel from "../components/CoachStudentResponsesPanel";
import CoachAttendancePanel from "../components/CoachAttendancePanel";
import LessonsCalendar from "../components/LessonsCalendar";
import { formatCalendarDayLabel, pickInitialCalendarDate } from "../utils/calendarUtils";
import { canFinishLesson, canMarkAttendance } from "../utils/lessonWorkflow";

type Props = {
  user: User;
};

function CoachArea({ user }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [studentsData, lessonsData] = await Promise.all([
        getStudents(),
        getLessons(),
      ]);

      const coachLessons = lessonsData
        .filter((lesson) => lesson.coachId === user.id)
        .sort((a, b) =>
          `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
        );

      setStudents(studentsData);
      setLessons(coachLessons);
      setSelectedDate(
        (current) => current ?? pickInitialCalendarDate(coachLessons)
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinos.");
    } finally {
      setLoading(false);
    }
  }

  async function finishLesson(lessonId: string) {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson || !canFinishLesson(lesson)) {
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

  function handleSelectDay(_dayLessons: Lesson[], date: string) {
    setSelectedDate(date);
  }

  const calendarLessons = lessons.filter((lesson) => lesson.status !== "draft");
  const selectedDayLessons = selectedDate
    ? calendarLessons.filter((lesson) => lesson.date === selectedDate)
    : [];

  return (
    <div>
      <h1 className="page-title">Os meus treinos</h1>

      {loading ? (
        <p className="muted">A carregar treinos...</p>
      ) : (
        <>
      <div className="workflow-help">
        <p>
          Usa o <strong>calendário</strong> para escolher o dia. Antes do treino envia
          o plano; no dia marca presenças.
        </p>
      </div>

      <div className="lessons-calendar-layout">
        <LessonsCalendar
          lessons={calendarLessons}
          selectedDate={selectedDate}
          onSelectDay={handleSelectDay}
          title="Calendário"
        />

        <div className="calendar-day-panel card section-card">
          {selectedDate ? (
            <>
              <h2>{formatCalendarDayLabel(selectedDate)}</h2>

              {selectedDayLessons.length === 0 && (
                <p className="muted">Sem treinos neste dia.</p>
              )}

              <div className="lesson-list coach-lesson-list">
                {selectedDayLessons.map((lesson) => (
                  <div className="lesson-card coach-lesson-card" key={lesson.id}>
                    <div className="coach-lesson-header">
                      <div>
                        <h3>
                          {lesson.groupName || "Treino"}
                          {lesson.time ? ` · ${lesson.time}` : ""}
                        </h3>

                        <p>🏖️ {lesson.beach || "Praia por definir"}</p>
                        <p>🚐 Carrinha: {lesson.van}</p>
                        <p>
                          Estado:{" "}
                          {lesson.status === "published" ? "Publicado" : "Concluído"}
                        </p>
                      </div>

                      {canFinishLesson(lesson) && (
                        <button
                          className="primary-btn compact-btn"
                          onClick={() => finishLesson(lesson.id)}
                        >
                          Finalizar treino
                        </button>
                      )}
                    </div>

                    {lesson.status !== "finished" && (
                      <>
                        <section className="coach-lesson-section">
                          <h4>1. Respostas dos alunos</h4>
                          <CoachStudentResponsesPanel
                            lesson={lesson}
                            students={students}
                          />
                        </section>

                        <section className="coach-lesson-section">
                          <h4>2. Enviar plano (antes do treino)</h4>
                          <CoachLessonSetup lesson={lesson} onSaved={loadData} />

                          <div className="coach-planned-pickups">
                            <strong>Pickups enviados</strong>
                            {(lesson.coachPickups || []).length === 0 ? (
                              <p className="muted">Ainda não enviaste pickups.</p>
                            ) : (
                              (lesson.coachPickups || []).map((pickup) => (
                                <p key={pickup.id}>
                                  {pickup.time} — {pickup.location}
                                </p>
                              ))
                            )}
                          </div>
                        </section>

                        <section className="coach-lesson-section">
                          <h4>
                            3. Presenças{" "}
                            {canMarkAttendance(lesson) ? "(disponível)" : "(bloqueado)"}
                          </h4>
                          <CoachAttendancePanel
                            lesson={lesson}
                            students={students}
                            onSaved={loadData}
                          />
                        </section>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Seleciona um dia no calendário.</p>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default CoachArea;
