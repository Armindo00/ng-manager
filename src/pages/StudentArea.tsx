import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, LessonResponse, Student, User } from "../types";
import { getLessons, updateLesson } from "../services/lessonsService";
import { declineLessonWithCompensation } from "../services/compensationsService";
import { loadStudentView } from "../utils/studentView";
import { getResponseStatusLabel } from "../utils/lessonResponse";
import {
  formatCalendarDayLabel,
  pickInitialCalendarDate,
} from "../utils/calendarUtils";
import StudentLessonResponseModal from "../components/StudentLessonResponseModal";
import LessonsCalendar from "../components/LessonsCalendar";
import {
  DetailPanel,
  DetailPanelEmpty,
  SelectionList,
  SelectionListItem,
} from "../components/MasterDetailLayout";

type Props = {
  user: User;
};

function StudentArea({ user }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
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

  function handleSelectDay(dayLessons: Lesson[], date: string) {
    setSelectedDate(date);
    setSelectedLesson(dayLessons[0] ?? null);
  }

  const selectedDayLessons = selectedDate
    ? lessons.filter((lesson) => lesson.date === selectedDate)
    : [];

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

      <div className="lessons-calendar-layout lessons-calendar-layout-triple">
        <LessonsCalendar
          lessons={lessons}
          selectedDate={selectedDate}
          onSelectDay={handleSelectDay}
          title="Calendário"
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

export default StudentArea;
