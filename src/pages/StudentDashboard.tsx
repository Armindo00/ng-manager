import { useEffect, useState } from "react";
import type { Lesson, MonthlyEvaluation, Student, User } from "../types";
import { getLessons } from "../services/lessonsService";
import { getEvaluations } from "../services/evaluationsService";
import { loadStudentView } from "../utils/studentView";

type Props = {
  user: User;
};

function StudentDashboard({ user }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id, user.studentId]);

  async function loadData() {
    setLoading(true);

    const studentResult = await loadStudentView(user);
    const lessonsData = await getLessons();
    const evaluationsData = await getEvaluations();

    if (!studentResult.student) {
      setStudent(null);
      setLessons([]);
      setEvaluations([]);
      setError(studentResult.error);
      setLoading(false);
      return;
    }

    const foundStudent = studentResult.student;
    setStudent(foundStudent);
    setError(null);

    setLessons(
      lessonsData.filter((lesson) =>
        lesson.bookedStudentIds.includes(foundStudent.id)
      )
    );

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

  if (loading) return <p className="muted">A carregar...</p>;
  if (!student) return <p>{error || "Aluno não encontrado."}</p>;

  const studentId = student.id;
  const nextLesson = lessons.find((lesson) => lesson.status === "published");
  const lastEvaluation = evaluations[0];

  function getMaterialText(lesson: Lesson) {
    const response = lesson.responses?.find((item) => item.studentId === studentId);
    if (!response || response.status !== "confirmed") return "Sem material";

    const items: string[] = [];
    if (response.material.softboard) items.push("Softboard");
    if (response.material.fiberBoard) items.push("Prancha fibra");
    if (response.material.wetsuit) items.push("Fato");
    if (response.material.lycra) items.push("Licra");
    if (response.material.leash) items.push("Leash");
    if (response.material.vest) items.push("Colete");
    if (response.material.other) items.push(response.material.other);

    return items.length > 0 ? items.join(", ") : "Sem material";
  }

  function getStatusText(lesson: Lesson) {
    const response = lesson.responses?.find((item) => item.studentId === studentId);
    if (!response) return "Aguarda resposta";
    if (response.status === "declined") return "Não vou";
    return "Confirmado";
  }

  function getTransportText(lesson: Lesson) {
    const response = lesson.responses?.find((item) => item.studentId === studentId);
    if (!response || response.status !== "confirmed") return "-";

    if (response.transportType === "beach") {
      return "Direto para a praia às " + response.availableFrom;
    }

    return response.pickupLocation + " às " + response.availableFrom;
  }

  function getGoalResultText(result: string) {
    if (result === "completed") return "Cumprido";
    if (result === "progress") return "Em progresso";
    return "Continuar";
  }

  return (
    <div>
      <h1 className="page-title">Dashboard do Aluno</h1>

      <div className="stats-grid">
        <div className="card">
          <span className="stat-label">Aluno</span>
          <strong className="stat-number small">{student.name}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Treinos realizados</span>
          <strong className="stat-number">
            {lessons.filter((lesson) => lesson.presentStudentIds.includes(studentId)).length}
          </strong>
        </div>

        <div className="card">
          <span className="stat-label">Avaliações</span>
          <strong className="stat-number">{evaluations.length}</strong>
        </div>
      </div>

      <div className="card section-card">
        <h2>Próximo treino</h2>

        {!nextLesson && <p className="muted">Não tens treinos publicados.</p>}

        {nextLesson && (
          <>
            <h3>{nextLesson.groupName || "Treino"}</h3>
            <p>Data: {nextLesson.date}</p>
            <p>Hora: {nextLesson.time}</p>
            <p>Praia: {nextLesson.beach}</p>
            <p>Treinador: {nextLesson.coachName}</p>
            <p>Estado: {getStatusText(nextLesson)}</p>
            <p>Transporte: {getTransportText(nextLesson)}</p>
            <p>Material: {getMaterialText(nextLesson)}</p>
          </>
        )}
      </div>

      <div className="card section-card">
        <h2>Última avaliação</h2>

        {!lastEvaluation && <p className="muted">Ainda não existem avaliações.</p>}

        {lastEvaluation && (
          <>
            <h3>
              {lastEvaluation.month}/{lastEvaluation.year}
            </h3>

            <p>Empenho: {lastEvaluation.effort}/5</p>
            <p>Presença: {lastEvaluation.attendance}%</p>
            <p>Objetivo técnico: {lastEvaluation.technicalGoal}</p>
            <p>Resultado: {getGoalResultText(lastEvaluation.goalResult)}</p>
            <p>Comentário: {lastEvaluation.coachComment}</p>
            <p>Próximo objetivo: {lastEvaluation.nextGoal}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;
