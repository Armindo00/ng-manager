import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { FixedTraining } from "../data/fixedTrainings";
import FormField from "../components/FormField";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  WEEKDAY_ORDER,
  deleteFixedTraining,
  ensureFixedTrainingsSeeded,
  restoreDefaultFixedTrainings,
  saveFixedTraining,
} from "../services/fixedTrainingsService";

const WEEKDAY_TITLE: Record<FixedTraining["weekday"], string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  domingo: "Domingo",
};

function slugifyId(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function parseStudents(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function AdminFixedTrainings() {
  const [trainings, setTrainings] = useState<FixedTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<FixedTraining | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const [weekday, setWeekday] =
    useState<FixedTraining["weekday"]>("segunda");
  const [title, setTitle] = useState("");
  const [coachName, setCoachName] = useState("");
  const [studentsText, setStudentsText] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await ensureFixedTrainingsSeeded();
      setTrainings(data);
      if (!selectedId && data[0]) {
        openTraining(data[0]);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        "Erro ao carregar grupos fixos. Confirma se executaste fixed-trainings.sql no Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  const selected = trainings.find((item) => item.id === selectedId) ?? null;

  const grouped = useMemo(() => {
    return WEEKDAY_ORDER.map((day) => ({
      day,
      items: trainings.filter((item) => item.weekday === day),
    })).filter((group) => group.items.length > 0 || creating);
  }, [trainings, creating]);

  function clearForm() {
    setCreating(false);
    setSelectedId(null);
    setWeekday("segunda");
    setTitle("");
    setCoachName("");
    setStudentsText("");
  }

  function openTraining(training: FixedTraining) {
    setCreating(false);
    setSelectedId(training.id);
    setWeekday(training.weekday);
    setTitle(training.title);
    setCoachName(training.coachName || "");
    setStudentsText(training.students.join("\n"));
  }

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    setWeekday("segunda");
    setTitle("");
    setCoachName("");
    setStudentsText("");
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Indica o nome do grupo.");
      return;
    }

    const students = parseStudents(studentsText);
    const id =
      selected?.id ||
      `${weekday}-${slugifyId(title) || "grupo"}-${crypto.randomUUID().slice(0, 6)}`;

    const training: FixedTraining = {
      id,
      weekday,
      title: title.trim(),
      coachName: coachName.trim() || undefined,
      students,
    };

    try {
      setSaving(true);
      const sortOrder = trainings.findIndex((item) => item.id === id);
      await saveFixedTraining(training, sortOrder >= 0 ? sortOrder : trainings.length);
      await loadData();
      openTraining(training);
      toast.success("Grupo fixo guardado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar grupo fixo.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;

    try {
      await deleteFixedTraining(toDelete.id);
      setToDelete(null);
      clearForm();
      await loadData();
      toast.success("Grupo removido.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover grupo.");
    }
  }

  async function confirmRestoreDefaults() {
    try {
      setSaving(true);
      const data = await restoreDefaultFixedTrainings();
      setTrainings(data);
      setConfirmRestore(false);
      if (data[0]) openTraining(data[0]);
      toast.success("Escala inicial restaurada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao restaurar escala.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Escala</p>
        <h1 className="page-title">Grupos fixos</h1>
        <p className="page-description">
          Escala semanal editável. Reflete-se em Hoje e no Calendário.
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar grupos...</p>
      ) : (
        <div className="fixed-trainings-layout">
          <div className="card section-card">
            <div className="form-fields-actions" style={{ marginBottom: 12 }}>
              <button type="button" className="primary-btn" onClick={startCreate}>
                Novo grupo
              </button>
              <button
                type="button"
                className="compact-btn"
                onClick={() => setConfirmRestore(true)}
              >
                Restaurar escala inicial
              </button>
            </div>

            {grouped.map(({ day, items }) => (
              <div key={day} className="fixed-trainings-day">
                <h3>{WEEKDAY_TITLE[day]}</h3>
                <div className="coach-session-list">
                  {items.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`coach-session-card${
                        selectedId === item.id ? " selected" : ""
                      }`}
                      onClick={() => openTraining(item)}
                    >
                      <div className="coach-session-card-main">
                        <strong>{item.title}</strong>
                        <span>
                          {item.students.length} alunos
                          {item.coachName ? ` · ${item.coachName}` : ""}
                        </span>
                      </div>
                    </button>
                  ))}
                  {items.length === 0 && (
                    <p className="muted">Sem grupos neste dia.</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card section-card">
            <h2>{creating ? "Novo grupo" : selected ? "Editar grupo" : "Detalhe"}</h2>

            {!creating && !selected ? (
              <p className="muted">Seleciona um grupo ou cria um novo.</p>
            ) : (
              <>
                <div className="form-fields-grid">
                  <FormField label="Dia da semana">
                    <select
                      value={weekday}
                      onChange={(event) =>
                        setWeekday(event.target.value as FixedTraining["weekday"])
                      }
                    >
                      {WEEKDAY_ORDER.map((day) => (
                        <option key={day} value={day}>
                          {WEEKDAY_TITLE[day]}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Nome do grupo">
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Ex: Segunda · Tarde 1"
                    />
                  </FormField>

                  <FormField label="Treinador habitual (opcional)">
                    <input
                      value={coachName}
                      onChange={(event) => setCoachName(event.target.value)}
                      placeholder="Ex: Mindo"
                    />
                  </FormField>
                </div>

                <FormField label="Alunos (um por linha)">
                  <textarea
                    rows={12}
                    value={studentsText}
                    onChange={(event) => setStudentsText(event.target.value)}
                    placeholder={"Nikolai Fleiss\nOliver Fleiss\n..."}
                  />
                </FormField>

                <div className="form-fields-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={saving}
                    onClick={save}
                  >
                    {saving ? "A guardar..." : "Guardar"}
                  </button>
                  {selected && (
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => setToDelete(selected)}
                    >
                      Eliminar
                    </button>
                  )}
                  <button type="button" className="compact-btn" onClick={clearForm}>
                    Limpar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar grupo fixo"
          message={`Remover “${toDelete.title}” da escala semanal?`}
          consequences={[
            "Deixa de aparecer em Hoje e no calendário.",
            "Treinos já registados no passado mantêm-se.",
          ]}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}

      {confirmRestore && (
        <ConfirmDialog
          title="Restaurar escala inicial"
          message="Isto substitui todos os grupos fixos pela lista inicial da escola."
          consequences={[
            "Alterações manuais à escala são perdidas.",
            "Treinos já registados não são apagados.",
          ]}
          confirmText="Restaurar"
          cancelText="Cancelar"
          onConfirm={confirmRestoreDefaults}
          onCancel={() => setConfirmRestore(false)}
        />
      )}
    </div>
  );
}

export default AdminFixedTrainings;
