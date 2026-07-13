import type { Lesson, Student } from "../types";
import {
  formatMaterialText,
  formatTransportText,
  getLessonMaterialSummary,
  getResponseStatusLabel,
} from "../utils/lessonResponse";

type Props = {
  lesson: Lesson;
  students: Student[];
  compact?: boolean;
};

function CoachStudentResponsesPanel({ lesson, students, compact = false }: Props) {
  const bookedStudents = students.filter((student) =>
    lesson.bookedStudentIds.includes(student.id)
  );

  const materialSummary = getLessonMaterialSummary(lesson);

  const pickupCount = (lesson.responses || []).filter(
    (response) =>
      response.status === "confirmed" && response.transportType === "pickup"
  ).length;

  const beachCount = (lesson.responses || []).filter(
    (response) =>
      response.status === "confirmed" && response.transportType === "beach"
  ).length;

  const respondedCount = bookedStudents.filter((student) =>
    lesson.responses?.some((response) => response.studentId === student.id)
  ).length;

  const pendingCount = Math.max(bookedStudents.length - respondedCount, 0);

  if (bookedStudents.length === 0) {
    return <p className="muted">Sem alunos inscritos neste treino.</p>;
  }

  return (
    <div className="coach-responses-panel">
      <div className="coach-responses-stats">
        <span className="coach-response-stat confirmed">
          {pickupCount + beachCount} confirmados
        </span>
        <span className="coach-response-stat pickup">{pickupCount} na carrinha</span>
        <span className="coach-response-stat beach">{beachCount} praia direta</span>
        <span className="coach-response-stat pending">{pendingCount} por responder</span>
      </div>

      {!compact && (
        <div className="coach-material-summary">
          <strong>Material total:</strong>
          <span>Softboards {materialSummary.softboard}</span>
          <span>Fibra {materialSummary.fiberBoard}</span>
          <span>Fatos {materialSummary.wetsuit}</span>
          <span>Licras {materialSummary.lycra}</span>
          <span>Leashes {materialSummary.leash}</span>
          <span>Coletes {materialSummary.vest}</span>
        </div>
      )}

      <div className="coach-responses-table-wrap">
        <table className="coach-responses-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Resposta</th>
              <th>Pickup / Hora</th>
              {!compact && <th>Material</th>}
            </tr>
          </thead>

          <tbody>
            {bookedStudents.map((student) => {
              const response = lesson.responses?.find(
                (item) => item.studentId === student.id
              );
              const status = getResponseStatusLabel(response);

              return (
                <tr key={student.id}>
                  <td data-label="Aluno">
                    <strong>{student.name}</strong>
                  </td>

                  <td data-label="Resposta">
                    <span className={`coach-response-badge ${status.className}`}>
                      {status.label}
                    </span>
                  </td>

                  <td data-label="Pickup / Hora">
                    {formatTransportText(response)}
                    {response?.notes && !compact && (
                      <small className="coach-response-note">
                        Nota: {response.notes}
                      </small>
                    )}
                  </td>

                  {!compact && (
                    <td data-label="Material">{formatMaterialText(response)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CoachStudentResponsesPanel;
