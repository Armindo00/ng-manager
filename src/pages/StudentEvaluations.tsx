import { useEffect, useState } from "react";
import type { MonthlyEvaluation, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getEvaluations } from "../services/evaluationsService";

type Props = {
  user: User;
};

function StudentEvaluations({ user }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const studentsData = await getStudents();
    const evaluationsData = await getEvaluations();

    const foundStudent = studentsData.find(
      (student) => student.id === user.studentId
    );

    if (foundStudent) {
      setStudent(foundStudent);

      setEvaluations(
        evaluationsData
          .filter((evaluation) => evaluation.studentId === foundStudent.id)
          .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          })
      );
    }

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
    return <p>Aluno não encontrado.</p>;
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
