import { useEffect, useState } from "react";
import type { MonthlyEvaluation, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getEvaluations } from "../services/evaluationsService";

type Props = {
  user: User;
};

function SkillCard({ user }: Props) {
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

    const foundStudent = studentsData.find((s) => s.id === user.studentId);

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

  if (loading) return <p className="muted">A carregar...</p>;
  if (!student) return <p>Aluno não encontrado.</p>;

  const averageEffort =
    evaluations.length === 0
      ? 0
      : Math.round(
          evaluations.reduce((total, item) => total + item.effort, 0) /
            evaluations.length
        );

  const averageAttendance =
    evaluations.length === 0
      ? 0
      : Math.round(
          evaluations.reduce((total, item) => total + item.attendance, 0) /
            evaluations.length
        );

  const completedGoals = evaluations.filter(
    (item) => item.goalResult === "completed"
  ).length;

  const lastEvaluation = evaluations[0];

  return (
    <div>
      <h1 className="page-title">Skill Card</h1>

      <div className="stats-grid">
        <div className="card">
          <span className="stat-label">Aluno</span>
          <strong className="stat-number small">{student.name}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Nível</span>
          <strong className="stat-number small">{student.level}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Empenho médio</span>
          <strong className="stat-number">{averageEffort}/5</strong>
        </div>

        <div className="card">
          <span className="stat-label">Presença média</span>
          <strong className="stat-number">{averageAttendance}%</strong>
        </div>

        <div className="card">
          <span className="stat-label">Objetivos cumpridos</span>
          <strong className="stat-number">
            {completedGoals}/{evaluations.length}
          </strong>
        </div>
      </div>

      <div className="card section-card">
        <h2>Objetivo atual</h2>

        {!lastEvaluation && (
          <p className="muted">Ainda não existem avaliações.</p>
        )}

        {lastEvaluation && (
          <>
            <p>Último objetivo: {lastEvaluation.technicalGoal}</p>
            <p>Próximo objetivo: {lastEvaluation.nextGoal}</p>
            <p>Comentário: {lastEvaluation.coachComment}</p>
          </>
        )}
      </div>

      <div className="card section-card">
        <h2>Histórico</h2>

        {evaluations.map((evaluation) => (
          <div className="lesson-card" key={evaluation.id}>
            <div>
              <h3>
                {evaluation.month}/{evaluation.year}
              </h3>
              <p>Empenho: {evaluation.effort}/5</p>
              <p>Presença: {evaluation.attendance}%</p>
              <p>Objetivo: {evaluation.technicalGoal}</p>
              <p>Resultado: {evaluation.goalResult}</p>
              <p>Próximo objetivo: {evaluation.nextGoal}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SkillCard;
