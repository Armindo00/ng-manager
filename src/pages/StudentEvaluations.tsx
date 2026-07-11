import { useEffect, useState } from "react";
import type { MonthlyEvaluation, Student, User } from "../types";
import { getEvaluations } from "../services/evaluationsService";
import { loadStudentView } from "../utils/studentView";

type Props = {
  user: User;
};

function StudentEvaluations({ user }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id, user.studentId]);

  async function loadData() {
    setLoading(true);

    const studentResult = await loadStudentView(user);
    const evaluationsData = await getEvaluations();

    if (!studentResult.student) {
      setStudent(null);
      setEvaluations([]);
      setError(studentResult.error);
      setLoading(false);
      return;
    }

    const foundStudent = studentResult.student;
    setStudent(foundStudent);
    setError(null);

    setEvaluations(
      evaluationsData
        .filter((evaluation) => evaluation.studentId === foundStudent.id)
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        })
    );

    setLoading(false);
  }

  function resultText(result: string) {
    if (result === "completed") return "Cumprido";
    if (result === "progress") return "Em progresso";
    return "Continuar";
  }

  if (loading) {
    return <p className="muted">A carregar...</p>;
  }

  if (!student) {
    return <p>{error || "Aluno não encontrado."}</p>;
  }

  return (
    <div>
      <h1 className="page-title">As minhas avaliações</h1>

      {evaluations.length === 0 && (
        <p className="muted">Ainda não existem avaliações.</p>
      )}

      <div className="lesson-list">
        {evaluations.map((evaluation) => (
          <div className="card section-card" key={evaluation.id}>
            <h2>
              {evaluation.month}/{evaluation.year}
            </h2>

            <p>Empenho: {evaluation.effort}/5</p>
            <p>Presença: {evaluation.attendance}%</p>
            <p>Objetivo: {evaluation.technicalGoal}</p>
            <p>Resultado: {resultText(evaluation.goalResult)}</p>
            <p>Comentário: {evaluation.coachComment}</p>
            <p>Próximo objetivo: {evaluation.nextGoal}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentEvaluations;
