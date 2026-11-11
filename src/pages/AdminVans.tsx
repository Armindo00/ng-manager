import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ActionButtons from "../components/ActionButtons";
import FormField from "../components/FormField";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  DetailPanel,
  MasterDetailLayout,
  SelectionList,
  SelectionListItem,
} from "../components/MasterDetailLayout";
import type { Van, VanTask, VanTaskType } from "../types/van";
import {
  VAN_TASK_STATUS_LABELS,
  VAN_TASK_TYPE_LABELS,
} from "../types/van";
import {
  completeVanTask,
  deleteVan,
  deleteVanTask,
  getVanTasks,
  getVans,
  reopenVanTask,
  saveVan,
  saveVanTask,
} from "../services/vansService";
import {
  getNextTaskDate,
  getTodayDate,
  getVanTaskStatus,
  sortVanTasks,
} from "../utils/vanTasks";
import { formatVanCapacity } from "../utils/vanCapacity";

const emptyVan = (): Van => ({
  id: "",
  name: "",
  plate: "",
  brand: "",
  model: "",
  year: "",
  capacity: "",
  notes: "",
  active: true,
});

type FleetFilter = "active" | "all";
type TaskFilter = "open" | "all";
type PanelMode = "view" | "create" | "edit";

function formatDateLabel(date: string | null) {
  if (!date) return "—";

  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function vanSpecs(van: Van) {
  return [
    [van.brand, van.model, van.year].filter(Boolean).join(" "),
    formatVanCapacity(van.capacity),
  ]
    .filter(Boolean)
    .join(" · ");
}

function AdminVans() {
  const [vans, setVans] = useState<Van[]>([]);
  const [tasks, setTasks] = useState<VanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [fleetFilter, setFleetFilter] = useState<FleetFilter>("active");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("open");
  const [selectedVanId, setSelectedVanId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("view");
  const [vanForm, setVanForm] = useState<Van>(emptyVan());
  const [vanToDelete, setVanToDelete] = useState<Van | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<VanTask | null>(null);
  const [savingVan, setSavingVan] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const [taskDraft, setTaskDraft] = useState({
    title: "",
    taskType: "inspection" as VanTaskType,
    dueDate: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [vansData, tasksData] = await Promise.all([getVans(), getVanTasks()]);
      setVans(vansData);
      setTasks(tasksData);
    } catch (error) {
      console.error(error);
      toast.error(
        "Erro ao carregar carrinhas. Confirma se executaste o SQL vans.sql no Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  const today = getTodayDate();

  const stats = useMemo(() => {
    const openTasks = tasks.filter((task) => !task.completed);
    const overdue = openTasks.filter(
      (task) => getVanTaskStatus(task, today) === "overdue"
    );
    const dueSoon = openTasks.filter(
      (task) => getVanTaskStatus(task, today) === "due_soon"
    );

    return {
      vans: vans.filter((van) => van.active).length,
      openTasks: openTasks.length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
    };
  }, [tasks, today, vans]);

  const visibleVans = useMemo(() => {
    const filtered =
      fleetFilter === "active" ? vans.filter((van) => van.active) : vans;

    return [...filtered].sort((a, b) => {
      const overdueA = tasks.filter(
        (task) =>
          task.vanId === a.id &&
          !task.completed &&
          getVanTaskStatus(task, today) === "overdue"
      ).length;
      const overdueB = tasks.filter(
        (task) =>
          task.vanId === b.id &&
          !task.completed &&
          getVanTaskStatus(task, today) === "overdue"
      ).length;

      if (overdueB !== overdueA) return overdueB - overdueA;
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name, "pt");
    });
  }, [fleetFilter, tasks, today, vans]);

  const selectedVan =
    visibleVans.find((van) => van.id === selectedVanId) ??
    vans.find((van) => van.id === selectedVanId) ??
    null;

  useEffect(() => {
    if (panelMode !== "view") return;
    if (!selectedVanId) return;
    if (visibleVans.some((van) => van.id === selectedVanId)) return;
    setSelectedVanId(visibleVans[0]?.id ?? null);
  }, [panelMode, selectedVanId, visibleVans]);

  const selectedVanTasks = useMemo(() => {
    if (!selectedVan) return [];
    const vanTasks = sortVanTasks(
      tasks.filter((task) => task.vanId === selectedVan.id)
    );
    return taskFilter === "open"
      ? vanTasks.filter((task) => !task.completed)
      : vanTasks;
  }, [selectedVan, taskFilter, tasks]);

  function startCreateVan() {
    setVanForm(emptyVan());
    setPanelMode("create");
    setSelectedVanId(null);
  }

  function startEditVan(van: Van) {
    setVanForm({
      ...van,
      capacity: formatVanCapacity(van.capacity),
    });
    setPanelMode("edit");
    setSelectedVanId(van.id);
  }

  function cancelVanForm() {
    setVanForm(emptyVan());
    setPanelMode("view");
  }

  function selectVan(vanId: string) {
    if (panelMode === "view" && selectedVanId === vanId) {
      setSelectedVanId(null);
      return;
    }

    setSelectedVanId(vanId);
    setPanelMode("view");
    setTaskDraft({
      title: "",
      taskType: "inspection",
      dueDate: "",
      notes: "",
    });
  }

  function clearSelection() {
    setSelectedVanId(null);
    setPanelMode("view");
    setVanForm(emptyVan());
  }

  function startQuickTask(taskType: "inspection" | "revision") {
    setTaskDraft({
      title: taskType === "inspection" ? "Inspeção periódica" : "Revisão",
      taskType,
      dueDate: "",
      notes: "",
    });
  }

  async function saveVanForm() {
    if (!vanForm.name.trim() || !vanForm.plate.trim()) {
      toast.error("Indica o nome e a matrícula da carrinha.");
      return;
    }

    const van: Van = {
      ...vanForm,
      id: panelMode === "edit" && selectedVanId ? selectedVanId : crypto.randomUUID(),
      name: vanForm.name.trim(),
      plate: vanForm.plate.trim().toUpperCase(),
      brand: vanForm.brand.trim(),
      model: vanForm.model.trim(),
      year: vanForm.year.trim(),
      capacity: formatVanCapacity(vanForm.capacity),
      notes: vanForm.notes.trim(),
    };

    try {
      setSavingVan(true);
      await saveVan(van);
      await loadData();
      setSelectedVanId(van.id);
      setPanelMode("view");
      setVanForm(emptyVan());
      toast.success(panelMode === "edit" ? "Carrinha atualizada." : "Carrinha registada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar carrinha.");
    } finally {
      setSavingVan(false);
    }
  }

  async function addTask() {
    if (!selectedVan) return;

    if (!taskDraft.title.trim() || !taskDraft.dueDate) {
      toast.error("Preenche a descrição e a data limite.");
      return;
    }

    const task: VanTask = {
      id: crypto.randomUUID(),
      vanId: selectedVan.id,
      title: taskDraft.title.trim(),
      taskType: taskDraft.taskType,
      dueDate: taskDraft.dueDate,
      completed: false,
      completedAt: null,
      notes: taskDraft.notes.trim(),
    };

    try {
      setSavingTask(true);
      await saveVanTask(task);
      setTaskDraft({
        title: "",
        taskType: "inspection",
        dueDate: "",
        notes: "",
      });
      await loadData();
      toast.success("Tarefa adicionada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar tarefa.");
    } finally {
      setSavingTask(false);
    }
  }

  async function toggleTaskComplete(task: VanTask) {
    try {
      if (task.completed) {
        await reopenVanTask(task);
        toast.success("Tarefa reaberta.");
      } else {
        await completeVanTask(task);
        toast.success("Tarefa concluída.");
      }

      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar tarefa.");
    }
  }

  async function confirmDeleteVan() {
    if (!vanToDelete) return;

    try {
      await deleteVan(vanToDelete.id);
      if (selectedVanId === vanToDelete.id) {
        setSelectedVanId(null);
        setPanelMode("view");
      }
      setVanToDelete(null);
      await loadData();
      toast.success("Carrinha eliminada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao eliminar carrinha.");
    }
  }

  async function confirmDeleteTask() {
    if (!taskToDelete) return;

    try {
      await deleteVanTask(taskToDelete.id);
      setTaskToDelete(null);
      await loadData();
      toast.success("Tarefa removida.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover tarefa.");
    }
  }

  function renderTaskStatus(task: VanTask) {
    const status = getVanTaskStatus(task, today);

    return (
      <span className={`van-task-status van-task-status-${status}`}>
        {VAN_TASK_STATUS_LABELS[status]}
      </span>
    );
  }

  function renderVanForm() {
    return (
      <DetailPanel
        title={panelMode === "edit" ? "Editar carrinha" : "Nova carrinha"}
        onBack={cancelVanForm}
        actions={
          <div className="detail-panel-actions">
            <button className="compact-btn" onClick={cancelVanForm} disabled={savingVan}>
              Cancelar
            </button>
            <button className="primary-btn" onClick={saveVanForm} disabled={savingVan}>
              {savingVan
                ? "A guardar..."
                : panelMode === "edit"
                  ? "Guardar alterações"
                  : "Registar carrinha"}
            </button>
          </div>
        }
      >
        <div className="form-fields-grid">
          <FormField label="Nome da carrinha">
            <input
              placeholder="Ex: Carrinha azul"
              value={vanForm.name}
              onChange={(e) =>
                setVanForm((current) => ({ ...current, name: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Matrícula">
            <input
              placeholder="AA-00-BB"
              value={vanForm.plate}
              onChange={(e) =>
                setVanForm((current) => ({ ...current, plate: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Marca">
            <input
              placeholder="Ex: Opel"
              value={vanForm.brand}
              onChange={(e) =>
                setVanForm((current) => ({ ...current, brand: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Modelo">
            <input
              placeholder="Ex: Vivaro"
              value={vanForm.model}
              onChange={(e) =>
                setVanForm((current) => ({ ...current, model: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Ano">
            <input
              type="number"
              min={1990}
              max={2100}
              placeholder="Ex: 2020"
              value={vanForm.year}
              onChange={(e) =>
                setVanForm((current) => ({ ...current, year: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Lotação">
            <input
              inputMode="numeric"
              placeholder="Ex: 9"
              value={vanForm.capacity}
              onChange={(e) =>
                setVanForm((current) => ({
                  ...current,
                  capacity: formatVanCapacity(e.target.value),
                }))
              }
            />
          </FormField>
          <label className="van-active-toggle field-label">
            <span>Estado</span>
            <span className="van-active-toggle-control">
              <input
                type="checkbox"
                checked={vanForm.active}
                onChange={(e) =>
                  setVanForm((current) => ({
                    ...current,
                    active: e.target.checked,
                  }))
                }
              />
              Ativa
            </span>
          </label>
          <FormField label="Notas (opcional)">
            <input
              placeholder="Observações da frota"
              value={vanForm.notes}
              onChange={(e) =>
                setVanForm((current) => ({ ...current, notes: e.target.value }))
              }
            />
          </FormField>
        </div>
      </DetailPanel>
    );
  }

  function renderVanDetail(van: Van) {
    const vanTasks = tasks.filter((task) => task.vanId === van.id);
    const openCount = vanTasks.filter((task) => !task.completed).length;
    const overdueCount = vanTasks.filter(
      (task) =>
        !task.completed && getVanTaskStatus(task, today) === "overdue"
    ).length;
    const nextInspection = getNextTaskDate(vanTasks, "inspection");
    const nextRevision = getNextTaskDate(vanTasks, "revision");
    const specs = vanSpecs(van);

    return (
      <DetailPanel
        title={van.name}
        onBack={clearSelection}
        actions={
          <div className="detail-panel-actions">
            <ActionButtons
              onEdit={() => startEditVan(van)}
              onDelete={() => setVanToDelete(van)}
            />
          </div>
        }
      >
        <div className="van-detail-identity">
          <div>
            <span className="admin-section-kicker">Matrícula</span>
            <strong className="van-plate">{van.plate}</strong>
          </div>
          <div className="van-detail-meta">
            {specs && <span>{specs}</span>}
            <span className={van.active ? "van-state-active" : "van-state-inactive"}>
              {van.active ? "Ativa" : "Inativa"}
            </span>
          </div>
          {van.notes.trim() && <p className="muted van-detail-notes">{van.notes}</p>}
        </div>

        <div className="van-schedule-grid">
          <div className="van-schedule-card">
            <span className="stat-label">Próx. inspeção</span>
            <strong>{formatDateLabel(nextInspection)}</strong>
            <button
              type="button"
              className="compact-btn"
              onClick={() => startQuickTask("inspection")}
            >
              Agendar inspeção
            </button>
          </div>
          <div className="van-schedule-card">
            <span className="stat-label">Próx. revisão</span>
            <strong>{formatDateLabel(nextRevision)}</strong>
            <button
              type="button"
              className="compact-btn"
              onClick={() => startQuickTask("revision")}
            >
              Agendar revisão
            </button>
          </div>
          <div className="van-schedule-card">
            <span className="stat-label">Tarefas em aberto</span>
            <strong>{openCount}</strong>
            <span className="muted">
              {overdueCount > 0
                ? `${overdueCount} em atraso`
                : "Sem atrasos"}
            </span>
          </div>
        </div>

        <section className="van-task-section">
          <div className="admin-section-heading">
            <div>
              <span className="admin-section-kicker">Manutenção</span>
              <h2>Tarefas desta carrinha</h2>
            </div>
            <FormField label="Mostrar">
              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value as TaskFilter)}
              >
                <option value="open">Em aberto</option>
                <option value="all">Todas</option>
              </select>
            </FormField>
          </div>

          <div className="van-task-composer">
            <div className="form-fields-grid">
              <FormField label="Tipo">
                <select
                  value={taskDraft.taskType}
                  onChange={(e) =>
                    setTaskDraft((current) => ({
                      ...current,
                      taskType: e.target.value as VanTaskType,
                      title:
                        current.title.trim() ||
                        VAN_TASK_TYPE_LABELS[e.target.value as VanTaskType],
                    }))
                  }
                >
                  {Object.entries(VAN_TASK_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Descrição">
                <input
                  placeholder="Ex: Inspeção periódica"
                  value={taskDraft.title}
                  onChange={(e) =>
                    setTaskDraft((current) => ({
                      ...current,
                      title: e.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Data limite">
                <input
                  type="date"
                  value={taskDraft.dueDate}
                  onChange={(e) =>
                    setTaskDraft((current) => ({
                      ...current,
                      dueDate: e.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Notas">
                <input
                  placeholder="Opcional"
                  value={taskDraft.notes}
                  onChange={(e) =>
                    setTaskDraft((current) => ({
                      ...current,
                      notes: e.target.value,
                    }))
                  }
                />
              </FormField>
            </div>
            <div className="form-fields-actions">
              <button
                className="primary-btn"
                onClick={addTask}
                disabled={savingTask}
              >
                {savingTask ? "A guardar..." : "Adicionar tarefa"}
              </button>
            </div>
          </div>

          <div className="van-task-list">
            {selectedVanTasks.length === 0 ? (
              <p className="muted">Sem tarefas para mostrar nesta carrinha.</p>
            ) : (
              selectedVanTasks.map((task) => (
                <article key={task.id} className="van-task-row">
                  <div className="van-task-row-main">
                    <div className="van-task-row-title">
                      <strong>{task.title}</strong>
                      {renderTaskStatus(task)}
                    </div>
                    <span className="van-task-row-meta">
                      {VAN_TASK_TYPE_LABELS[task.taskType]} ·{" "}
                      {formatDateLabel(task.dueDate)}
                    </span>
                    {task.notes && (
                      <span className="muted van-task-row-notes">{task.notes}</span>
                    )}
                  </div>
                  <div className="student-row-actions">
                    <button
                      className="compact-btn"
                      onClick={() => toggleTaskComplete(task)}
                    >
                      {task.completed ? "Reabrir" : "Concluir"}
                    </button>
                    <ActionButtons onDelete={() => setTaskToDelete(task)} />
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </DetailPanel>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Gestão</p>
        <h1 className="page-title">Carrinhas</h1>
        <p className="page-description">
          Frota ativa, inspeções e revisões — tudo por carrinha, com alertas em
          destaque.
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar carrinhas...</p>
      ) : (
        <>
          {stats.overdue > 0 && (
            <div className="van-alert van-alert-danger">
              <strong>
                {stats.overdue} tarefa{stats.overdue === 1 ? "" : "s"} em atraso.
              </strong>{" "}
              Abre a carrinha correspondente e conclui ou reagenda.
            </div>
          )}

          <div className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Carrinhas ativas</span>
              <strong className="stat-number">{stats.vans}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Tarefas em aberto</span>
              <strong className="stat-number">{stats.openTasks}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Em atraso</span>
              <strong className="stat-number">{stats.overdue}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Próximas (14 dias)</span>
              <strong className="stat-number">{stats.dueSoon}</strong>
            </div>
          </div>

          <MasterDetailLayout
            showDetail={panelMode !== "view" || Boolean(selectedVan)}
            emptyDetail={null}
            list={
              <SelectionList
                title="Frota"
                toolbar={
                  <div className="van-fleet-toolbar">
                    <FormField label="Filtrar">
                      <select
                        value={fleetFilter}
                        onChange={(e) =>
                          setFleetFilter(e.target.value as FleetFilter)
                        }
                      >
                        <option value="active">Ativas</option>
                        <option value="all">Todas</option>
                      </select>
                    </FormField>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={startCreateVan}
                    >
                      Nova
                    </button>
                  </div>
                }
                empty={<p className="muted">Ainda não há carrinhas registadas.</p>}
              >
                {visibleVans.map((van) => {
                  const vanTasks = tasks.filter((task) => task.vanId === van.id);
                  const openCount = vanTasks.filter((task) => !task.completed)
                    .length;
                  const overdueCount = vanTasks.filter(
                    (task) =>
                      !task.completed &&
                      getVanTaskStatus(task, today) === "overdue"
                  ).length;
                  const specs = vanSpecs(van);

                  return (
                    <SelectionListItem
                      key={van.id}
                      active={
                        panelMode === "view" && van.id === selectedVanId
                      }
                      onClick={() => selectVan(van.id)}
                      title={van.name}
                      subtitle={`${van.plate}${specs ? ` · ${specs}` : ""}`}
                      meta={
                        !van.active
                          ? "Inativa"
                          : openCount > 0
                            ? `${openCount} em aberto`
                            : "Sem tarefas em aberto"
                      }
                      badge={
                        overdueCount > 0 ? (
                          <span className="van-overdue-badge">{overdueCount}</span>
                        ) : undefined
                      }
                    />
                  );
                })}
              </SelectionList>
            }
            detail={
              panelMode === "create" || panelMode === "edit"
                ? renderVanForm()
                : selectedVan
                  ? renderVanDetail(selectedVan)
                  : null
            }
          />
        </>
      )}

      {vanToDelete && (
        <ConfirmDialog
          title="Eliminar carrinha"
          message={`Eliminar a carrinha ${vanToDelete.name}?`}
          consequences={[
            "A carrinha é removida da frota.",
            "Todas as tarefas associadas também são apagadas.",
            "Esta ação não pode ser desfeita.",
          ]}
          confirmText="Eliminar carrinha"
          cancelText="Cancelar"
          onConfirm={confirmDeleteVan}
          onCancel={() => setVanToDelete(null)}
        />
      )}

      {taskToDelete && (
        <ConfirmDialog
          title="Remover tarefa"
          message={`Remover a tarefa "${taskToDelete.title}"?`}
          confirmText="Remover"
          cancelText="Cancelar"
          onConfirm={confirmDeleteTask}
          onCancel={() => setTaskToDelete(null)}
        />
      )}
    </div>
  );
}

export default AdminVans;
