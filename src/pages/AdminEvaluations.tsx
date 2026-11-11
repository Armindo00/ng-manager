import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, MonthlyEvaluation, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import {
  deleteEvaluation,
  emptyEvaluation,
  finalizeAndSendEvaluation,
  getEvaluations,
  saveEvaluation,
} from "../services/evaluationsService";
import { formatMonthYear, getCurrentMonthYear } from "../utils/dateUtils";
import FormField from "../components/FormField";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  DetailPanel,
  DetailPanelEmpty,
  MasterDetailLayout,
  SelectionList,
  SelectionListItem,
} from "../components/MasterDetailLayout";

type Props = {
  user: User;
};

type MonthBucket = {
  key: string;
  month: number;
  year: number;
  evaluations: MonthlyEvaluation[];
};

type PanelMode = "view" | "create" | "edit";

function resultText(result: MonthlyEvaluation["goalResult"]) {
  if (result === "completed") return "Cumprido";
  if (result === "progress") return "Em progresso";
  return "Continuar";
}

function statusLabel(status: MonthlyEvaluation["status"]) {
  if (status === "sent") return "Enviada";
  if (status === "finalized") return "Finalizada";
  return "Rascunho";
}

function AdminEvaluations({ user }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [panelMode, setPanelMode] = useState<PanelMode>("view");
  const [form, setForm] = useState<MonthlyEvaluation>(emptyEvaluation(user.id));
  const [evaluationToDelete, setEvaluationToDelete] =
    useState<MonthlyEvaluation | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

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
    () => new Map(students.map((student) => [student.id, student])),
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

    // Keep an open month even without evaluations yet.
    const current = getCurrentMonthYear();
    const currentKey = `${current.year}-${String(current.month).padStart(2, "0")}`;
    if (!map.has(currentKey)) {
      map.set(currentKey, []);
    }

    const buckets: MonthBucket[] = Array.from(map.entries()).map(
      ([key, bucketEvaluations]) => {
        const [year, month] = key.split("-").map(Number);

        return {
          key,
          month,
          year,
          evaluations: [...bucketEvaluations].sort((a, b) =>
            (studentMap.get(a.studentId)?.name || "").localeCompare(
              studentMap.get(b.studentId)?.name || "",
              "pt"
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
      const studentName = studentMap.get(evaluation.studentId)?.name || "";
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
    if (panelMode !== "view") return;

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
  }, [visibleEvaluations, selectedEvaluationId, panelMode]);

  const selectedEvaluation =
    visibleEvaluations.find((item) => item.id === selectedEvaluationId) ??
    null;

  function getStudentName(studentId: string) {
    return studentMap.get(studentId)?.name || "Aluno";
  }

  function getCoachName(coachId: string) {
    return coachMap.get(coachId) || user.name || "Treinador";
  }

  function startCreate() {
    const period = selectedMonth
      ? { month: selectedMonth.month, year: selectedMonth.year }
      : getCurrentMonthYear();
    const draft = {
      ...emptyEvaluation(user.id),
      month: period.month,
      year: period.year,
    };
    const teste = students.find(
      (student) => student.name.trim().toLowerCase() === "teste"
    );
    if (teste) draft.studentId = teste.id;
    setForm(draft);
    setShareUrl(null);
    setPanelMode("create");
  }

  function startEdit(evaluation: MonthlyEvaluation) {
    setForm({ ...evaluation });
    setShareUrl(null);
    setPanelMode("edit");
  }

  function cancelForm() {
    setPanelMode("view");
    setShareUrl(null);
  }

  async function saveDraft() {
    if (!form.studentId) {
      toast.error("Escolhe o aluno.");
      return;
    }
    if (!form.technicalGoal.trim()) {
      toast.error("Indica o objetivo técnico.");
      return;
    }

    try {
      setSaving(true);
      const next: MonthlyEvaluation = {
        ...form,
        technicalGoal: form.technicalGoal.trim(),
        coachComment: form.coachComment.trim(),
        nextGoal: form.nextGoal.trim(),
        status: form.status === "sent" ? "sent" : "draft",
        coachId: form.coachId || user.id,
      };
      await saveEvaluation(next);
      await loadData();
      setSelectedMonthKey(
        `${next.year}-${String(next.month).padStart(2, "0")}`
      );
      setSelectedEvaluationId(next.id);
      setPanelMode("view");
      toast.success("Avaliação guardada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar avaliação.");
    } finally {
      setSaving(false);
    }
  }

  async function finalizeAndSend(evaluation: MonthlyEvaluation) {
    if (!evaluation.studentId) {
      toast.error("Escolhe o aluno antes de enviar.");
      return;
    }

    try {
      setSaving(true);

      // Ensure latest draft exists before send.
      if (panelMode === "create" || panelMode === "edit") {
        const draft: MonthlyEvaluation = {
          ...form,
          technicalGoal: form.technicalGoal.trim(),
          coachComment: form.coachComment.trim(),
          nextGoal: form.nextGoal.trim(),
          status: "draft",
          coachId: form.coachId || user.id,
        };
        if (!draft.studentId || !draft.technicalGoal) {
          toast.error("Preenche aluno e objetivo técnico.");
          return;
        }
        await saveEvaluation(draft);
        evaluation = draft;
      }

      const result = await finalizeAndSendEvaluation(evaluation.id);
      setShareUrl(result.shareUrl);
      await loadData();
      setSelectedEvaluationId(evaluation.id);
      setPanelMode("view");

      if (result.emailed) {
        toast.success(`Avaliação enviada para ${result.studentEmail}.`);
      } else if (result.emailReason === "missing_student_email") {
        toast.error("O aluno não tem email. Copia o link para partilhar.");
      } else if (result.studentEmail) {
        toast.success(
          "Avaliação finalizada. Usa Abrir email ou copia o link para enviar."
        );
      } else {
        toast.success("Avaliação finalizada.");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar avaliação."
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!evaluationToDelete) return;

    try {
      await deleteEvaluation(evaluationToDelete.id);
      setEvaluationToDelete(null);
      setShareUrl(null);
      await loadData();
      toast.success("Avaliação eliminada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao eliminar avaliação.");
    }
  }

  function openMailto(evaluation: MonthlyEvaluation, url: string) {
    const student = studentMap.get(evaluation.studentId);
    if (!student?.email) {
      toast.error("Este aluno não tem email.");
      return;
    }

    const subject = encodeURIComponent(
      `Avaliação ${formatMonthYear(evaluation.month, evaluation.year)} · NextGeneration`
    );
    const body = encodeURIComponent(
      `Olá ${student.name},\n\nA tua avaliação mensal já está disponível:\n${url}\n\nNextGeneration Surf School`
    );
    window.location.href = `mailto:${student.email}?subject=${subject}&body=${body}`;
  }

  async function copyShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  function renderForm() {
    const selectedStudent = studentMap.get(form.studentId);

    return (
      <DetailPanel
        title={panelMode === "edit" ? "Editar avaliação" : "Nova avaliação"}
        onBack={cancelForm}
        actions={
          <div className="detail-panel-actions">
            <button className="compact-btn" onClick={cancelForm} disabled={saving}>
              Cancelar
            </button>
            <button className="compact-btn" onClick={saveDraft} disabled={saving}>
              Guardar rascunho
            </button>
            <button
              className="primary-btn"
              onClick={() => finalizeAndSend(form)}
              disabled={saving}
            >
              {saving ? "A enviar..." : "Finalizar e enviar"}
            </button>
          </div>
        }
      >
        <div className="form-fields-grid">
          <FormField label="Aluno">
            <select
              value={form.studentId}
              onChange={(e) =>
                setForm((current) => ({ ...current, studentId: e.target.value }))
              }
            >
              <option value="">Selecionar aluno</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                  {student.email ? ` · ${student.email}` : " · sem email"}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Mês">
            <input
              type="number"
              min={1}
              max={12}
              value={form.month}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  month: Number(e.target.value) || 1,
                }))
              }
            />
          </FormField>

          <FormField label="Ano">
            <input
              type="number"
              min={2020}
              max={2100}
              value={form.year}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  year: Number(e.target.value) || current.year,
                }))
              }
            />
          </FormField>

          <FormField label="Empenho (1-5)">
            <input
              type="number"
              min={1}
              max={5}
              value={form.effort}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  effort: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                }))
              }
            />
          </FormField>

          <FormField label="Presença (%)">
            <input
              type="number"
              min={0}
              max={100}
              value={form.attendance}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  attendance: Math.min(
                    100,
                    Math.max(0, Number(e.target.value) || 0)
                  ),
                }))
              }
            />
          </FormField>

          <FormField label="Resultado do objetivo">
            <select
              value={form.goalResult}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  goalResult: e.target.value as MonthlyEvaluation["goalResult"],
                }))
              }
            >
              <option value="completed">Cumprido</option>
              <option value="progress">Em progresso</option>
              <option value="continue">Continuar</option>
            </select>
          </FormField>

          <FormField label="Objetivo técnico">
            <input
              placeholder="Ex: Bottom turn consistente"
              value={form.technicalGoal}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  technicalGoal: e.target.value,
                }))
              }
            />
          </FormField>

          <FormField label="Próximo objetivo">
            <input
              placeholder="Ex: Trabalhar cutback"
              value={form.nextGoal}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  nextGoal: e.target.value,
                }))
              }
            />
          </FormField>
        </div>

        <FormField label="Comentário do treinador">
          <textarea
            rows={4}
            placeholder="Notas para o atleta..."
            value={form.coachComment}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                coachComment: e.target.value,
              }))
            }
          />
        </FormField>

        {selectedStudent && (
          <p className="muted evaluation-email-hint">
            Destino do envio:{" "}
            {selectedStudent.email?.includes("@")
              ? selectedStudent.email
              : "este aluno ainda não tem email"}
          </p>
        )}
      </DetailPanel>
    );
  }

  function renderEvaluationDetail(evaluation: MonthlyEvaluation) {
    const student = studentMap.get(evaluation.studentId);
    const url =
      shareUrl ||
      (evaluation.shareToken
        ? `${window.location.origin}${window.location.pathname}#/avaliacao/${evaluation.shareToken}`
        : null);

    return (
      <>
        <div className="evaluation-detail-card">
          <p>
            <strong>Aluno:</strong> {getStudentName(evaluation.studentId)}
          </p>
          <p>
            <strong>Email:</strong>{" "}
            {student?.email?.includes("@") ? student.email : "—"}
          </p>
          <p>
            <strong>Treinador:</strong> {getCoachName(evaluation.coachId)}
          </p>
          <p>
            <strong>Período:</strong>{" "}
            {formatMonthYear(evaluation.month, evaluation.year)}
          </p>
          <p>
            <strong>Estado:</strong> {statusLabel(evaluation.status)}
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
            <strong>Próximo objetivo:</strong> {evaluation.nextGoal || "—"}
          </p>
        </div>

        <div className="evaluation-actions">
          {evaluation.status === "draft" && (
            <>
              <button
                className="compact-btn"
                disabled={saving}
                onClick={() => startEdit(evaluation)}
              >
                Editar
              </button>
              <button
                className="primary-btn"
                disabled={saving}
                onClick={() => finalizeAndSend(evaluation)}
              >
                Finalizar e enviar
              </button>
            </>
          )}

          {evaluation.status !== "draft" && (
            <button
              className="primary-btn"
              disabled={saving}
              onClick={() => finalizeAndSend(evaluation)}
            >
              Reenviar
            </button>
          )}

          {url && (
            <>
              <button className="compact-btn" onClick={() => copyShareUrl(url)}>
                Copiar link
              </button>
              <button
                className="compact-btn"
                onClick={() => openMailto(evaluation, url)}
              >
                Abrir email
              </button>
              <a className="compact-btn" href={url} target="_blank" rel="noreferrer">
                Ver página pública
              </a>
            </>
          )}

          <button
            className="danger-btn compact-btn"
            onClick={() => setEvaluationToDelete(evaluation)}
          >
            Eliminar
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Gestão</p>
        <h1 className="page-title">Avaliações</h1>
        <p className="page-description">
          Cria a avaliação, finaliza e envia ao atleta por email (ou link).
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar avaliações...</p>
      ) : (
        <MasterDetailLayout
          showDetail
          list={
            <SelectionList
              title="Meses"
              toolbar={
                <button type="button" className="primary-btn" onClick={startCreate}>
                  Nova
                </button>
              }
              empty={<p className="muted">Sem meses.</p>}
            >
              {monthBuckets.map((bucket) => (
                <SelectionListItem
                  key={bucket.key}
                  active={bucket.key === selectedMonthKey && panelMode === "view"}
                  onClick={() => {
                    setSelectedMonthKey(bucket.key);
                    setSelectedEvaluationId(null);
                    setSearch("");
                    setPanelMode("view");
                    setShareUrl(null);
                  }}
                  title={formatMonthYear(bucket.month, bucket.year)}
                  subtitle={`${bucket.evaluations.length} avaliação(ões)`}
                  meta={String(bucket.year)}
                />
              ))}
            </SelectionList>
          }
          detail={
            panelMode === "create" || panelMode === "edit" ? (
              renderForm()
            ) : selectedMonth ? (
              <div className="lesson-day-master-detail">
                <SelectionList
                  title={formatMonthYear(selectedMonth.month, selectedMonth.year)}
                  toolbar={
                    <input
                      className="search-input"
                      placeholder="Pesquisar aluno..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  }
                  empty={
                    <p className="muted">
                      Sem avaliações neste mês. Cria a primeira com Nova.
                    </p>
                  }
                >
                  {visibleEvaluations.map((evaluation) => (
                    <SelectionListItem
                      key={evaluation.id}
                      active={evaluation.id === selectedEvaluationId}
                      onClick={() => {
                        setSelectedEvaluationId(evaluation.id);
                        setShareUrl(null);
                      }}
                      title={getStudentName(evaluation.studentId)}
                      subtitle={evaluation.technicalGoal || "Sem objetivo"}
                      meta={`${statusLabel(evaluation.status)} · ${getCoachName(evaluation.coachId)}`}
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

      {evaluationToDelete && (
        <ConfirmDialog
          title="Eliminar avaliação"
          message={`Eliminar a avaliação de ${getStudentName(evaluationToDelete.studentId)}?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDelete}
          onCancel={() => setEvaluationToDelete(null)}
        />
      )}
    </div>
  );
}

export default AdminEvaluations;
