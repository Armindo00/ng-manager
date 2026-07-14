import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, LessonResponse, Student, User } from "../types";
import { getLessons, updateLesson } from "../services/lessonsService";
import { declineLessonWithCompensation } from "../services/compensationsService";
import { loadStudentView } from "../utils/studentView";
import LessonsCalendar from "../components/LessonsCalendar";
import StudentLessonResponseModal from "../components/StudentLessonResponseModal";
import {
  DetailPanel,
  DetailPanelEmpty,
  SelectionList,
  SelectionListItem,
} from "../components/MasterDetailLayout";
import {
  formatCalendarDayLabel,
  pickInitialCalendarDate,
} from "../utils/calendarUtils";
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
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [savingResponse, setSavingResponse] = useState(false);

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
      setSelectedLesson(null);

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

  async function declineLesson(lesson: Lesson, reason: string) {
    try {
      setSavingResponse(true);
      await declineLessonWithCompensation(lesson, studentId, reason);
      await loadData();
      setSelectedLesson(null);
      toast.success(
        "Ausência registada. O admin vai validar a justificação para compensação."
      );
    } catch (saveError) {
      console.error(saveError);
      toast.error("Erro ao registar ausência.");
    } finally {
      setSavingResponse(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Calendário</h1>

      <div className="lessons-calendar-layout lessons-calendar-layout-triple">
        <LessonsCalendar
          lessons={lessons}
          selectedDate={selectedDate}
          onSelectDay={(dayLessons, date) => {
            setSelectedDate(date);
            setSelectedLesson(dayLessons[0] ?? null);
          }}
          title="Os meus treinos"
          studentId={studentId}
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
          {selectedDayLessons.map((lesson) => {
            const response = getResponse(lesson);
            const status = getResponseStatusLabel(response);

            return (
              <SelectionListItem
                key={lesson.id}
                active={selectedLesson?.id === lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                title={`${lesson.groupName || "Treino"}${lesson.time ? ` · ${lesson.time}` : ""}`}
                subtitle={lesson.beach || "Praia por definir"}
                meta={`👨‍🏫 ${lesson.coachName}`}
                badge={
                  <span className={`coach-response-badge ${status.className}`}>
                    {status.label}
                  </span>
                }
              />
            );
          })}
        </SelectionList>

        {selectedLesson ? (
          <DetailPanel
            title="Resposta ao treino"
            onBack={() => setSelectedLesson(null)}
          >
            <StudentLessonResponseModal
              inline
              lesson={selectedLesson}
              student={student}
              existingResponse={getResponse(selectedLesson)}
              saving={savingResponse}
              onClose={() => setSelectedLesson(null)}
              onSubmit={(response) => saveLessonResponse(selectedLesson, response)}
              onDecline={(reason) => declineLesson(selectedLesson, reason)}
            />
          </DetailPanel>
        ) : (
          <DetailPanelEmpty message="Seleciona um treino da lista." />
        )}
      </div>
    </div>
  );
}

export default StudentCalendar;
