import type { Lesson } from "../types";

type Props = {
  lessons: Lesson[];
};

function LessonsCalendar({ lessons }: Props) {
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

  const cells = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  function lessonsForDay(day: number) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    return lessons.filter((lesson) => lesson.date === date);
  }

  return (
    <div className="card section-card">
      <h2>📅 Calendário de treinos</h2>
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
        {cells.map((day, index) => (
          <div className="calendar-day" key={index}>
            {day && (
              <>
                <strong>{day}</strong>

                {lessonsForDay(day).map((lesson) => (
                  <div className="calendar-lesson" key={lesson.id}>
                    {lesson.time || "--:--"} · {lesson.groupName || "Treino"}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LessonsCalendar;
