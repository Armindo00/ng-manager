import { useMemo, useState } from "react";
import type { Lesson, Student } from "../types";
import { formatMonthYear, getCurrentMonthYear } from "../utils/dateUtils";
import { countStudentTrainingsInMonth } from "../utils/studentPaymentPlan";

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type Props = {
  student: Student;
  lessons: Lesson[];
};

function StudentLessonHistory({ student, lessons }: Props) {
  const current = getCurrentMonthYear();
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [onlyPresent, setOnlyPresent] = useState(false);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([current.year]);
    for (const lesson of lessons) {
      const y = Number(lesson.date.slice(0, 4));
      if (Number.isFinite(y)) years.add(y);
    }
    return [...years].sort((a, b) => b - a);
  }, [lessons, current.year]);

  const monthPresent = countStudentTrainingsInMonth(
    student.id,
    lessons,
    month,
    year
  );

  const studentLessons = lessons
    .filter((lesson) => {
      if (!lesson.bookedStudentIds.includes(student.id)) return false;
      if (Number(lesson.date.slice(0, 4)) !== year) return false;
      if (Number(lesson.date.slice(5, 7)) !== month) return false;
      if (onlyPresent && !lesson.presentStudentIds.includes(student.id)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  function getStatus(lesson: Lesson) {
    if (lesson.presentStudentIds.includes(student.id)) return "Presente";

    const response = lesson.responses?.find(
      (item) => item.studentId === student.id
    );

    if (response?.status === "declined") return "Não foi";
    if (response?.status === "confirmed") return "Confirmado";

    return "Por responder";
  }

  return (
    <div className="student-history">
      <div className="admin-section-heading">
        <div>
          <span className="admin-section-kicker">Histórico</span>
          <h2>Treinos</h2>
        </div>
      </div>

      <div className="quota-toolbar student-history-toolbar">
        <label className="field-label">
          Mês
          <select
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Ano
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="quota-filter-toggle">
          <input
            type="checkbox"
            checked={onlyPresent}
            onChange={(event) => setOnlyPresent(event.target.checked)}
          />
          Só presentes
        </label>
      </div>

      <p className="muted student-history-month-summary">
        {formatMonthYear(month, year)} · {monthPresent} presença
        {monthPresent === 1 ? "" : "s"}
      </p>

      {studentLessons.length === 0 && (
        <p className="muted">Sem treinos neste período.</p>
      )}

      {studentLessons.map((lesson) => (
        <article className="student-history-row" key={lesson.id}>
          <div>
            <strong>{lesson.date}</strong>
            <p>
              {lesson.time || "--:--"} · {lesson.beach || "Praia por definir"}
            </p>
          </div>

          <div>
            <span>{lesson.groupName || "Treino extra"}</span>
            <strong>{getStatus(lesson)}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

export default StudentLessonHistory;
