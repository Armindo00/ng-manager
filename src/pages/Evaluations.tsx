import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, MonthlyEvaluation, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons } from "../services/lessonsService";
import {
  getEvaluations,
  addEvaluation,
  updateEvaluation,
} from "../services/evaluationsService";
import FormField from "../components/FormField";
import { getCurrentMonthYear, isDateInMonthYear } from "../utils/dateUtils";

type Props = {
  user: User;
};

function Evaluations({ user }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState("");
  const [effort, setEffort] = useState(3);
  const [technicalGoal, setTechnicalGoal] = useState("");
  const [goalResult, setGoalResult] = useState<
    "completed" | "progress" | "continue"
  >("progress");
  const [coachComment, setCoachComment] = useState("");
  const [nextGoal, setNextGoal] = useState("");

  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [studentsData, lessonsData, evaluationsData] = await Promise.all([
        getStudents(),
        getLessons(),
        getEvaluations(),
      ]);

      const coachLessons = lessonsData.filter(
        (lesson) => lesson.coachId === user.id
      );

      setLessons(coachLessons);
      setEvaluations(evaluationsData);
      setStudents(studentsData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar avaliações.");
    } finally {
      setLoading(false);
    }
  }

  const coachStudents = useMemo(() => {
    const coachStudentIds = new Set(
      lessons.flatMap((lesson) => lesson.bookedStudentIds)
    );

    return students
      .filter((student) => coachStudentIds.has(student.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [lessons, students]);

  const evaluationsThisMonth = evaluations.filter(
    (evaluation) =>
      evaluation.month === currentMonth &&
      evaluation.year === currentYear &&
      evaluation.coachId === user.id
  );

  function getAttendance(studentId: string) {
    const monthLessons = lessons.filter(
      (lesson) =>
        lesson.bookedStudentIds.includes(studentId) &&
        isDateInMonthYear(lesson.date, currentMonth, currentYear)
    );

    const present = monthLessons.filter((lesson) =>
      lesson.presentStudentIds.includes(studentId)
    ).length;

    if (monthLessons.length === 0) return 0;

    return Math.round((present / monthLessons.length) * 100);
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
    if (!selectedStudent) {
      toast.error("Seleciona um aluno.");
      return;
    }

    if (!technicalGoal.trim() || !nextGoal.trim()) {
      toast.error("Preenche o objetivo técnico e o objetivo do próximo mês.");
      return;
    }

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
      technicalGoal: technicalGoal.trim(),
      goalResult,
      coachComment: coachComment.trim(),
      nextGoal: nextGoal.trim(),
    };

    try {
      setSaving(true);

      if (existing) {
        await updateEvaluation(evaluation);
        toast.success("Avaliação atualizada.");
      } else {
        await addEvaluation(evaluation);
        toast.success("Avaliação guardada.");
      }

      await loadData();

      setSelectedStudent("");
      setEffort(3);
      setTechnicalGoal("");
      setGoalResult("progress");
      setCoachComment("");
      setNextGoal("");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar avaliação.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="muted">A carregar avaliações...</p>;
  }

  return (
    <div>
      <h1 className="page-title">Avaliações</h1>

      <p className="muted workflow-help">
        Avalia apenas os teus alunos. A presença é calculada com base nos
        treinos deste mês em que estavam inscritos.
      </p>

      <div className="card section-card">
        <h2>Nova avaliação</h2>

        {coachStudents.length === 0 ? (
          <p className="muted">
            Ainda não tens alunos em treinos publicados. Publica treinos com
            este treinador para poder avaliar.
          </p>
        ) : (
          <>
            <FormField label="Aluno">
              <select
                value={selectedStudent}
                onChange={(e) => selectStudent(e.target.value)}
              >
                <option value="">Selecionar aluno</option>

                {coachStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {hasEvaluationThisMonth(student.id) ? "✅ " : "⬜ "}
                    {student.name}
                  </option>
                ))}
              </select>
            </FormField>

            {selectedStudent && (
              <div className="form-fields-grid" style={{ marginTop: 16 }}>
                <FormField label="Empenho">
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
                  <p style={{ margin: "4px 0 0" }}>{effort} de 5 estrelas</p>
                </FormField>

                <FormField label="Presença este mês">
                  <strong>{getAttendance(selectedStudent)}%</strong>
                </FormField>

                <FormField label="Objetivo técnico">
                  <input
                    placeholder="Ex: Melhorar o bottom turn"
                    value={technicalGoal}
                    onChange={(e) => setTechnicalGoal(e.target.value)}
                  />
                </FormField>

                <FormField label="Resultado">
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
                </FormField>

                <FormField label="Comentário">
                  <textarea
                    rows={5}
                    placeholder="Observações sobre o aluno"
                    value={coachComment}
                    onChange={(e) => setCoachComment(e.target.value)}
                  />
                </FormField>

                <FormField label="Objetivo do próximo mês">
                  <input
                    placeholder="Ex: Trabalhar leitura da onda"
                    value={nextGoal}
                    onChange={(e) => setNextGoal(e.target.value)}
                  />
                </FormField>
              </div>
            )}

            {selectedStudent && (
              <div className="form-fields-actions" style={{ marginTop: 16 }}>
                <button
                  className="primary-btn"
                  onClick={saveEvaluation}
                  disabled={saving}
                >
                  {saving ? "A guardar..." : "Guardar avaliação"}
                </button>
              </div>
            )}
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
