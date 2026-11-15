import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons } from "../services/lessonsService";
import { formatMonthYear, getCurrentMonthYear } from "../utils/dateUtils";
import {
  listTrainingUsage,
  usageStatusLabel,
  type TrainingUsageStatus,
} from "../utils/studentTrainingUsage";
import { studentPlanLabel } from "../utils/studentPaymentPlan";

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function statusTone(status: TrainingUsageStatus) {
  if (status === "over" || status === "pack_empty") return "is-over";
  if (status === "at_limit") return "is-limit";
  if (status === "ok") return "is-ok";
  return "is-muted";
}

function AdminTrainingQuota() {
  const current = getCurrentMonthYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [search, setSearch] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [studentsData, lessonsData] = await Promise.all([
        getStudents(),
        getLessons(),
      ]);
      setStudents(studentsData);
      setLessons(lessonsData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar quotas de treinos.");
    } finally {
      setLoading(false);
    }
  }

  const usageRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return listTrainingUsage(students, lessons, month, year).filter((row) => {
      if (onlyIssues && row.status !== "over" && row.status !== "pack_empty" && row.status !== "at_limit") {
        return false;
      }
      if (!term) return true;
      return row.studentName.toLowerCase().includes(term);
    });
  }, [students, lessons, month, year, search, onlyIssues]);

  const stats = useMemo(() => {
    const all = listTrainingUsage(students, lessons, month, year);
    return {
      over: all.filter((row) => row.status === "over" || row.status === "pack_empty")
        .length,
      atLimit: all.filter((row) => row.status === "at_limit").length,
      tracked: all.filter((row) => row.status !== "unlimited").length,
    };
  }, [students, lessons, month, year]);

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Gestão</p>
        <h1 className="page-title">Treinos por atleta</h1>
        <p className="page-description">
          Compara presentes com o limite mensal ou pack — para ver quem está a
          treinar a mais.
        </p>
      </header>

      <div className="payments-stats-strip">
        <div>
          <span>A mais / pack esgotado</span>
          <strong>{stats.over}</strong>
        </div>
        <div>
          <span>No limite</span>
          <strong>{stats.atLimit}</strong>
        </div>
        <div>
          <span>Com plano definido</span>
          <strong>{stats.tracked}</strong>
        </div>
        <div>
          <span>Período</span>
          <strong style={{ fontSize: 16 }}>
            {formatMonthYear(month, year)}
          </strong>
        </div>
      </div>

      <section className="card section-card">
        <div className="quota-toolbar">
          <label className="field-label">
            Mês
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Ano
            <input
              type="text"
              inputMode="numeric"
              value={String(year)}
              onChange={(event) =>
                setYear(Number(event.target.value.replace(/[^\d]/g, "")) || year)
              }
            />
          </label>

          <label className="field-label">
            Pesquisar
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome do aluno..."
            />
          </label>

          <label className="quota-filter-toggle">
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={(event) => setOnlyIssues(event.target.checked)}
            />
            Só alertas (a mais / limite / pack)
          </label>
        </div>

        {loading ? (
          <p className="muted">A carregar...</p>
        ) : usageRows.length === 0 ? (
          <p className="muted">
            {onlyIssues
              ? "Nenhum aluno acima do limite neste período."
              : "Sem alunos para mostrar."}
          </p>
        ) : (
          <div className="quota-table-wrap">
            <table className="data-table quota-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Plano</th>
                  <th>Feitos</th>
                  <th>Limite</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {usageRows.map((row) => {
                  const student = students.find(
                    (item) => item.id === row.studentId
                  );
                  return (
                    <tr key={row.studentId}>
                      <td className="data-table-primary" data-label="Aluno">
                        {row.studentName}
                      </td>
                      <td data-label="Plano">
                        {student
                          ? studentPlanLabel(student)
                          : row.billingType === "pack"
                            ? "Pack"
                            : "Mensalidade"}
                      </td>
                      <td data-label="Feitos">{row.done}</td>
                      <td data-label="Limite">
                        {row.billingType === "pack"
                          ? `${row.remaining ?? 0} por usar / ${row.limit}`
                          : row.limit > 0
                            ? row.limit
                            : "—"}
                      </td>
                      <td data-label="Estado">
                        <span
                          className={`quota-status ${statusTone(row.status)}`}
                        >
                          {usageStatusLabel(row.status)}
                          {row.overBy > 0 ? ` · +${row.overBy}` : ""}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminTrainingQuota;
