import type { Lesson } from "../types";

type Props = {
  lessons: Lesson[];
  onSelectDay: (lessons: Lesson[], date: string) => void;
};

function LessonsCalendar({ lessons, onSelectDay }: Props) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const monthName = today.toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells: Array<number | null> = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  function getDateForDay(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  function lessonsForDay(day: number) {
    const date = getDateForDay(day);
    return lessons.filter((lesson) => lesson.date === date);
  }

  return (
    <div className="card section-card calendar-card">
      <div className="calendar-title-row">
        <h2>📅 Calendário de treinos</h2>
      </div>

      <h3 className="calendar-month">{monthName}</h3>

      <div className="calendar-grid calendar-header">
        <span>Seg</span>
        <span>Ter</span>
        <span>Qua</span>
        <span>Qui</span>
        <span>Sex</span>
        <span>Sáb</span>
        <span>Dom</span>
      </div>

      <div className="calendar-grid">
        {cells.map((day, index) => {
          const dayLessons = day ? lessonsForDay(day) : [];
          const date = day ? getDateForDay(day) : "";

          return (
            <button
              type="button"
              className={
                day === today.getDate()
                  ? "calendar-day calendar-today"
                  : "calendar-day"
              }
              key={index}
              disabled={!day || dayLessons.length === 0}
              onClick={() => {
                if (day && dayLessons.length > 0) {
                  onSelectDay(dayLessons, date);
                }
              }}
            >
              {day && (
                <>
                  <strong>{day}</strong>

                  {dayLessons.length > 0 && (
                    <div className="calendar-dots">
                      {dayLessons.slice(0, 3).map((lesson) => (
                        <span key={lesson.id} />
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
    </div>
  );
}

export default LessonsCalendar;
