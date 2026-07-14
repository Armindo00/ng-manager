import { useMemo, useState } from "react";
import type { Lesson } from "../types";
import {
  buildMonthDate,
  formatMonthName,
  getLisbonMonthParts,
  getTodayDate,
} from "../utils/dateUtils";
import { getLessonDotClass } from "../utils/calendarUtils";

type Props = {
  lessons: Lesson[];
  selectedDate?: string | null;
  onSelectDay: (lessons: Lesson[], date: string) => void;
  title?: string;
  studentId?: string;
};

function LessonsCalendar({
  lessons,
  selectedDate,
  onSelectDay,
  title = "Calendário de treinos",
  studentId,
}: Props) {
  const initialMonth = getLisbonMonthParts();
  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.month);

  const monthName = formatMonthName(viewYear, viewMonth);

  const { cells, todayDay } = useMemo(() => {
    const firstDay = new Date(Date.UTC(viewYear, viewMonth - 1, 1, 12));
    const startOffset = (firstDay.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0, 12)).getUTCDate();
    const monthCells: Array<number | null> = [];

    for (let i = 0; i < startOffset; i++) {
      monthCells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      monthCells.push(day);
    }

    const today = getTodayDate();
    const [todayYear, todayMonth, todayDate] = today.split("-").map(Number);
    const isCurrentMonth = viewYear === todayYear && viewMonth === todayMonth;

    return {
      cells: monthCells,
      todayDay: isCurrentMonth ? todayDate : null,
    };
  }, [viewYear, viewMonth]);

  function getDateForDay(day: number) {
    return buildMonthDate(viewYear, viewMonth, day);
  }

  function lessonsForDay(day: number) {
    const date = getDateForDay(day);
    return lessons
      .filter((lesson) => lesson.date === date)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }

  function goToPreviousMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((current) => current - 1);
      return;
    }

    setViewMonth((current) => current - 1);
  }

  function goToNextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((current) => current + 1);
      return;
    }

    setViewMonth((current) => current + 1);
  }

  function goToCurrentMonth() {
    const current = getLisbonMonthParts();
    setViewYear(current.year);
    setViewMonth(current.month);
  }

  return (
    <div className="card section-card calendar-card">
      <div className="calendar-title-row">
        <h2>📅 {title}</h2>

        <div className="calendar-nav">
          <button type="button" className="compact-btn" onClick={goToPreviousMonth}>
            ←
          </button>

          <button type="button" className="compact-btn" onClick={goToCurrentMonth}>
            Hoje
          </button>

          <button type="button" className="compact-btn" onClick={goToNextMonth}>
            →
          </button>
        </div>
      </div>

      <h3 className="calendar-month">{monthName}</h3>

      <div className="calendar-grid calendar-header">
        <span className="calendar-weekday" data-short="S">
          Seg
        </span>
        <span className="calendar-weekday" data-short="T">
          Ter
        </span>
        <span className="calendar-weekday" data-short="Q">
          Qua
        </span>
        <span className="calendar-weekday" data-short="Q">
          Qui
        </span>
        <span className="calendar-weekday" data-short="S">
          Sex
        </span>
        <span className="calendar-weekday" data-short="S">
          Sáb
        </span>
        <span className="calendar-weekday" data-short="D">
          Dom
        </span>
      </div>

      <div className="calendar-grid">
        {cells.map((day, index) => {
          const dayLessons = day ? lessonsForDay(day) : [];
          const date = day ? getDateForDay(day) : "";
          const hasLessons = dayLessons.length > 0;
          const isToday = day !== null && day === todayDay;
          const isSelected = Boolean(selectedDate && date === selectedDate);

          return (
            <button
              type="button"
              className={[
                "calendar-day",
                isToday ? "calendar-today" : "",
                isSelected ? "calendar-selected" : "",
                hasLessons ? "calendar-has-lessons" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={index}
              disabled={!day}
              onClick={() => {
                if (day) {
                  onSelectDay(dayLessons, date);
                }
              }}
            >
              {day && (
                <>
                  <strong>{day}</strong>

                  {hasLessons && (
                    <div className="calendar-dots">
                      {dayLessons.slice(0, 3).map((lesson) => (
                        <span
                          key={lesson.id}
                          className={getLessonDotClass(lesson, { studentId })}
                        />
                      ))}
                    </div>
                  )}

                  {dayLessons.length > 3 && (
                    <small className="calendar-more">+{dayLessons.length - 3}</small>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        {studentId ? (
          <>
            <span>
              <i className="legend-dot dot-confirmed" /> Confirmado
            </span>
            <span>
              <i className="legend-dot dot-pending" /> Por responder
            </span>
            <span>
              <i className="legend-dot dot-declined" /> Não vou
            </span>
          </>
        ) : (
          <>
            <span>
              <i className="legend-dot dot-published" /> Publicado
            </span>
            <span>
              <i className="legend-dot dot-finished" /> Concluído
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default LessonsCalendar;
