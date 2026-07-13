import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, LessonResponse, Student, User } from "../types";
import { getLessons, updateLesson } from "../services/lessonsService";
import { loadStudentView } from "../utils/studentView";
import { formatStudentResponseSummary } from "../utils/lessonResponse";
import { isLessonPlanSent } from "../utils/lessonWorkflow";
import {
  formatCalendarDayLabel,
  pickInitialCalendarDate,
} from "../utils/calendarUtils";
import StudentLessonResponseModal from "../components/StudentLessonResponseModal";
import LessonsCalendar from "../components/LessonsCalendar";

type Props = {
  user: User;
};

function StudentArea({ user }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseLesson, setResponseLesson] = useState<Lesson | null>(null);
  const [savingResponse, setSavingResponse] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id, user.studentId]);

  async function loadData() {
    try {
      setLoading(true);

      const studentResult = await loadStudentView(user);

      if (!studentResult.student) {
        setStudent(null);
        setLessons([]);
        setError(studentResult.error);
        return;
      }

      const lessonsData = await getLessons();
      const foundStudent = studentResult.student;

      const myLessonsData = lessonsData
        .filter(
          (lesson) =>
            lesson.status === "published" &&
            lesson.bookedStudentIds.includes(foundStudent.id)
        )
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

      setStudent(foundStudent);
      setError(null);
      setLessons(myLessonsData);
      setSelectedDate(
        (current) => current ?? pickInitialCalendarDate(myLessonsData)
      );
    } catch (loadError) {
      console.error(loadError);
      toast.error("Erro ao carregar treinos.");
      setError("Erro ao carregar treinos.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="muted">A carregar...</p>;
  if (!student) return <p>{error || "Aluno não encontrado."}</p>;

  const studentId = student.id;

  const attended = lessons.filter((lesson) =>
    lesson.presentStudentIds.includes(studentId)
  );

  function getResponse(lesson: Lesson) {
    return lesson.responses?.find((response) => response.studentId === studentId);
  }

  function handleSelectDay(_dayLessons: Lesson[], date: string) {
    setSelectedDate(date);
  }

  const selectedDayLessons = selectedDate
    ? lessons.filter((lesson) => lesson.date === selectedDate)
    : [];

  const pendingDayLessons = selectedDayLessons.filter((lesson) => !getResponse(lesson));
  const confirmedDayLessons = selectedDayLessons.filter(
    (lesson) => getResponse(lesson)?.status === "confirmed"
  );
  const declinedDayLessons = selectedDayLessons.filter(
    (lesson) => getResponse(lesson)?.status === "declined"
  );

  async function saveLessonResponse(lesson: Lesson, response: LessonResponse) {
    const filteredResponses = (lesson.responses || []).filter(
      (item) => item.studentId !== studentId
    );

    const updatedLesson: Lesson = {
      ...lesson,
      responses: [...filteredResponses, response],
    };

    try {
      setSavingResponse(true);
      await updateLesson(updatedLesson);
      await loadData();
      setResponseLesson(null);

      toast.success(
        response.status === "confirmed"
          ? "Resposta enviada ao treinador."
          : "Marcaste que não vais."
      );
    } catch (saveError) {
      console.error(saveError);
      toast.error("Erro ao guardar resposta.");
    } finally {
      setSavingResponse(false);
    }
  }

  async function declineLesson(lesson: Lesson) {
    await saveLessonResponse(lesson, {
      studentId,
      status: "declined",
      transportType: "pickup",
      pickupLocation: "",
      availableFrom: "",
      material: {
        softboard: false,
        fiberBoard: false,
        wetsuit: false,
        lycra: false,
        leash: false,
        vest: false,
        other: "",
      },
      notes: "",
    });
  }

  function renderLessonCard(lesson: Lesson, options?: { allowEdit?: boolean }) {
    const response = getResponse(lesson);
    const isConfirmed = response?.status === "confirmed";
    const isDeclined = response?.status === "declined";
    const summary = response ? formatStudentResponseSummary(response) : [];

    return (
      <div className="lesson-card student-lesson-card" key={lesson.id}>
        <div>
          <h3>
            {lesson.groupName || "Treino"}
            {lesson.time ? ` · ${lesson.time}` : ""}
          </h3>

          <p>🏖️ {lesson.beach || "Praia por definir pelo treinador"}</p>
          <p>🕒 Chegada à praia: {lesson.time || "Por definir pelo treinador"}</p>
          <p>👨‍🏫 Treinador: {lesson.coachName}</p>
          <p>🚐 Carrinha: {lesson.van || "Por definir"}</p>

          {isLessonPlanSent(lesson) ? (
            <>
              {(lesson.coachPickups || []).length > 0 && (
                <div className="student-plan-pickups">
                  <strong>Pickups do treinador:</strong>
                  {(lesson.coachPickups || []).map((pickup) => (
                    <p key={pickup.id}>
                      {pickup.time} — {pickup.location}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            isConfirmed && (
              <p className="student-plan-pending">
                O treinador ainda não enviou o plano final (praia/hora/pickups).
              </p>
            )
          )}

          {isConfirmed && <p className="student-status confirmed">✅ Vou</p>}
          {isDeclined && <p className="student-status declined">❌ Não vou</p>}
          {!isConfirmed && !isDeclined && (
            <p className="student-status pending">⏳ Por responder</p>
          )}

          {isConfirmed && summary.length > 0 && (
            <div className="student-response-summary">
              {summary.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </div>

        <div className="student-lesson-actions">
          {!isConfirmed && !isDeclined && (
            <>
              <button
                className="primary-btn"
                onClick={() => setResponseLesson(lesson)}
              >
                ✅ Vou
              </button>

              <button
                className="danger-btn"
                onClick={() => declineLesson(lesson)}
              >
                ❌ Não vou
              </button>
            </>
          )}

          {options?.allowEdit && isConfirmed && (
            <button
              className="compact-btn"
              onClick={() => setResponseLesson(lesson)}
            >
              Editar resposta
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Os meus treinos</h1>

      <div className="stats-grid">
        <div className="card">
          <span className="stat-label">Nome</span>
          <strong className="stat-number small">{student.name}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Treinos permitidos</span>
          <strong className="stat-number">{student.monthlyLimit}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Treinos realizados</span>
          <strong className="stat-number">{attended.length}</strong>
        </div>
      </div>

      <div className="lessons-calendar-layout">
        <LessonsCalendar
          lessons={lessons}
          selectedDate={selectedDate}
          onSelectDay={handleSelectDay}
          title="Calendário"
          studentId={studentId}
        />

        <div className="calendar-day-panel card section-card">
          {selectedDate ? (
            <>
              <h2>{formatCalendarDayLabel(selectedDate)}</h2>

              {selectedDayLessons.length === 0 && (
                <p className="muted">Sem treinos neste dia.</p>
              )}

              {pendingDayLessons.length > 0 && (
                <section className="calendar-day-section">
                  <h3>⏳ Por responder</h3>
                  <div className="lesson-list">
                    {pendingDayLessons.map((lesson) => renderLessonCard(lesson))}
                  </div>
                </section>
              )}

              {confirmedDayLessons.length > 0 && (
                <section className="calendar-day-section">
                  <h3>✅ Vou</h3>
                  <div className="lesson-list">
                    {confirmedDayLessons.map((lesson) =>
                      renderLessonCard(lesson, { allowEdit: true })
                    )}
                  </div>
                </section>
              )}

              {declinedDayLessons.length > 0 && (
                <section className="calendar-day-section">
                  <h3>❌ Não vou</h3>
                  <div className="lesson-list">
                    {declinedDayLessons.map((lesson) => renderLessonCard(lesson))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <p className="muted">Seleciona um dia no calendário.</p>
          )}
        </div>
      </div>

      {responseLesson && (
        <StudentLessonResponseModal
          lesson={responseLesson}
          student={student}
          existingResponse={getResponse(responseLesson)}
          saving={savingResponse}
          onClose={() => setResponseLesson(null)}
          onSubmit={(response) => saveLessonResponse(responseLesson, response)}
        />
      )}
    </div>
  );
}

export default StudentArea;
