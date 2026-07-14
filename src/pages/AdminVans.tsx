import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ActionButtons from "../components/ActionButtons";
import FormField from "../components/FormField";
import ConfirmDialog from "../components/ConfirmDialog";
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

function formatDateLabel(date: string | null) {
  if (!date) return "—";

  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AdminVans() {
  const [vans, setVans] = useState<Van[]>([]);
  const [tasks, setTasks] = useState<VanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVanId, setEditingVanId] = useState<string | null>(null);
  const [vanForm, setVanForm] = useState<Van>(emptyVan());
  const [taskFilter, setTaskFilter] = useState<"open" | "all">("open");
  const [vanToDelete, setVanToDelete] = useState<Van | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<VanTask | null>(null);
  const [taskFormHighlight, setTaskFormHighlight] = useState(false);
  const taskFormRef = useRef<HTMLDivElement>(null);

  const [taskDraft, setTaskDraft] = useState({
    vanId: "",
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

      if (!taskDraft.vanId && vansData[0]) {
        setTaskDraft((current) => ({ ...current, vanId: vansData[0].id }));
      }
    } catch (error) {
      console.error(error);
      toast.error(
        "Erro ao carregar carrinhas. Confirma se executaste o SQL vans.sql no Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  const sortedTasks = useMemo(() => sortVanTasks(tasks), [tasks]);

  const visibleTasks = useMemo(
    () =>
      taskFilter === "open"
        ? sortedTasks.filter((task) => !task.completed)
        : sortedTasks,
    [sortedTasks, taskFilter]
  );

  const stats = useMemo(() => {
    const today = getTodayDate();

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
  }, [tasks, vans]);

  function resetVanForm() {
    setVanForm(emptyVan());
    setEditingVanId(null);
  }

  function editVan(van: Van) {
    setVanForm({
      ...van,
      capacity: formatVanCapacity(van.capacity),
    });
    setEditingVanId(van.id);
  }

  function startVanTask(van: Van, taskType: "inspection" | "revision") {
    setTaskDraft({
      vanId: van.id,
      title: taskType === "inspection" ? "Inspeção periódica" : "Revisão",
      taskType,
      dueDate: "",
      notes: "",
    });
    setTaskFormHighlight(true);
    taskFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearTaskFormHighlight() {
    setTaskFormHighlight(false);
  }

  async function saveVanForm() {
    if (!vanForm.name.trim() || !vanForm.plate.trim()) {
      toast.error("Indica o nome e a matrícula da carrinha.");
      return;
    }

    const van: Van = {
      ...vanForm,
      id: editingVanId || crypto.randomUUID(),
      name: vanForm.name.trim(),
      plate: vanForm.plate.trim().toUpperCase(),
      brand: vanForm.brand.trim(),
      model: vanForm.model.trim(),
      year: vanForm.year.trim(),
      capacity: formatVanCapacity(vanForm.capacity),
      notes: "",
    };

    try {
      await saveVan(van);
      resetVanForm();
      await loadData();
      toast.success(editingVanId ? "Carrinha atualizada." : "Carrinha registada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar carrinha.");
    }
  }

  async function addTask() {
    if (!taskDraft.vanId || !taskDraft.title.trim() || !taskDraft.dueDate) {
      toast.error("Preenche carrinha, tarefa e data limite.");
      return;
    }

    const task: VanTask = {
      id: crypto.randomUUID(),
      vanId: taskDraft.vanId,
      title: taskDraft.title.trim(),
      taskType: taskDraft.taskType,
      dueDate: taskDraft.dueDate,
      completed: false,
      completedAt: null,
      notes: taskDraft.notes.trim(),
    };

    try {
      await saveVanTask(task);
      setTaskDraft((current) => ({
        ...current,
        title: "",
        dueDate: "",
        notes: "",
      }));
      await loadData();
      setTaskFormHighlight(false);
      toast.success("Tarefa adicionada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar tarefa.");
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

  function getVanName(vanId: string) {
    return vans.find((van) => van.id === vanId)?.name || "Carrinha";
  }

  function renderTaskStatus(task: VanTask) {
    const status = getVanTaskStatus(task);

    return (
      <span className={`van-task-status van-task-status-${status}`}>
        {VAN_TASK_STATUS_LABELS[status]}
      </span>
    );
  }

  return (
    <div>
      <h1 className="page-title">Carrinhas</h1>

      <p className="muted workflow-help">
        Gere as carrinhas da escola, regista inspeções, revisões e outras
        responsabilidades. As tarefas em atraso ou próximas aparecem em destaque
        para o admin não perder prazos.
      </p>

      {loading ? (
        <p className="muted">A carregar carrinhas...</p>
      ) : (
        <>
          {stats.overdue > 0 && (
            <div className="van-alert van-alert-danger">
              <strong>{stats.overdue} tarefa(s) em atraso.</strong> Verifica as
              inspeções, revisões e manutenções pendentes.
            </div>
          )}

          <div className="stats-grid">
            <div className="card">
              <span className="stat-label">Carrinhas ativas</span>
              <strong className="stat-number">{stats.vans}</strong>
            </div>
            <div className="card">
              <span className="stat-label">Tarefas em aberto</span>
              <strong className="stat-number">{stats.openTasks}</strong>
            </div>
            <div className="card">
              <span className="stat-label">Em atraso</span>
              <strong className="stat-number">{stats.overdue}</strong>
            </div>
            <div className="card">
              <span className="stat-label">Próximas (14 dias)</span>
              <strong className="stat-number">{stats.dueSoon}</strong>
            </div>
          </div>

          <div className="card section-card">
            <h2>{editingVanId ? "Editar carrinha" : "Nova carrinha"}</h2>

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
            </div>
            <div className="form-fields-actions">
              <button className="primary-btn" onClick={saveVanForm}>
                {editingVanId ? "Guardar alterações" : "Registar carrinha"}
              </button>
              {editingVanId && <button onClick={resetVanForm}>Cancelar</button>}
            </div>
          </div>

          <div className="card section-card">
            <h2>Frota</h2>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Carrinha</th>
                  <th>Matrícula</th>
                  <th>Próx. inspeção</th>
                  <th>Próx. revisão</th>
                  <th>Tarefas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {vans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Ainda não há carrinhas registadas.
                    </td>
                  </tr>
                )}
                {vans.map((van) => {
                  const vanTasks = tasks.filter((task) => task.vanId === van.id);
                  const openCount = vanTasks.filter((task) => !task.completed).length;
                  const nextInspection = getNextTaskDate(vanTasks, "inspection");
                  const nextRevision = getNextTaskDate(vanTasks, "revision");

                  return (
                    <tr key={van.id}>
                      <td className="data-table-primary" data-label="Carrinha">
                        <strong>{van.name}</strong>
                        {!van.active && (
                          <>
                            <br />
                            <small className="muted">Inativa</small>
                          </>
                        )}
                        {(van.brand || van.model || van.capacity) && (
                          <>
                            <br />
                            <small>
                              {[
                                [van.brand, van.model, van.year].filter(Boolean).join(" · "),
                                formatVanCapacity(van.capacity),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </small>
                          </>
                        )}
                      </td>
                      <td data-label="Matrícula">{van.plate}</td>
                      <td data-label="Próx. inspeção">
                        <div className="van-date-cell">
                          <span>{formatDateLabel(nextInspection)}</span>
                          <button
                            type="button"
                            className="compact-btn van-quick-task-btn"
                            onClick={() => startVanTask(van, "inspection")}
                          >
                            + Inspeção
                          </button>
                        </div>
                      </td>
                      <td data-label="Próx. revisão">
                        <div className="van-date-cell">
                          <span>{formatDateLabel(nextRevision)}</span>
                          <button
                            type="button"
                            className="compact-btn van-quick-task-btn"
                            onClick={() => startVanTask(van, "revision")}
                          >
                            + Revisão
                          </button>
                        </div>
                      </td>
                      <td data-label="Tarefas">{openCount} em aberto</td>
                      <td data-label="Ações">
                        <ActionButtons
                          onEdit={() => editVan(van)}
                          onDelete={() => setVanToDelete(van)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            ref={taskFormRef}
            className={`card section-card${taskFormHighlight ? " van-task-form-highlight" : ""}`}
          >
            <h2>Nova tarefa / responsabilidade</h2>
            {taskFormHighlight && taskDraft.vanId && (
              <p className="muted workflow-help">
                Preenche a <strong>data limite</strong> e clica em{" "}
                <strong>Adicionar tarefa</strong>. Carrinha:{" "}
                <strong>{getVanName(taskDraft.vanId)}</strong> · Tipo:{" "}
                <strong>{VAN_TASK_TYPE_LABELS[taskDraft.taskType]}</strong>
              </p>
            )}

            <div className="form-fields-grid">
              <FormField label="Carrinha">
                <select
                  value={taskDraft.vanId}
                  onChange={(e) => {
                    clearTaskFormHighlight();
                    setTaskDraft((current) => ({ ...current, vanId: e.target.value }));
                  }}
                >
                  <option value="">Selecionar carrinha</option>
                  {vans.map((van) => (
                    <option key={van.id} value={van.id}>
                      {van.name} ({van.plate})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Tipo de tarefa">
                <select
                  value={taskDraft.taskType}
                  onChange={(e) => {
                    clearTaskFormHighlight();
                    setTaskDraft((current) => ({
                      ...current,
                      taskType: e.target.value as VanTaskType,
                    }));
                  }}
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
                    setTaskDraft((current) => ({ ...current, title: e.target.value }))
                  }
                />
              </FormField>

              <FormField label="Data limite">
                <input
                  type="date"
                  value={taskDraft.dueDate}
                  onChange={(e) =>
                    setTaskDraft((current) => ({ ...current, dueDate: e.target.value }))
                  }
                />
              </FormField>

              <FormField label="Notas (opcional)">
                <input
                  placeholder="Detalhes extra"
                  value={taskDraft.notes}
                  onChange={(e) =>
                    setTaskDraft((current) => ({ ...current, notes: e.target.value }))
                  }
                />
              </FormField>
            </div>
            <div className="form-fields-actions">
              <button className="primary-btn" onClick={addTask}>
                Adicionar tarefa
              </button>
            </div>
          </div>

          <div className="card section-card">
            <div className="table-header">
              <h2>Agenda de tarefas</h2>
              <select
                value={taskFilter}
                onChange={(e) =>
                  setTaskFilter(e.target.value as "open" | "all")
                }
              >
                <option value="open">Só em aberto</option>
                <option value="all">Todas</option>
              </select>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Carrinha</th>
                  <th>Tipo</th>
                  <th>Tarefa</th>
                  <th>Data limite</th>
                  <th>Estado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Sem tarefas para mostrar.
                    </td>
                  </tr>
                )}
                {visibleTasks.map((task) => (
                  <tr key={task.id}>
                    <td data-label="Carrinha">{getVanName(task.vanId)}</td>
                    <td data-label="Tipo">
                      {VAN_TASK_TYPE_LABELS[task.taskType]}
                    </td>
                    <td data-label="Tarefa">
                      <strong>{task.title}</strong>
                      {task.notes && (
                        <>
                          <br />
                          <small className="muted">{task.notes}</small>
                        </>
                      )}
                    </td>
                    <td data-label="Data limite">
                      {formatDateLabel(task.dueDate)}
                    </td>
                    <td data-label="Estado">{renderTaskStatus(task)}</td>
                    <td data-label="Ações">
                      <div className="student-row-actions">
                        <button
                          className="compact-btn"
                          onClick={() => toggleTaskComplete(task)}
                        >
                          {task.completed ? "Reabrir" : "Concluir"}
                        </button>
                        <ActionButtons onDelete={() => setTaskToDelete(task)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
