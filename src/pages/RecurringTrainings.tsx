import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getGroups } from "../services/groupsService";
import {
  getRecurringTrainings,
  addRecurringTraining,
  deleteRecurringTraining,
  type RecurringTraining,
} from "../services/recurringTrainingsService";
import type { Group } from "../types/group";
import type { WeekDay } from "../types/recurringTraining";
import ActionButtons from "../components/ActionButtons";
import ConfirmDialog from "../components/ConfirmDialog";

const weekDays: WeekDay[] = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

function RecurringTrainings() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [trainings, setTrainings] = useState<RecurringTraining[]>([]);
  const [trainingToDelete, setTrainingToDelete] =
    useState<RecurringTraining | null>(null);
  const [loading, setLoading] = useState(true);

  const [groupId, setGroupId] = useState("");
  const [weekDay, setWeekDay] = useState<WeekDay>("Terça");
  const [van, setVan] = useState("");
  const [repeatUntil, setRepeatUntil] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setGroups(await getGroups());
      setTrainings(await getRecurringTrainings());
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinos semanais.");
    } finally {
      setLoading(false);
    }
  }

  async function createRecurringTraining() {
    const group = groups.find((g) => g.id === groupId);

    if (!group || !van || !repeatUntil) {
      toast.error("Preenche todos os campos.");
      return;
    }

    const newTraining: RecurringTraining = {
      id: crypto.randomUUID(),
      groupId: group.id,
      groupName: group.name,
      coachId: group.coachId,
      coachName: group.coachName,
      van,
      weekDay,
      repeatUntil,
    };

    try {
      await addRecurringTraining(newTraining);
      await loadData();

      setGroupId("");
      setWeekDay("Terça");
      setVan("");
      setRepeatUntil("");

      toast.success("Treino semanal criado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar treino semanal.");
    }
  }

  async function confirmDeleteTraining() {
    if (!trainingToDelete) return;

    try {
      await deleteRecurringTraining(trainingToDelete.id);
      await loadData();
      setTrainingToDelete(null);

      toast.success("Treino semanal eliminado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar treino semanal.");
    }
  }

  return (
    <div className="card section-card">
      <h1 className="page-title">Treinos Semanais</h1>

      <div className="form-row">
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Selecionar grupo</option>

          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <select
          value={weekDay}
          onChange={(e) => setWeekDay(e.target.value as WeekDay)}
        >
          {weekDays.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>

        <input
          placeholder="Carrinha"
          value={van}
          onChange={(e) => setVan(e.target.value)}
        />

        <input
          type="date"
          value={repeatUntil}
          onChange={(e) => setRepeatUntil(e.target.value)}
        />

        <button className="primary-btn" onClick={createRecurringTraining}>
          Criar treino semanal
        </button>
      </div>

      {loading ? (
        <p className="muted">A carregar...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Dia</th>
              <th>Treinador</th>
              <th>Carrinha</th>
              <th>Até</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {trainings.map((training) => (
              <tr key={training.id}>
                <td className="data-table-primary" data-label="Grupo">
                  {training.groupName}
                </td>
                <td data-label="Dia">{training.weekDay}</td>
                <td data-label="Treinador">{training.coachName}</td>
                <td data-label="Carrinha">{training.van}</td>
                <td data-label="Até">{training.repeatUntil}</td>
                <td data-label="Ações">
                  <ActionButtons
                    onDelete={() => setTrainingToDelete(training)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {trainingToDelete && (
        <ConfirmDialog
          title="⚠️ Eliminar treino semanal"
          message={
            "Tens a certeza que pretendes eliminar o treino semanal de " +
            trainingToDelete.groupName +
            "? Esta ação não pode ser desfeita."
          }
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDeleteTraining}
          onCancel={() => setTrainingToDelete(null)}
        />
      )}
    </div>
  );
}

export default RecurringTrainings;
