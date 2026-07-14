import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getGroups } from "../services/groupsService";
import { getLessons } from "../services/lessonsService";
import {
  getRecurringTrainings,
  addRecurringTraining,
  deleteRecurringTraining,
  getRecurringTrainingErrorMessage,
  type RecurringTraining,
} from "../services/recurringTrainingsService";
import {
  getScheduleDates,
  publishAllTrainingSchedules,
  publishTrainingSchedule,
} from "../services/schedulePublisherService";
import type { Group } from "../types/group";
import type { WeekDay } from "../types/recurringTraining";
import ConfirmDialog from "../components/ConfirmDialog";
import FormField from "../components/FormField";
import {
  DetailPanel,
  DetailPanelEmpty,
  MasterDetailLayout,
  SelectionList,
  SelectionListItem,
} from "../components/MasterDetailLayout";

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
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
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
      const [groupsData, trainingsData, lessonsData] = await Promise.all([
        getGroups(),
        getRecurringTrainings(),
        getLessons(),
      ]);
      setGroups(groupsData);
      setTrainings(trainingsData);
      setLessons(lessonsData);
      setSelectedTrainingId((current) => {
        if (current && trainingsData.some((training) => training.id === current)) {
          return current;
        }
        return trainingsData[0]?.id ?? null;
      });
    } catch (error) {
      console.error(error);
      toast.error(getRecurringTrainingErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const selectedTraining =
    trainings.find((training) => training.id === selectedTrainingId) ?? null;

  function resetCreateForm() {
    setGroupId("");
    setWeekDay("Terça");
    setVan("");
    setRepeatUntil("");
    setCreatingNew(false);
  }

  function startCreateSchedule() {
    resetCreateForm();
    setSelectedTrainingId(null);
    setCreatingNew(true);
  }

  async function createSchedule() {
    const group = groups.find((item) => item.id === groupId);

    if (!group || !van || !repeatUntil) {
      toast.error("Preenche grupo, carrinha e data final.");
      return;
    }

    if (!group.coachId) {
      toast.error("Este grupo não tem treinador associado. Edita o grupo primeiro.");
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
      active: true,
    };

    try {
      await addRecurringTraining(newTraining);
      await loadData();
      resetCreateForm();
      setSelectedTrainingId(newTraining.id);
      toast.success("Horário guardado. Agora clica em Publicar.");
    } catch (error) {
      console.error(error);
      toast.error(getRecurringTrainingErrorMessage(error));
    }
  }

  async function confirmDeleteTraining() {
    if (!trainingToDelete) return;

    try {
      await deleteRecurringTraining(trainingToDelete.id);
      if (selectedTrainingId === trainingToDelete.id) {
        setSelectedTrainingId(null);
      }
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

      const result = await publishTrainingSchedule(training.id);

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

      const result = await publishAllTrainingSchedules();

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
    <div>
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
          praia, hora e pickups
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

      {loading ? (
        <p className="muted">A carregar...</p>
      ) : (
        <MasterDetailLayout
          showDetail={creatingNew || Boolean(selectedTraining)}
          list={
            <SelectionList
              title="Horários guardados"
              toolbar={
                <button className="primary-btn compact-btn" onClick={startCreateSchedule}>
                  Novo horário
                </button>
              }
              empty={<p className="muted">Ainda não existem horários guardados.</p>}
            >
              {trainings.map((training) => (
                <SelectionListItem
                  key={training.id}
                  active={training.id === selectedTrainingId && !creatingNew}
                  onClick={() => {
                    setSelectedTrainingId(training.id);
                    setCreatingNew(false);
                  }}
                  title={training.groupName}
                  subtitle={`${training.weekDay} · ${training.coachName}`}
                  meta={`Até ${training.repeatUntil}`}
                  badge={
                    <span className="muted">
                      {countPublishedDates(training)} / {countPlannedDates(training)}
                    </span>
                  }
                />
              ))}
            </SelectionList>
          }
          detail={
            creatingNew ? (
              <DetailPanel title="Novo horário">
                <div className="form-fields-grid">
                  <FormField label="Grupo">
                    <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                      <option value="">Selecionar grupo</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Dia da semana">
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
                  </FormField>

                  <FormField label="Carrinha">
                    <input
                      placeholder="Ex: Carrinha azul"
                      value={van}
                      onChange={(e) => setVan(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Treina até">
                    <input
                      type="date"
                      value={repeatUntil}
                      onChange={(e) => setRepeatUntil(e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="form-fields-actions">
                  <button className="primary-btn" onClick={createSchedule}>
                    Guardar horário
                  </button>
                  <button onClick={resetCreateForm}>Cancelar</button>
                </div>
              </DetailPanel>
            ) : selectedTraining ? (
              <DetailPanel
                title={selectedTraining.groupName}
                actions={
                  <div className="student-row-actions">
                    <button
                      className="primary-btn compact-btn"
                      onClick={() => publishSchedule(selectedTraining)}
                      disabled={publishingId !== null}
                    >
                      {publishingId === selectedTraining.id
                        ? "A publicar..."
                        : "Publicar"}
                    </button>
                    <button
                      className="compact-btn danger-btn"
                      onClick={() => setTrainingToDelete(selectedTraining)}
                    >
                      Eliminar
                    </button>
                  </div>
                }
              >
                <p>
                  <strong>Dia:</strong> {selectedTraining.weekDay}
                </p>
                <p>
                  <strong>Treinador:</strong> {selectedTraining.coachName}
                </p>
                <p>
                  <strong>Carrinha:</strong> {selectedTraining.van}
                </p>
                <p>
                  <strong>Treina até:</strong> {selectedTraining.repeatUntil}
                </p>
                <p>
                  <strong>Treinos publicados:</strong>{" "}
                  {countPublishedDates(selectedTraining)} /{" "}
                  {countPlannedDates(selectedTraining)} planeados
                </p>
              </DetailPanel>
            ) : (
              <DetailPanelEmpty message="Seleciona um horário ou cria um novo." />
            )
          }
        />
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
