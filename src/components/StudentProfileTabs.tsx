import { useState } from "react";
import type { Lesson, MonthlyEvaluation, Student } from "../types";
import StudentProfileCard from "./StudentProfileCard";
import StudentLessonHistory from "./StudentLessonHistory";
import StudentProfileStats from "./StudentProfileStats";
import StudentPaymentHistory from "./StudentPaymentHistory";

type Props = {
  student: Student;
  lessons: Lesson[];
  evaluations?: MonthlyEvaluation[];
};

const TABS = [
  { id: "dados", label: "Dados" },
  { id: "treinos", label: "Treinos" },
  { id: "avaliacoes", label: "Avaliações" },
  { id: "pagamentos", label: "Pagamentos" },
] as const;

function StudentProfileTabs({
  student,
  lessons,
  evaluations = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("dados");

  const studentEvaluations = evaluations
    .filter((evaluation) => evaluation.studentId === student.id)
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

  function resultText(result: string) {
    if (result === "completed") return "Cumprido";
    if (result === "progress") return "Em progresso";
    return "Continuar";
  }

  return (
    <div className="student-profile-tabs">
      <StudentProfileStats student={student} lessons={lessons} />

      <div className="student-tabs" role="tablist" aria-label="Secções do aluno">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="student-tab-panel" role="tabpanel">
        {activeTab === "dados" && <StudentProfileCard student={student} />}

        {activeTab === "treinos" && (
          <StudentLessonHistory student={student} lessons={lessons} />
        )}

        {activeTab === "avaliacoes" && (
          <div className="student-history">
            <div className="admin-section-heading">
              <div>
                <span className="admin-section-kicker">Acompanhamento</span>
                <h2>Avaliações</h2>
              </div>
            </div>

            {studentEvaluations.length === 0 && (
              <p className="muted">Ainda não existem avaliações para este aluno.</p>
            )}

            {studentEvaluations.map((evaluation) => (
              <article className="student-history-row" key={evaluation.id}>
                <div>
                  <strong>
                    {evaluation.month}/{evaluation.year}
                  </strong>
                  <p>Empenho: {evaluation.effort}/5</p>
                  <p>Presença: {evaluation.attendance}%</p>
                </div>

                <div>
                  <p>Objetivo: {evaluation.technicalGoal}</p>
                  <p>Resultado: {resultText(evaluation.goalResult)}</p>
                  <p>Comentário: {evaluation.coachComment}</p>
                  <p>Próximo objetivo: {evaluation.nextGoal}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === "pagamentos" && (
          <StudentPaymentHistory student={student} />
        )}
      </div>
    </div>
  );
}

export default StudentProfileTabs;
