import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons, updateLesson } from "../services/lessonsService";
import CoachAttendancePanel from "../components/CoachAttendancePanel";
import LessonsCalendar from "../components/LessonsCalendar";
import {
  DetailPanel,
  DetailPanelEmpty,
  SelectionList,
  SelectionListItem,
} from "../components/MasterDetailLayout";
import { formatCalendarDayLabel, pickInitialCalendarDate } from "../utils/calendarUtils";
import { canFinishLesson, canMarkAttendance } from "../utils/lessonWorkflow";

type Props = {
  user: User;
};

function CoachArea({ user }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
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

  function handleSelectDay(dayLessons: Lesson[], date: string) {
    setSelectedDate(date);
    setSelectedLessonId(dayLessons[0]?.id ?? null);
  }

  const calendarLessons = lessons.filter((lesson) => lesson.status !== "draft");
  const selectedDayLessons = selectedDate
    ? calendarLessons.filter((lesson) => lesson.date === selectedDate)
    : [];
  const selectedLesson =
    selectedDayLessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  function renderLessonDetail(lesson: Lesson) {
    const presentCount = lesson.presentStudentIds.filter((id) =>
      lesson.bookedStudentIds.includes(id)
    ).length;

    return (
      <div className="coach-lesson-card">
        <div className="coach-lesson-header">
          <div>
            <p>{lesson.beach || "Praia por definir"}</p>
            {lesson.van ? <p>Carrinha: {lesson.van}</p> : null}
            <p>
              Estado:{" "}
              {lesson.status === "published" ? "Agendado" : "Concluído"}
            </p>
            <p>
              Presenças: {presentCount}/{lesson.bookedStudentIds.length}
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

        <section className="coach-lesson-section">
          <h4>
            Presenças e faltas
            {!canMarkAttendance(lesson) ? " (ainda não disponível)" : ""}
          </h4>
          <CoachAttendancePanel
            lesson={lesson}
            students={students}
            onSaved={loadData}
          />
        </section>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Os meus treinos</h1>

      {loading ? (
        <p className="muted">A carregar treinos...</p>
      ) : (
        <>
          <div className="workflow-help">
            <p>
              Escolhe o dia, abre o treino e regista as presenças e faltas dos
              alunos.
            </p>
          </div>

          <div className="lessons-calendar-layout lessons-calendar-layout-triple">
            <LessonsCalendar
              lessons={calendarLessons}
              selectedDate={selectedDate}
              onSelectDay={handleSelectDay}
              title="Calendário"
            />

            <SelectionList
              title={selectedDate ? formatCalendarDayLabel(selectedDate) : "Treinos do dia"}
              empty={
                selectedDate ? (
                  <p className="muted">Sem treinos neste dia.</p>
                ) : (
                  <p className="muted">Seleciona um dia no calendário.</p>
                )
              }
            >
              {selectedDayLessons.map((lesson) => (
                <SelectionListItem
                  key={lesson.id}
                  active={lesson.id === selectedLessonId}
                  onClick={() => setSelectedLessonId(lesson.id)}
                  title={`${lesson.groupName || "Treino"}${lesson.time ? ` · ${lesson.time}` : ""}`}
                  subtitle={lesson.beach || "Praia por definir"}
                  meta={lesson.status === "finished" ? "Concluído" : "Agendado"}
                />
              ))}
            </SelectionList>

            {selectedLesson ? (
              <DetailPanel
                title={`${selectedLesson.groupName || "Treino"}${selectedLesson.time ? ` · ${selectedLesson.time}` : ""}`}
                onBack={() => setSelectedLessonId(null)}
              >
                {renderLessonDetail(selectedLesson)}
              </DetailPanel>
            ) : (
              <DetailPanelEmpty message="Seleciona um treino da lista." />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CoachArea;
