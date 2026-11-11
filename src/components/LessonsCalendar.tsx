import { useMemo, useState } from "react";
import type { FixedTraining } from "../data/fixedTrainings";
import type { Lesson } from "../types";
import {
  buildMonthCalendarEntries,
  getEntryDotClass,
  type CalendarEntry,
} from "../utils/fixedScheduleCalendar";
import {
  buildMonthDate,
  formatMonthName,
  getLisbonMonthParts,
  getTodayDate,
} from "../utils/dateUtils";

type Props = {
  lessons: Lesson[];
  fixedTrainings?: FixedTraining[];
  selectedDate?: string | null;
  onSelectDay: (entries: CalendarEntry[], date: string) => void;
  title?: string;
  includePlanned?: boolean;
};

const WEEKDAYS = [
  { label: "Seg", short: "S" },
  { label: "Ter", short: "T" },
  { label: "Qua", short: "Q" },
  { label: "Qui", short: "Q" },
  { label: "Sex", short: "S" },
  { label: "Sáb", short: "S" },
  { label: "Dom", short: "D" },
] as const;

function LessonsCalendar({
  lessons,
  fixedTrainings = [],
  selectedDate,
  onSelectDay,
  title = "Calendário de treinos",
  includePlanned = true,
}: Props) {
  const initialMonth = getLisbonMonthParts();
  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.month);

  const monthName = formatMonthName(viewYear, viewMonth);

  const monthEntries = useMemo(
    () =>
      buildMonthCalendarEntries({
        year: viewYear,
        month: viewMonth,
        lessons,
        fixedTrainings,
        includePlanned,
      }),
    [viewYear, viewMonth, lessons, fixedTrainings, includePlanned]
  );

  const { cells, todayDay } = useMemo(() => {
    const firstDay = new Date(Date.UTC(viewYear, viewMonth - 1, 1, 12));
    const startOffset = (firstDay.getUTCDay() + 6) % 7;
    const daysInMonthCount = new Date(
      Date.UTC(viewYear, viewMonth, 0, 12)
    ).getUTCDate();
    const monthCells: Array<number | null> = [];

    for (let i = 0; i < startOffset; i++) {
      monthCells.push(null);
    }

    for (let day = 1; day <= daysInMonthCount; day++) {
      monthCells.push(day);
    }

    while (monthCells.length % 7 !== 0) {
      monthCells.push(null);
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

  function entriesForDay(day: number) {
    const date = getDateForDay(day);
    return monthEntries.filter((entry) => entry.date === date);
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
      <div className="calendar-header-bar">
        <div>
          <span className="admin-section-kicker">Calendário</span>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="calendar-toolbar">
        <button
          type="button"
          className="compact-btn calendar-nav-btn"
          onClick={goToPreviousMonth}
          aria-label="Mês anterior"
        >
          ←
        </button>

        <div className="calendar-toolbar-center">
          <h3 className="calendar-month">{monthName}</h3>
          <button
            type="button"
            className="compact-btn calendar-today-btn"
            onClick={goToCurrentMonth}
          >
            Hoje
          </button>
        </div>

        <button
          type="button"
          className="compact-btn calendar-nav-btn"
          onClick={goToNextMonth}
          aria-label="Mês seguinte"
        >
          →
        </button>
      </div>

      <div className="calendar-grid calendar-weekdays" aria-hidden>
        {WEEKDAYS.map((weekday) => (
          <span
            className="calendar-weekday"
            data-short={weekday.short}
            key={weekday.label}
          >
            {weekday.label}
          </span>
        ))}
      </div>

      <div className="calendar-grid calendar-days">
        {cells.map((day, index) => {
          const dayEntries = day ? entriesForDay(day) : [];
          const date = day ? getDateForDay(day) : "";
          const hasEntries = dayEntries.length > 0;
          const isToday = day !== null && day === todayDay;
          const isSelected = Boolean(selectedDate && date === selectedDate);
          const visibleDots = dayEntries.slice(0, hasEntries && dayEntries.length > 3 ? 2 : 3);
          const extraCount = Math.max(0, dayEntries.length - visibleDots.length);

          return (
            <button
              type="button"
              className={[
                "calendar-day",
                !day ? "calendar-day-empty" : "",
                isToday ? "calendar-today" : "",
                isSelected ? "calendar-selected" : "",
                hasEntries ? "calendar-has-lessons" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={index}
              disabled={!day}
              aria-label={day ? `Dia ${day}` : undefined}
              aria-pressed={isSelected}
              onClick={() => {
                if (day) onSelectDay(dayEntries, date);
              }}
            >
              {day ? (
                <>
                  <span className="calendar-day-number">{day}</span>

                  {hasEntries ? (
                    <span className="calendar-day-meta">
                      <span className="calendar-dots">
                        {visibleDots.map((entry) => (
                          <span
                            key={entry.id}
                            className={getEntryDotClass(entry)}
                            title={entry.title}
                          />
                        ))}
                      </span>
                      {extraCount > 0 ? (
                        <span className="calendar-more">+{extraCount}</span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="calendar-day-meta calendar-day-meta-empty" />
                  )}
                </>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span>
          <i className="legend-dot dot-planned" /> Na escala
        </span>
        <span>
          <i className="legend-dot dot-published" /> Registado
        </span>
        <span>
          <i className="legend-dot dot-finished" /> Concluído
        </span>
      </div>
    </div>
  );
}

export default LessonsCalendar;
