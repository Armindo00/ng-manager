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

function StudentProfileTabs({
  student,
  lessons,
  evaluations = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "dados" | "treinos" | "avaliacoes" | "pagamentos"
  >("dados");

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
    <div>
      <StudentProfileStats student={student} lessons={lessons} />

      <div className="student-tabs">
        <button className={activeTab === "dados" ? "tab active" : "tab"} onClick={() => setActiveTab("dados")}>
          👤 Dados
        </button>

        <button className={activeTab === "treinos" ? "tab active" : "tab"} onClick={() => setActiveTab("treinos")}>
          📅 Treinos
        </button>

        <button className={activeTab === "avaliacoes" ? "tab active" : "tab"} onClick={() => setActiveTab("avaliacoes")}>
          📝 Avaliações
        </button>

        <button className={activeTab === "pagamentos" ? "tab active" : "tab"} onClick={() => setActiveTab("pagamentos")}>
          💳 Pagamentos
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        {activeTab === "dados" && <StudentProfileCard student={student} />}

        {activeTab === "treinos" && (
          <StudentLessonHistory student={student} lessons={lessons} />
        )}

        {activeTab === "avaliacoes" && (
          <div>
            <h3>📝 Avaliações</h3>

            {studentEvaluations.length === 0 && (
              <p className="muted">Ainda não existem avaliações para este aluno.</p>
            )}

            {studentEvaluations.map((evaluation) => (
              <div className="student-history-row" key={evaluation.id}>
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
              </div>
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
