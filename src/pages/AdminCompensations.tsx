import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Modal from "../components/Modal";
import type { Lesson, Student } from "../types";
import type { LessonCompensation } from "../types/compensation";
import {
  COMPENSATION_STATUS_LABELS,
} from "../types/compensation";
import { getStudents } from "../services/studentsService";
import { getLessons } from "../services/lessonsService";
import {
  getCompensations,
  saveCompensation,
  scheduleCompensation,
  syncCompletedCompensations,
  updateCompensationStatus,
} from "../services/compensationsService";
import { getTodayDate } from "../utils/vanTasks";

function formatDateLabel(date: string | null) {
  if (!date) return "—";

  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AdminCompensations() {
  const [compensations, setCompensations] = useState<LessonCompensation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [scheduling, setScheduling] = useState<LessonCompensation | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [adminNotesDraft, setAdminNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      await syncCompletedCompensations();
      const [compensationsData, studentsData, lessonsData] = await Promise.all([
        getCompensations(),
        getStudents(),
        getLessons(),
      ]);
      setCompensations(compensationsData);
      setStudents(studentsData);
      setLessons(lessonsData);
    } catch (error) {
      console.error(error);
      toast.error(
        "Erro ao carregar compensações. Confirma se executaste o SQL compensations.sql no Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  const today = getTodayDate();

  const visibleCompensations = useMemo(() => {
    const sorted = [...compensations].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );

    if (statusFilter === "all") return sorted;

    return sorted.filter((item) =>
      ["pending", "approved", "scheduled"].includes(item.status)
    );
  }, [compensations, statusFilter]);

  const stats = useMemo(() => {
    return {
      pending: compensations.filter((item) => item.status === "pending").length,
      approved: compensations.filter((item) => item.status === "approved").length,
      scheduled: compensations.filter((item) => item.status === "scheduled").length,
      completed: compensations.filter((item) => item.status === "completed").length,
    };
  }, [compensations]);

  function getStudentName(studentId: string) {
    return students.find((student) => student.id === studentId)?.name || "Aluno";
  }

  function getLessonLabel(lessonId: string | null) {
    if (!lessonId) return "—";

    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return "Treino removido";

    return `${formatDateLabel(lesson.date)} · ${lesson.groupName || "Treino"} · ${lesson.coachName}`;
  }

  function openScheduleModal(compensation: LessonCompensation) {
    setScheduling(compensation);
    setSelectedLessonId("");
    setAdminNotesDraft(compensation.adminNotes);
  }

  function getScheduleOptions(compensation: LessonCompensation) {
    return lessons
      .filter(
        (lesson) =>
          lesson.status === "published" &&
          lesson.date >= today &&
          lesson.id !== compensation.missedLessonId &&
          !lesson.bookedStudentIds.includes(compensation.studentId)
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async function handleApprove(compensation: LessonCompensation) {
    try {
      setSaving(true);
      await updateCompensationStatus(compensation, "approved", compensation.adminNotes);
      await loadData();
      toast.success("Justificação aprovada. Podes agendar a compensação.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao aprovar justificação.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(compensation: LessonCompensation) {
    try {
      setSaving(true);
      await updateCompensationStatus(compensation, "rejected", compensation.adminNotes);
      await loadData();
      toast.success("Justificação rejeitada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao rejeitar justificação.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSchedule() {
    if (!scheduling || !selectedLessonId) {
      toast.error("Seleciona o treino de compensação.");
      return;
    }

    const lesson = lessons.find((item) => item.id === selectedLessonId);
    if (!lesson) {
      toast.error("Treino não encontrado.");
      return;
    }

    try {
      setSaving(true);
      await scheduleCompensation(
        { ...scheduling, adminNotes: adminNotesDraft.trim() },
        lesson
      );
      setScheduling(null);
      await loadData();
      toast.success("Aluno colocado no treino de compensação.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao agendar compensação.");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(compensation: LessonCompensation) {
    try {
      setSaving(true);
      await updateCompensationStatus(compensation, "completed", compensation.adminNotes);
      await loadData();
      toast.success("Compensação marcada como concluída.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao concluir compensação.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAdminNotes(compensation: LessonCompensation, notes: string) {
    try {
      await saveCompensation({
        ...compensation,
        adminNotes: notes.trim(),
      });
      await loadData();
      toast.success("Notas guardadas.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar notas.");
    }
  }

  function renderStatus(compensation: LessonCompensation) {
    return (
      <span className={`compensation-status compensation-status-${compensation.status}`}>
        {COMPENSATION_STATUS_LABELS[compensation.status]}
      </span>
    );
  }

  return (
    <div>
      <h1 className="page-title">Compensações</h1>

      <p className="muted workflow-help">
        Quando um atleta não vai ao treino com justificação, o pedido aparece
        aqui. Valida a justificação e coloca o atleta num treino futuro para
        compensar a ausência.
      </p>

      {loading ? (
        <p className="muted">A carregar compensações...</p>
      ) : (
        <>
          {stats.pending > 0 && (
            <div className="van-alert van-alert-danger">
              <strong>{stats.pending} pedido(s) por validar.</strong> Revê as
              justificações dos atletas.
            </div>
          )}

          <div className="stats-grid">
            <div className="card">
              <span className="stat-label">Por validar</span>
              <strong className="stat-number">{stats.pending}</strong>
            </div>
            <div className="card">
              <span className="stat-label">A agendar</span>
              <strong className="stat-number">{stats.approved}</strong>
            </div>
            <div className="card">
              <span className="stat-label">Agendadas</span>
              <strong className="stat-number">{stats.scheduled}</strong>
            </div>
            <div className="card">
              <span className="stat-label">Compensadas</span>
              <strong className="stat-number">{stats.completed}</strong>
            </div>
          </div>

          <div className="card section-card">
            <div className="table-header">
              <h2>Lista de compensações</h2>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "active" | "all")
                }
              >
                <option value="active">Em aberto</option>
                <option value="all">Todas</option>
              </select>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Atleta</th>
                  <th>Treino perdido</th>
                  <th>Justificação</th>
                  <th>Estado</th>
                  <th>Compensação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleCompensations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Sem compensações para mostrar.
                    </td>
                  </tr>
                )}

                {visibleCompensations.map((compensation) => (
                  <tr key={compensation.id}>
                    <td className="data-table-primary" data-label="Atleta">
                      <strong>{getStudentName(compensation.studentId)}</strong>
                    </td>
                    <td data-label="Treino perdido">
                      {getLessonLabel(compensation.missedLessonId)}
                    </td>
                    <td data-label="Justificação">
                      <strong>{compensation.reason}</strong>
                      {compensation.adminNotes && (
                        <>
                          <br />
                          <small className="muted">
                            Notas admin: {compensation.adminNotes}
                          </small>
                        </>
                      )}
                    </td>
                    <td data-label="Estado">{renderStatus(compensation)}</td>
                    <td data-label="Compensação">
                      {getLessonLabel(compensation.compensationLessonId)}
                    </td>
                    <td data-label="Ações">
                      <div className="student-row-actions">
                        {compensation.status === "pending" && (
                          <>
                            <button
                              className="compact-btn"
                              disabled={saving}
                              onClick={() => handleApprove(compensation)}
                            >
                              Aprovar
                            </button>
                            <button
                              className="compact-btn danger-btn"
                              disabled={saving}
                              onClick={() => handleReject(compensation)}
                            >
                              Rejeitar
                            </button>
                          </>
                        )}

                        {(compensation.status === "approved" ||
                          compensation.status === "pending") && (
                          <button
                            className="compact-btn primary-btn"
                            disabled={saving}
                            onClick={() => openScheduleModal(compensation)}
                          >
                            Agendar
                          </button>
                        )}

                        {compensation.status === "scheduled" && (
                          <button
                            className="compact-btn"
                            disabled={saving}
                            onClick={() => handleComplete(compensation)}
                          >
                            Concluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {scheduling && (
        <Modal
          title={`Agendar compensação · ${getStudentName(scheduling.studentId)}`}
          onClose={() => setScheduling(null)}
        >
          <div className="compensation-schedule-form">
            <p className="muted">
              Treino perdido: {getLessonLabel(scheduling.missedLessonId)}
            </p>
            <p>
              <strong>Justificação:</strong> {scheduling.reason}
            </p>

            <label className="field-label" htmlFor="compensation-lesson">
              Treino de compensação
            </label>
            <select
              id="compensation-lesson"
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
            >
              <option value="">Selecionar treino publicado</option>
              {getScheduleOptions(scheduling).map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {formatDateLabel(lesson.date)} · {lesson.time || "—"} ·{" "}
                  {lesson.groupName || "Treino"} · {lesson.coachName}
                </option>
              ))}
            </select>

            {getScheduleOptions(scheduling).length === 0 && (
              <p className="muted workflow-help">
                Não há treinos publicados futuros disponíveis para este atleta.
                Publica um treino no calendário primeiro.
              </p>
            )}

            <label className="field-label" htmlFor="compensation-admin-notes">
              Notas internas (opcional)
            </label>
            <textarea
              id="compensation-admin-notes"
              rows={3}
              value={adminNotesDraft}
              onChange={(e) => setAdminNotesDraft(e.target.value)}
              placeholder="Ex: Compensar no grupo do sábado de manhã"
            />

            <div className="student-response-actions">
              <button
                className="primary-btn"
                disabled={saving || !selectedLessonId}
                onClick={handleSchedule}
              >
                {saving ? "A guardar..." : "Colocar no treino"}
              </button>
              <button
                disabled={saving}
                onClick={() =>
                  saveAdminNotes(scheduling, adminNotesDraft)
                }
              >
                Guardar notas
              </button>
              <button disabled={saving} onClick={() => setScheduling(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminCompensations;
