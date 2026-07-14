import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import type { LessonCompensation } from "../types/compensation";
import { COMPENSATION_STATUS_LABELS } from "../types/compensation";
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
import FormField from "../components/FormField";
import {
  DetailPanel,
  DetailPanelEmpty,
  MasterDetailLayout,
  SelectionList,
  SelectionListItem,
} from "../components/MasterDetailLayout";

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
  const [selectedCompensationId, setSelectedCompensationId] = useState<string | null>(null);
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
      setSelectedCompensationId((current) => {
        if (current && compensationsData.some((item) => item.id === current)) {
          return current;
        }
        return compensationsData[0]?.id ?? null;
      });
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

  const selectedCompensation =
    visibleCompensations.find((item) => item.id === selectedCompensationId) ??
    compensations.find((item) => item.id === selectedCompensationId) ??
    null;

  useEffect(() => {
    if (selectedCompensation) {
      setAdminNotesDraft(selectedCompensation.adminNotes);
      setSelectedLessonId(selectedCompensation.compensationLessonId || "");
    }
  }, [selectedCompensation?.id]);

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

  async function handleSchedule(compensation: LessonCompensation) {
    if (!selectedLessonId) {
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
        { ...compensation, adminNotes: adminNotesDraft.trim() },
        lesson
      );
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

  async function saveAdminNotes(compensation: LessonCompensation) {
    try {
      await saveCompensation({
        ...compensation,
        adminNotes: adminNotesDraft.trim(),
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

  function renderCompensationDetail(compensation: LessonCompensation) {
    const scheduleOptions = getScheduleOptions(compensation);

    return (
      <>
        <p>
          <strong>Atleta:</strong> {getStudentName(compensation.studentId)}
        </p>
        <p>
          <strong>Treino perdido:</strong>{" "}
          {getLessonLabel(compensation.missedLessonId)}
        </p>
        <p>
          <strong>Justificação:</strong> {compensation.reason}
        </p>
        <p>
          <strong>Estado:</strong> {renderStatus(compensation)}
        </p>
        <p>
          <strong>Compensação:</strong>{" "}
          {getLessonLabel(compensation.compensationLessonId)}
        </p>

        <FormField label="Notas internas" htmlFor="compensation-admin-notes">
          <textarea
            id="compensation-admin-notes"
            rows={3}
            value={adminNotesDraft}
            onChange={(e) => setAdminNotesDraft(e.target.value)}
            placeholder="Ex: Compensar no grupo do sábado de manhã"
          />
        </FormField>

        <div className="student-response-actions" style={{ marginTop: 12 }}>
          <button
            disabled={saving}
            onClick={() => saveAdminNotes(compensation)}
          >
            Guardar notas
          </button>
        </div>

        {(compensation.status === "approved" ||
          compensation.status === "pending") && (
          <div className="compensation-schedule-form" style={{ marginTop: 20 }}>
            <FormField label="Treino de compensação" htmlFor="compensation-lesson">
              <select
                id="compensation-lesson"
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
              >
                <option value="">Selecionar treino publicado</option>
                {scheduleOptions.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {formatDateLabel(lesson.date)} · {lesson.time || "—"} ·{" "}
                    {lesson.groupName || "Treino"} · {lesson.coachName}
                  </option>
                ))}
              </select>
            </FormField>

            {scheduleOptions.length === 0 && (
              <p className="muted workflow-help">
                Não há treinos publicados futuros disponíveis para este atleta.
              </p>
            )}
          </div>
        )}

        <div className="student-response-actions" style={{ marginTop: 16 }}>
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
              className="primary-btn"
              disabled={saving || !selectedLessonId}
              onClick={() => handleSchedule(compensation)}
            >
              {saving ? "A guardar..." : "Colocar no treino"}
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
      </>
    );
  }

  return (
    <div>
      <h1 className="page-title">Compensações</h1>

      <p className="muted workflow-help">
        Seleciona um pedido na lista para validar a justificação e agendar a
        compensação.
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

          <MasterDetailLayout
            showDetail={Boolean(selectedCompensation)}
            list={
              <SelectionList
                title="Lista de compensações"
                toolbar={
                  <FormField label="Filtrar">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value as "active" | "all");
                        setSelectedCompensationId(null);
                      }}
                    >
                      <option value="active">Em aberto</option>
                      <option value="all">Todas</option>
                    </select>
                  </FormField>
                }
                empty={<p className="muted">Sem compensações para mostrar.</p>}
              >
                {visibleCompensations.map((compensation) => (
                  <SelectionListItem
                    key={compensation.id}
                    active={compensation.id === selectedCompensationId}
                    onClick={() => setSelectedCompensationId(compensation.id)}
                    title={getStudentName(compensation.studentId)}
                    subtitle={compensation.reason}
                    meta={getLessonLabel(compensation.missedLessonId)}
                    badge={renderStatus(compensation)}
                  />
                ))}
              </SelectionList>
            }
            detail={
              selectedCompensation ? (
                <DetailPanel title="Detalhe da compensação">
                  {renderCompensationDetail(selectedCompensation)}
                </DetailPanel>
              ) : (
                <DetailPanelEmpty message="Seleciona uma compensação da lista." />
              )
            }
          />
        </>
      )}
    </div>
  );
}

export default AdminCompensations;
