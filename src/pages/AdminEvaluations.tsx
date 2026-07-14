import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, MonthlyEvaluation, Student } from "../types";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import { getEvaluations } from "../services/evaluationsService";
import { formatMonthYear } from "../utils/dateUtils";
import {
  DetailPanel,
  DetailPanelEmpty,
  MasterDetailLayout,
  SelectionList,
  SelectionListItem,
} from "../components/MasterDetailLayout";

type MonthBucket = {
  key: string;
  month: number;
  year: number;
  evaluations: MonthlyEvaluation[];
};

function resultText(result: MonthlyEvaluation["goalResult"]) {
  if (result === "completed") return "Cumprido";
  if (result === "progress") return "Em progresso";
  return "Continuar";
}

function AdminEvaluations() {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [studentsData, coachesData, evaluationsData] = await Promise.all([
        getStudents(),
        getCoaches(),
        getEvaluations(),
      ]);
      setStudents(studentsData);
      setCoaches(coachesData);
      setEvaluations(evaluationsData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar avaliações.");
    } finally {
      setLoading(false);
    }
  }

  const studentMap = useMemo(
    () => new Map(students.map((student) => [student.id, student.name])),
    [students]
  );

  const coachMap = useMemo(
    () => new Map(coaches.map((coach) => [coach.id, coach.name])),
    [coaches]
  );

  const monthBuckets = useMemo(() => {
    const map = new Map<string, MonthlyEvaluation[]>();

    for (const evaluation of evaluations) {
      const key = `${evaluation.year}-${String(evaluation.month).padStart(2, "0")}`;
      const bucket = map.get(key) ?? [];
      bucket.push(evaluation);
      map.set(key, bucket);
    }

    const buckets: MonthBucket[] = Array.from(map.entries()).map(
      ([key, bucketEvaluations]) => {
        const sample = bucketEvaluations[0];

        return {
          key,
          month: sample.month,
          year: sample.year,
          evaluations: [...bucketEvaluations].sort((a, b) =>
            (studentMap.get(a.studentId) || "").localeCompare(
              studentMap.get(b.studentId) || ""
            )
          ),
        };
      }
    );

    return buckets.sort((a, b) => b.year - a.year || b.month - a.month);
  }, [evaluations, studentMap]);

  useEffect(() => {
    if (monthBuckets.length === 0) {
      setSelectedMonthKey(null);
      return;
    }

    if (
      !selectedMonthKey ||
      !monthBuckets.some((bucket) => bucket.key === selectedMonthKey)
    ) {
      setSelectedMonthKey(monthBuckets[0].key);
    }
  }, [monthBuckets, selectedMonthKey]);

  const selectedMonth =
    monthBuckets.find((bucket) => bucket.key === selectedMonthKey) ?? null;

  const visibleEvaluations = useMemo(() => {
    if (!selectedMonth) return [];

    const term = search.trim().toLowerCase();
    if (!term) return selectedMonth.evaluations;

    return selectedMonth.evaluations.filter((evaluation) => {
      const studentName = studentMap.get(evaluation.studentId) || "";
      const coachName = coachMap.get(evaluation.coachId) || "";

      return (
        studentName.toLowerCase().includes(term) ||
        coachName.toLowerCase().includes(term) ||
        evaluation.technicalGoal.toLowerCase().includes(term) ||
        evaluation.nextGoal.toLowerCase().includes(term)
      );
    });
  }, [selectedMonth, search, studentMap, coachMap]);

  useEffect(() => {
    if (visibleEvaluations.length === 0) {
      setSelectedEvaluationId(null);
      return;
    }

    if (
      !selectedEvaluationId ||
      !visibleEvaluations.some((item) => item.id === selectedEvaluationId)
    ) {
      setSelectedEvaluationId(visibleEvaluations[0].id);
    }
  }, [visibleEvaluations, selectedEvaluationId]);

  const selectedEvaluation =
    visibleEvaluations.find((item) => item.id === selectedEvaluationId) ??
    null;

  function getStudentName(studentId: string) {
    return studentMap.get(studentId) || "Aluno";
  }

  function getCoachName(coachId: string) {
    return coachMap.get(coachId) || "Treinador";
  }

  function renderEvaluationDetail(evaluation: MonthlyEvaluation) {
    return (
      <div className="evaluation-detail-card">
        <p>
          <strong>Aluno:</strong> {getStudentName(evaluation.studentId)}
        </p>
        <p>
          <strong>Treinador:</strong> {getCoachName(evaluation.coachId)}
        </p>
        <p>
          <strong>Período:</strong>{" "}
          {formatMonthYear(evaluation.month, evaluation.year)}
        </p>
        <p>
          <strong>Empenho:</strong> {evaluation.effort}/5
        </p>
        <p>
          <strong>Presença:</strong> {evaluation.attendance}%
        </p>
        <p>
          <strong>Objetivo técnico:</strong> {evaluation.technicalGoal}
        </p>
        <p>
          <strong>Resultado:</strong> {resultText(evaluation.goalResult)}
        </p>
        <p>
          <strong>Comentário do treinador:</strong>{" "}
          {evaluation.coachComment || "—"}
        </p>
        <p>
          <strong>Próximo objetivo:</strong> {evaluation.nextGoal}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Avaliações</h1>

      <p className="muted workflow-help">
        Consulta todas as avaliações mensais dos alunos. Seleciona o mês na
        lista e depois o aluno para ver o detalhe.
      </p>

      {loading ? (
        <p className="muted">A carregar avaliações...</p>
      ) : evaluations.length === 0 ? (
        <p className="muted">Ainda não existem avaliações registadas.</p>
      ) : (
        <MasterDetailLayout
          showDetail={Boolean(selectedMonth)}
          list={
            <SelectionList title="Meses" empty={<p className="muted">Sem meses.</p>}>
              {monthBuckets.map((bucket) => (
                <SelectionListItem
                  key={bucket.key}
                  active={bucket.key === selectedMonthKey}
                  onClick={() => {
                    setSelectedMonthKey(bucket.key);
                    setSelectedEvaluationId(null);
                    setSearch("");
                  }}
                  title={formatMonthYear(bucket.month, bucket.year)}
                  subtitle={`${bucket.evaluations.length} avaliação(ões)`}
                  meta={String(bucket.year)}
                />
              ))}
            </SelectionList>
          }
          detail={
            selectedMonth ? (
              <div className="lesson-day-master-detail">
                <SelectionList
                  title={formatMonthYear(selectedMonth.month, selectedMonth.year)}
                  toolbar={
                    <input
                      className="search-input"
                      placeholder="🔍 Pesquisar aluno..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  }
                  empty={
                    <p className="muted">
                      Sem avaliações neste mês para o filtro aplicado.
                    </p>
                  }
                >
                  {visibleEvaluations.map((evaluation) => (
                    <SelectionListItem
                      key={evaluation.id}
                      active={evaluation.id === selectedEvaluationId}
                      onClick={() => setSelectedEvaluationId(evaluation.id)}
                      title={getStudentName(evaluation.studentId)}
                      subtitle={evaluation.technicalGoal}
                      meta={getCoachName(evaluation.coachId)}
                      badge={
                        <span className="muted">
                          {evaluation.effort}/5 · {evaluation.attendance}%
                        </span>
                      }
                    />
                  ))}
                </SelectionList>

                {selectedEvaluation ? (
                  <DetailPanel title="Detalhe da avaliação">
                    {renderEvaluationDetail(selectedEvaluation)}
                  </DetailPanel>
                ) : (
                  <DetailPanelEmpty message="Seleciona uma avaliação da lista." />
                )}
              </div>
            ) : (
              <DetailPanelEmpty message="Seleciona um mês da lista." />
            )
          }
        />
      )}
    </div>
  );
}

export default AdminEvaluations;
