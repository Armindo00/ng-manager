import { useEffect, useState } from "react";
import type { Lesson, MonthlyEvaluation, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons } from "../services/lessonsService";
import {
  getEvaluations,
  addEvaluation,
  updateEvaluation,
} from "../services/evaluationsService";

type Props = {
  user: User;
};

function Evaluations({ user }: Props) {
  console.log(user);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);

  const [selectedStudent, setSelectedStudent] = useState("");
  const [effort, setEffort] = useState(3);
  const [technicalGoal, setTechnicalGoal] = useState("");
  const [goalResult, setGoalResult] = useState<
    "completed" | "progress" | "continue"
  >("progress");
  const [coachComment, setCoachComment] = useState("");
  const [nextGoal, setNextGoal] = useState("");

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
  const studentsData = await getStudents();
  const lessonsData = await getLessons();
  const evaluationsData = await getEvaluations();

  // Mostrar todos os alunos por agora
  setStudents(studentsData);

  setLessons(lessonsData);
  setEvaluations(evaluationsData);
}


  const evaluationsThisMonth = evaluations.filter(
    (evaluation) =>
      evaluation.month === currentMonth &&
      evaluation.year === currentYear &&
      evaluation.coachId === user.id
  );

  function getAttendance(studentId: string) {
    const present = lessons.filter((lesson) =>
      lesson.presentStudentIds.includes(studentId)
    ).length;

    const total = lessons.filter((lesson) =>
      lesson.bookedStudentIds.includes(studentId)
    ).length;

    if (total === 0) return 0;

    return Math.round((present / total) * 100);
  }

  function hasEvaluationThisMonth(studentId: string) {
    return evaluationsThisMonth.some(
      (evaluation) => evaluation.studentId === studentId
    );
  }

  function getStudentName(studentId: string) {
    return students.find((student) => student.id === studentId)?.name || "Aluno";
  }

  function resultText(result: string) {
    if (result === "completed") return "Cumprido";
    if (result === "progress") return "Em progresso";
    return "Continuar";
  }

  function selectStudent(studentId: string) {
    setSelectedStudent(studentId);

    const existing = evaluationsThisMonth.find(
      (evaluation) => evaluation.studentId === studentId
    );

    if (existing) {
      setEffort(existing.effort);
      setTechnicalGoal(existing.technicalGoal);
      setGoalResult(existing.goalResult);
      setCoachComment(existing.coachComment);
      setNextGoal(existing.nextGoal);
    } else {
      setEffort(3);
      setTechnicalGoal("");
      setGoalResult("progress");
      setCoachComment("");
      setNextGoal("");
    }
  }

  async function saveEvaluation() {
    if (!selectedStudent || !technicalGoal || !nextGoal) return;

    const existing = evaluationsThisMonth.find(
      (evaluation) => evaluation.studentId === selectedStudent
    );

    const evaluation: MonthlyEvaluation = {
      id: existing?.id || crypto.randomUUID(),
      studentId: selectedStudent,
      coachId: user.id,
      month: currentMonth,
      year: currentYear,
      effort,
      attendance: getAttendance(selectedStudent),
      technicalGoal,
      goalResult,
      coachComment,
      nextGoal,
    };

    if (existing) {
      await updateEvaluation(evaluation);
    } else {
      await addEvaluation(evaluation);
    }

    await loadData();

    setSelectedStudent("");
    setEffort(3);
    setTechnicalGoal("");
    setGoalResult("progress");
    setCoachComment("");
    setNextGoal("");
  }

  return (
    <div>
      <h1 className="page-title">Avaliações</h1>

      <div className="card section-card">
        <h2>Nova avaliação</h2>

        <select
          value={selectedStudent}
          onChange={(e) => selectStudent(e.target.value)}
        >
          <option value="">Selecionar aluno</option>

          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {hasEvaluationThisMonth(student.id) ? "✅ " : "⬜ "}
              {student.name}
            </option>
          ))}
        </select>

        {selectedStudent && (
          <>
            <h3>Empenho</h3>

            <div style={{ display: "flex", gap: 10, fontSize: 32 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  style={{
                    cursor: "pointer",
                    color: star <= effort ? "#f5b301" : "#d1d5db",
                  }}
                  onClick={() => setEffort(star)}
                >
                  ★
                </span>
              ))}
            </div>

            <p>{effort} de 5 estrelas</p>

            <h3>Presença</h3>
            <strong>{getAttendance(selectedStudent)}%</strong>

            <h3>Objetivo técnico</h3>
            <input
              placeholder="Ex: Melhorar o bottom turn"
              value={technicalGoal}
              onChange={(e) => setTechnicalGoal(e.target.value)}
            />

            <h3>Resultado</h3>
            <select
              value={goalResult}
              onChange={(e) =>
                setGoalResult(
                  e.target.value as "completed" | "progress" | "continue"
                )
              }
            >
              <option value="completed">Cumprido</option>
              <option value="progress">Em progresso</option>
              <option value="continue">Continuar</option>
            </select>

            <h3>Comentário</h3>
            <textarea
              rows={5}
              value={coachComment}
              onChange={(e) => setCoachComment(e.target.value)}
            />

            <h3>Objetivo do próximo mês</h3>
            <input
              placeholder="Ex: Trabalhar leitura da onda"
              value={nextGoal}
              onChange={(e) => setNextGoal(e.target.value)}
            />

            <button className="primary-btn" onClick={saveEvaluation}>
              Guardar avaliação
            </button>
          </>
        )}
      </div>

      <div className="card section-card">
        <h2>Avaliações feitas este mês</h2>

        {evaluationsThisMonth.length === 0 && (
          <p className="muted">Ainda não existem avaliações este mês.</p>
        )}

        {evaluationsThisMonth.map((evaluation) => (
          <div className="lesson-card" key={evaluation.id}>
            <div>
              <h3>{getStudentName(evaluation.studentId)}</h3>
              <p>Empenho: {evaluation.effort}/5</p>
              <p>Presença: {evaluation.attendance}%</p>
              <p>Objetivo: {evaluation.technicalGoal}</p>
              <p>Resultado: {resultText(evaluation.goalResult)}</p>
              <p>Próximo objetivo: {evaluation.nextGoal}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Evaluations;
