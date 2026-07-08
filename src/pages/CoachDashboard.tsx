import { useEffect, useState } from "react";
import type { Lesson, MonthlyEvaluation, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons } from "../services/lessonsService";
import { getEvaluations } from "../services/evaluationsService";

type Props = {
  user: User;
};

function CoachDashboard({ user }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const lessonsData = await getLessons();
    const studentsData = await getStudents();
    const evaluationsData = await getEvaluations();

    setLessons(lessonsData.filter((lesson) => lesson.coachName === user.name));
    setStudents(studentsData);
    setEvaluations(evaluationsData);
  }

  const today = new Date().toISOString().split("T")[0];

  const todayLessons = lessons.filter((lesson) => lesson.date === today);
  const draftLessons = lessons.filter((lesson) => lesson.status === "draft");
  const publishedLessons = lessons.filter((lesson) => lesson.status === "published");

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const evaluatedStudentIds = evaluations
    .filter(
      (evaluation) =>
        evaluation.month === currentMonth &&
        evaluation.year === currentYear &&
        evaluation.coachId === user.id
    )
    .map((evaluation) => evaluation.studentId);

  const coachStudents = students.filter((student) =>
    lessons.some((lesson) => lesson.bookedStudentIds.includes(student.id))
  );

  const pendingEvaluations = coachStudents.filter(
    (student) => !evaluatedStudentIds.includes(student.id)
  );

  function getConfirmedCount(lesson: Lesson) {
    return (lesson.responses || []).filter(
      (response) => response.status === "confirmed"
    ).length;
  }

  function getPendingCount(lesson: Lesson) {
    return lesson.bookedStudentIds.length - (lesson.responses || []).length;
  }

  function getPickupCount(lesson: Lesson) {
    return (lesson.responses || []).filter(
      (response) =>
        response.status === "confirmed" && response.transportType === "pickup"
    ).length;
  }

  function getBeachCount(lesson: Lesson) {
    return (lesson.responses || []).filter(
      (response) =>
        response.status === "confirmed" && response.transportType === "beach"
    ).length;
  }

  function getMaterialSummary(lesson: Lesson) {
    const summary = {
      softboard: 0,
      fiberBoard: 0,
      wetsuit: 0,
      lycra: 0,
      leash: 0,
      vest: 0,
    };

    lesson.responses?.forEach((response) => {
      if (response.status !== "confirmed") return;

      if (response.material.softboard) summary.softboard++;
      if (response.material.fiberBoard) summary.fiberBoard++;
      if (response.material.wetsuit) summary.wetsuit++;
      if (response.material.lycra) summary.lycra++;
      if (response.material.leash) summary.leash++;
      if (response.material.vest) summary.vest++;
    });

    return summary;
  }

  return (
    <div>
      <h1 className="page-title">Dashboard do Treinador</h1>

      <div className="stats-grid">
        <div className="card">
          <span className="stat-label">Treinos hoje</span>
          <strong className="stat-number">{todayLessons.length}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Por publicar</span>
          <strong className="stat-number">{draftLessons.length}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Publicados</span>
          <strong className="stat-number">{publishedLessons.length}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Avaliações pendentes</span>
          <strong className="stat-number">{pendingEvaluations.length}</strong>
        </div>
      </div>

      <div className="card section-card">
        <h2>Treinos de hoje</h2>

        {todayLessons.length === 0 && (
          <p className="muted">Não tens treinos hoje.</p>
        )}

        {todayLessons.map((lesson) => {
          const materialSummary = getMaterialSummary(lesson);

          return (
            <div className="lesson-card" key={lesson.id}>
              <div>
                <h3>{lesson.groupName || "Treino extra"}</h3>
                <p>Hora: {lesson.time || "Por definir"}</p>
                <p>Praia: {lesson.beach || "Por definir"}</p>
                <p>Estado: {lesson.status}</p>
              </div>

              <div>
                <p>Confirmados: {getConfirmedCount(lesson)}</p>
                <p>Sem resposta: {getPendingCount(lesson)}</p>
                <p>Carrinha: {getPickupCount(lesson)}</p>
                <p>Direto para a praia: {getBeachCount(lesson)}</p>

                <h4>Material</h4>
                <p>Softboards: {materialSummary.softboard}</p>
                <p>Pranchas fibra: {materialSummary.fiberBoard}</p>
                <p>Fatos: {materialSummary.wetsuit}</p>
                <p>Licras: {materialSummary.lycra}</p>
                <p>Leashes: {materialSummary.leash}</p>
                <p>Coletes: {materialSummary.vest}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card section-card">
        <h2>Avaliações deste mês</h2>

        {pendingEvaluations.length === 0 ? (
          <p className="muted">Todas as avaliações estão feitas.</p>
        ) : (
          pendingEvaluations.map((student) => (
            <p key={student.id}>{student.name}</p>
          ))
        )}
      </div>
    </div>
  );
}

export default CoachDashboard;
