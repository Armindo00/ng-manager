import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getGroups } from "../services/groupsService";
import { getLessons } from "../services/lessonsService";
import {
  getRecurringTrainings,
  addRecurringTraining,
  deleteRecurringTraining,
  type RecurringTraining,
} from "../services/recurringTrainingsService";
import {
  getScheduleDates,
  publishAllTrainingSchedules,
  publishTrainingSchedule,
} from "../services/schedulePublisherService";
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
  const [lessons, setLessons] = useState<Awaited<ReturnType<typeof getLessons>>>([]);
  const [trainingToDelete, setTrainingToDelete] =
    useState<RecurringTraining | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | "all" | null>(null);

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
      setLessons(await getLessons());
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar horários.");
    } finally {
      setLoading(false);
    }
  }

  async function createSchedule() {
    const group = groups.find((item) => item.id === groupId);

    if (!group || !van || !repeatUntil) {
      toast.error("Preenche grupo, carrinha e data final.");
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

      toast.success("Horário guardado. Agora clica em Publicar.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar horário.");
    }
  }

  async function confirmDeleteTraining() {
    if (!trainingToDelete) return;

    try {
      await deleteRecurringTraining(trainingToDelete.id);
      await loadData();
      setTrainingToDelete(null);
      toast.success("Horário eliminado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar horário.");
    }
  }

  async function publishSchedule(training: RecurringTraining) {
    const group = groups.find((item) => item.id === training.groupId);

    if (!group) {
      toast.error("Grupo não encontrado.");
      return;
    }

    try {
      setPublishingId(training.id);

      const result = await publishTrainingSchedule(training, group, lessons);

      await loadData();

      toast.success(
        `${result.created} treino(s) publicado(s). ${result.skipped} já existiam.`
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao publicar horário."
      );
    } finally {
      setPublishingId(null);
    }
  }

  async function publishAllSchedules() {
    if (trainings.length === 0) {
      toast.error("Ainda não existem horários para publicar.");
      return;
    }

    try {
      setPublishingId("all");

      const result = await publishAllTrainingSchedules(
        trainings,
        groups,
        lessons
      );

      await loadData();

      toast.success(
        `${result.created} treino(s) publicado(s). ${result.skipped} já existiam.`
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao publicar horários."
      );
    } finally {
      setPublishingId(null);
    }
  }

  function countPlannedDates(training: RecurringTraining) {
    return getScheduleDates(training.weekDay as WeekDay, training.repeatUntil)
      .length;
  }

  function countPublishedDates(training: RecurringTraining) {
    return lessons.filter(
      (lesson) =>
        lesson.groupId === training.groupId &&
        lesson.status === "published"
    ).length;
  }

  return (
    <div className="card section-card">
      <h1 className="page-title">Horários dos Grupos</h1>

      <div className="workflow-help">
        <p>
          <strong>1.</strong> Cria o grupo em <em>Grupos</em> (treinador + alunos)
        </p>
        <p>
          <strong>2.</strong> Define aqui o dia da semana, carrinha e até quando o grupo treina
        </p>
        <p>
          <strong>3.</strong> Clica <strong>Publicar</strong> — o treinador define depois a
          praia, hora e pickups com base nas respostas dos alunos
        </p>
      </div>

      <div className="quick-actions" style={{ marginBottom: 20 }}>
        <button
          className="primary-btn"
          onClick={publishAllSchedules}
          disabled={publishingId !== null || trainings.length === 0}
        >
          {publishingId === "all" ? "A publicar..." : "Publicar todos os horários"}
        </button>
      </div>

      <h2>Novo horário</h2>

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
          title="Treina até"
        />

        <button className="primary-btn" onClick={createSchedule}>
          Guardar horário
        </button>
      </div>

      <h2 style={{ marginTop: 24 }}>Horários guardados</h2>

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
              <th>Treinos</th>
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
                <td data-label="Treinos">
                  {countPublishedDates(training)} / {countPlannedDates(training)} publicados
                </td>
                <td data-label="Ações">
                  <div className="student-row-actions">
                    <button
                      className="primary-btn compact-btn"
                      onClick={() => publishSchedule(training)}
                      disabled={publishingId !== null}
                    >
                      {publishingId === training.id ? "A publicar..." : "Publicar"}
                    </button>

                    <ActionButtons
                      onDelete={() => setTrainingToDelete(training)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && trainings.length === 0 && (
        <p className="muted">Ainda não existem horários guardados.</p>
      )}

      {trainingToDelete && (
        <ConfirmDialog
          title="⚠️ Eliminar horário"
          message={
            "Tens a certeza que pretendes eliminar o horário de " +
            trainingToDelete.groupName +
            "? Os treinos já publicados não são apagados."
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
