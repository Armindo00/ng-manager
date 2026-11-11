import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, Lesson } from "../types";
import type { VideoAnalysisSession } from "../types/videoAnalysis";
import { getCoaches } from "../services/coachesService";
import { getLessons } from "../services/lessonsService";
import { getVideoAnalysisSessions } from "../services/videoAnalysisService";
import {
  buildCoachMonthlyReport,
  shiftMonth,
} from "../utils/coachMonthlyActivity";
import {
  formatMonthYear,
  getCurrentMonthYear,
} from "../utils/dateUtils";

function AdminCoachActivity() {
  const current = getCurrentMonthYear();
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [videoSessions, setVideoSessions] = useState<VideoAnalysisSession[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [coachesData, lessonsData, videoData] = await Promise.all([
        getCoaches(),
        getLessons(),
        getVideoAnalysisSessions(),
      ]);
      setCoaches(coachesData);
      setLessons(lessonsData);
      setVideoSessions(videoData);
    } catch (error) {
      console.error(error);
      toast.error(
        "Erro ao carregar totais. Confirma se executaste video-analysis.sql no Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  const report = useMemo(
    () =>
      buildCoachMonthlyReport({
        coaches,
        lessons,
        videoSessions,
        month,
        year,
      }),
    [coaches, lessons, videoSessions, month, year]
  );

  const totals = useMemo(
    () =>
      report.reduce(
        (acc, row) => ({
          water: acc.water + row.waterSessions,
          video: acc.video + row.videoSessions,
          total: acc.total + row.total,
        }),
        { water: 0, video: 0, total: 0 }
      ),
    [report]
  );

  function changeMonth(delta: number) {
    const next = shiftMonth(month, year, delta);
    setMonth(next.month);
    setYear(next.year);
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Escala</p>
        <h1 className="page-title">Relatório mensal</h1>
        <p className="page-description">
          Totais do mês por treinador: água concluída + videoanálises.
        </p>
      </header>

      <div className="form-row" style={{ alignItems: "center", gap: "0.75rem" }}>
        <button type="button" className="compact-btn" onClick={() => changeMonth(-1)}>
          ←
        </button>
        <strong style={{ textTransform: "capitalize" }}>
          {formatMonthYear(month, year)}
        </strong>
        <button type="button" className="compact-btn" onClick={() => changeMonth(1)}>
          →
        </button>
      </div>

      {loading ? (
        <p className="muted">A carregar...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Treinos (água)</span>
              <strong className="stat-number">{totals.water}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Videoanálises</span>
              <strong className="stat-number">{totals.video}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Total da escola</span>
              <strong className="stat-number">{totals.total}</strong>
            </div>
          </div>

          <div className="card section-card">
            <h2>Por treinador</h2>

            {report.length === 0 ? (
              <p className="muted">Ainda não há treinadores.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Treinador</th>
                    <th>Água</th>
                    <th>Videoanálise</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((row) => (
                    <tr key={row.coachId}>
                      <td data-label="Treinador" className="data-table-primary">
                        <strong>{row.coachName}</strong>
                      </td>
                      <td data-label="Água">{row.waterSessions}</td>
                      <td data-label="Videoanálise">{row.videoSessions}</td>
                      <td data-label="Total">
                        <strong>{row.total}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminCoachActivity;
