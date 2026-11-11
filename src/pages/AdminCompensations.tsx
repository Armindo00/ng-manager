import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import type { LessonCompensation } from "../types/compensation";
import { COMPENSATION_STATUS_LABELS } from "../types/compensation";
import { getStudents } from "../services/studentsService";
import { getLessons } from "../services/lessonsService";
import {
  countOpenCompensations,
  getCompensations,
  isOpenCompensation,
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

type StudentBucket = {
  studentId: string;
  name: string;
  openCount: number;
  items: LessonCompensation[];
};

function AdminCompensations() {
  const [compensations, setCompensations] = useState<LessonCompensation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [selectedCompensationId, setSelectedCompensationId] = useState<
    string | null
  >(null);
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

  const studentBuckets = useMemo(() => {
    const map = new Map<string, StudentBucket>();

    for (const item of compensations) {
      if (statusFilter === "active" && !isOpenCompensation(item)) continue;

      const existing = map.get(item.studentId);
      if (existing) {
        existing.items.push(item);
        continue;
      }

      map.set(item.studentId, {
        studentId: item.studentId,
        name:
          students.find((student) => student.id === item.studentId)?.name ||
          "Aluno",
        openCount: 0,
        items: [item],
      });
    }

    for (const bucket of map.values()) {
      bucket.openCount = countOpenCompensations(
        compensations,
        bucket.studentId
      );
      bucket.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return [...map.values()].sort((a, b) => {
      if (b.openCount !== a.openCount) return b.openCount - a.openCount;
      return a.name.localeCompare(b.name, "pt");
    });
  }, [compensations, students, statusFilter]);

  const selectedBucket =
    studentBuckets.find((bucket) => bucket.studentId === selectedStudentId) ??
    null;

  const selectedCompensation =
    selectedBucket?.items.find((item) => item.id === selectedCompensationId) ??
    selectedBucket?.items[0] ??
    null;

  useEffect(() => {
    if (!selectedBucket) {
      setSelectedCompensationId(null);
      return;
    }

    setSelectedCompensationId((current) => {
      if (current && selectedBucket.items.some((item) => item.id === current)) {
        return current;
      }
      return selectedBucket.items[0]?.id ?? null;
    });
  }, [selectedBucket?.studentId, selectedBucket?.items]);

  useEffect(() => {
    if (selectedCompensation) {
      setAdminNotesDraft(selectedCompensation.adminNotes);
      setSelectedLessonId(selectedCompensation.compensationLessonId || "");
    }
  }, [selectedCompensation?.id]);

  const stats = useMemo(() => {
    return {
      studentsWithOpen: studentBuckets.filter((bucket) => bucket.openCount > 0)
        .length,
      open: compensations.filter((item) => isOpenCompensation(item)).length,
      scheduled: compensations.filter((item) => item.status === "scheduled")
        .length,
      completed: compensations.filter((item) => item.status === "completed")
        .length,
    };
  }, [compensations, studentBuckets]);

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
      await updateCompensationStatus(
        compensation,
        "approved",
        compensation.adminNotes
      );
      await loadData();
      toast.success("Compensação pronta a agendar.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao aprovar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(compensation: LessonCompensation) {
    try {
      setSaving(true);
      await updateCompensationStatus(
        compensation,
        "rejected",
        compensation.adminNotes
      );
      await loadData();
      toast.success("Compensação rejeitada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao rejeitar.");
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
      await updateCompensationStatus(
        compensation,
        "completed",
        compensation.adminNotes
      );
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
      <span
        className={`compensation-status compensation-status-${compensation.status}`}
      >
        {COMPENSATION_STATUS_LABELS[compensation.status]}
      </span>
    );
  }

  function renderCompensationDetail(compensation: LessonCompensation) {
    const scheduleOptions = getScheduleOptions(compensation);

    return (
      <>
        <p>
          <strong>Treino perdido:</strong>{" "}
          {getLessonLabel(compensation.missedLessonId)}
        </p>
        <p>
          <strong>Motivo:</strong> {compensation.reason}
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
            <FormField
              label="Treino de compensação"
              htmlFor="compensation-lesson"
            >
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
      <header className="page-header">
        <p className="page-eyebrow">Gestão</p>
        <h1 className="page-title">Compensações</h1>
        <p className="page-description">
          Alunos com treinos a compensar. Os treinadores também podem
          adicioná-los diretamente em Hoje.
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar compensações...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Alunos a compensar</span>
              <strong className="stat-number">{stats.studentsWithOpen}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Treinos em aberto</span>
              <strong className="stat-number">{stats.open}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Já agendados</span>
              <strong className="stat-number">{stats.scheduled}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Compensados</span>
              <strong className="stat-number">{stats.completed}</strong>
            </div>
          </div>

          <MasterDetailLayout
            showDetail={Boolean(selectedBucket)}
            list={
              <SelectionList
                title="Alunos"
                toolbar={
                  <FormField label="Filtrar">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value as "active" | "all");
                        setSelectedStudentId(null);
                      }}
                    >
                      <option value="active">Em aberto</option>
                      <option value="all">Todos</option>
                    </select>
                  </FormField>
                }
                empty={<p className="muted">Sem compensações para mostrar.</p>}
              >
                {studentBuckets.map((bucket) => (
                  <SelectionListItem
                    key={bucket.studentId}
                    active={bucket.studentId === selectedStudentId}
                    onClick={() => setSelectedStudentId(bucket.studentId)}
                    title={bucket.name}
                    subtitle={
                      bucket.openCount > 0
                        ? `${bucket.openCount} treino${
                            bucket.openCount === 1 ? "" : "s"
                          } a compensar`
                        : "Sem treinos em aberto"
                    }
                    meta={`${bucket.items.length} registo${
                      bucket.items.length === 1 ? "" : "s"
                    }`}
                    badge={
                      bucket.openCount > 0 ? (
                        <span className="compensation-count-badge">
                          {bucket.openCount}
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </SelectionList>
            }
            detail={
              selectedBucket ? (
                <DetailPanel
                  title={selectedBucket.name}
                  actions={
                    <span className="muted">
                      {selectedBucket.openCount} treino
                      {selectedBucket.openCount === 1 ? "" : "s"} a compensar
                    </span>
                  }
                >
                  <div className="compensation-student-items">
                    {selectedBucket.items.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={
                          item.id === selectedCompensation?.id
                            ? "compensation-item-chip active"
                            : "compensation-item-chip"
                        }
                        onClick={() => setSelectedCompensationId(item.id)}
                      >
                        <span>{getLessonLabel(item.missedLessonId)}</span>
                        {renderStatus(item)}
                      </button>
                    ))}
                  </div>

                  {selectedCompensation &&
                    renderCompensationDetail(selectedCompensation)}
                </DetailPanel>
              ) : (
                <DetailPanelEmpty message="Seleciona um aluno da lista." />
              )
            }
          />
        </>
      )}
    </div>
  );
}

export default AdminCompensations;
