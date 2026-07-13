import { useEffect, useState } from "react";
import type { Lesson, Student, User } from "../types";
import { getLessons } from "../services/lessonsService";
import { loadStudentView } from "../utils/studentView";
import LessonsCalendar from "../components/LessonsCalendar";
import {
  formatCalendarDayLabel,
  pickInitialCalendarDate,
} from "../utils/calendarUtils";
import { isLessonPlanSent } from "../utils/lessonWorkflow";
import { getResponseStatusLabel } from "../utils/lessonResponse";

type Props = {
  user: User;
};

function StudentCalendar({ user }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id, user.studentId]);

  async function loadData() {
    setLoading(true);

    const studentResult = await loadStudentView(user);
    const lessonsData = await getLessons();

    if (!studentResult.student) {
      setStudent(null);
      setLessons([]);
      setError(studentResult.error);
      setLoading(false);
      return;
    }

    const foundStudent = studentResult.student;
    const myLessons = lessonsData
      .filter(
        (lesson) =>
          lesson.bookedStudentIds.includes(foundStudent.id) &&
          lesson.status !== "draft"
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    setStudent(foundStudent);
    setError(null);
    setLessons(myLessons);
    setSelectedDate((current) => current ?? pickInitialCalendarDate(myLessons));
    setLoading(false);
  }

  if (loading) return <p className="muted">A carregar...</p>;
  if (!student) return <p>{error || "Aluno não encontrado."}</p>;

  const studentId = student.id;

  const selectedDayLessons = selectedDate
    ? lessons.filter((lesson) => lesson.date === selectedDate)
    : [];

  function getResponse(lesson: Lesson) {
    return lesson.responses?.find(
      (response) => response.studentId === studentId
    );
  }

  return (
    <div>
      <h1 className="page-title">Calendário</h1>

      <div className="lessons-calendar-layout lessons-calendar-layout-single">
        <LessonsCalendar
          lessons={lessons}
          selectedDate={selectedDate}
          onSelectDay={(_dayLessons, date) => setSelectedDate(date)}
          title="Os meus treinos"
          studentId={studentId}
        />

        <div className="calendar-day-panel card section-card">
          {selectedDate ? (
            <>
              <h2>{formatCalendarDayLabel(selectedDate)}</h2>

              {selectedDayLessons.length === 0 && (
                <p className="muted">Sem treinos neste dia.</p>
              )}

              <div className="calendar-day-lessons-list">
                {selectedDayLessons.map((lesson) => {
                  const response = getResponse(lesson);
                  const status = getResponseStatusLabel(response);

                  return (
                    <div className="calendar-day-lesson-row" key={lesson.id}>
                      <strong>
                        {lesson.groupName || "Treino"}
                        {lesson.time ? ` · ${lesson.time}` : ""}
                      </strong>
                      <span>{lesson.beach || "Praia por definir"}</span>
                      <span>👨‍🏫 {lesson.coachName}</span>
                      <span className={`coach-response-badge ${status.className}`}>
                        {status.label}
                      </span>
                      {isLessonPlanSent(lesson) &&
                        (lesson.coachPickups || []).map((pickup) => (
                          <small key={pickup.id}>
                            Pickup: {pickup.time} — {pickup.location}
                          </small>
                        ))}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="muted">Seleciona um dia no calendário.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentCalendar;
