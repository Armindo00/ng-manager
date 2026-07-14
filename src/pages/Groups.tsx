import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Student, Coach } from "../types";
import type { Group } from "../types/group";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import {
  getGroups,
  addGroup,
  updateGroup,
  deleteGroup,
} from "../services/groupsService";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  DetailPanel,
  DetailPanelEmpty,
  MasterDetailLayout,
  SelectionList,
  SelectionListItem,
} from "../components/MasterDetailLayout";

function Groups() {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  const [name, setName] = useState("");
  const [coachId, setCoachId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [studentsData, coachesData, groupsData] = await Promise.all([
        getStudents(),
        getCoaches(),
        getGroups(),
      ]);
      setStudents(studentsData);
      setCoaches(coachesData);
      setGroups(groupsData);
      setSelectedGroupId((current) => {
        if (current && groupsData.some((group) => group.id === current)) {
          return current;
        }
        return groupsData[0]?.id ?? null;
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar grupos.");
    }
  }

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? null;

  function resetForm() {
    setName("");
    setCoachId("");
    setSelectedStudentIds([]);
    setCreatingNew(false);
  }

  function startCreateGroup() {
    resetForm();
    setSelectedGroupId(null);
    setCreatingNew(true);
  }

  function openGroup(group: Group) {
    setSelectedGroupId(group.id);
    setCreatingNew(false);
    setName(group.name);
    setCoachId(group.coachId);
    setSelectedStudentIds(group.studentIds);
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  async function saveGroup() {
    const coach = coaches.find((c) => c.id === coachId);

    if (!name.trim() || !coach) {
      toast.error("Preenche o nome do grupo e seleciona um treinador.");
      return;
    }

    const group: Group = {
      id: creatingNew ? crypto.randomUUID() : selectedGroupId || crypto.randomUUID(),
      name: name.trim(),
      coachId: coach.id,
      coachName: coach.name,
      studentIds: selectedStudentIds,
      active: true,
    };

    try {
      if (creatingNew) {
        await addGroup(group);
        toast.success("Grupo criado com sucesso!");
      } else if (selectedGroupId) {
        await updateGroup(group);
        toast.success("Grupo atualizado.");
      }

      await loadData();
      setSelectedGroupId(group.id);
      setCreatingNew(false);
    } catch (error) {
      console.error(error);
      toast.error(creatingNew ? "Erro ao criar grupo." : "Erro ao atualizar grupo.");
    }
  }

  async function confirmDeleteGroup() {
    if (!groupToDelete) return;

    try {
      await deleteGroup(groupToDelete.id);
      if (selectedGroupId === groupToDelete.id) {
        setSelectedGroupId(null);
        resetForm();
      }
      await loadData();
      setGroupToDelete(null);
      toast.success("Grupo eliminado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar grupo.");
    }
  }

  function renderGroupForm() {
    return (
      <>
        <div className="form-row">
          <input
            placeholder="Nome do grupo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select value={coachId} onChange={(e) => setCoachId(e.target.value)}>
            <option value="">Selecionar treinador</option>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.name}
              </option>
            ))}
          </select>

          <button className="primary-btn" onClick={saveGroup}>
            {creatingNew ? "Criar grupo" : "Guardar alterações"}
          </button>

          {!creatingNew && selectedGroup && (
            <button
              className="compact-btn danger-btn"
              onClick={() => setGroupToDelete(selectedGroup)}
            >
              Eliminar
            </button>
          )}

          {creatingNew && <button onClick={resetForm}>Cancelar</button>}
        </div>

        <h3>Alunos do grupo</h3>
        {students.map((student) => (
          <label className="check-row" key={student.id}>
            <input
              type="checkbox"
              checked={selectedStudentIds.includes(student.id)}
              onChange={() => toggleStudent(student.id)}
            />
            {student.name}
          </label>
        ))}
      </>
    );
  }

  return (
    <div>
      <h1 className="page-title">Grupos</h1>

      <p className="workflow-help">
        Seleciona um grupo para editar treinador e alunos. Depois vai a{" "}
        <strong>Horários</strong> para definir o dia fixo e publicar treinos.
      </p>

      <MasterDetailLayout
        showDetail={creatingNew || Boolean(selectedGroup)}
        list={
          <SelectionList
            title="Grupos criados"
            toolbar={
              <button className="primary-btn compact-btn" onClick={startCreateGroup}>
                Novo grupo
              </button>
            }
            empty={<p className="muted">Ainda não há grupos criados.</p>}
          >
            {groups.map((group) => (
              <SelectionListItem
                key={group.id}
                active={group.id === selectedGroupId && !creatingNew}
                onClick={() => openGroup(group)}
                title={group.name}
                subtitle={group.coachName}
                meta={`${group.studentIds.length} aluno(s)`}
              />
            ))}
          </SelectionList>
        }
        detail={
          creatingNew ? (
            <DetailPanel title="Novo grupo">{renderGroupForm()}</DetailPanel>
          ) : selectedGroup ? (
            <DetailPanel title={selectedGroup.name}>{renderGroupForm()}</DetailPanel>
          ) : (
            <DetailPanelEmpty message="Seleciona um grupo ou cria um novo." />
          )
        }
      />

      {groupToDelete && (
        <ConfirmDialog
          title="⚠️ Eliminar grupo"
          message={
            "Tens a certeza que pretendes eliminar " +
            groupToDelete.name +
            "? Esta ação não pode ser desfeita."
          }
          consequences={[
            "O grupo deixa de aparecer na lista.",
            "Os horários associados podem deixar de funcionar corretamente.",
            "Treinos já publicados não são alterados automaticamente.",
          ]}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDeleteGroup}
          onCancel={() => setGroupToDelete(null)}
        />
      )}
    </div>
  );
}

export default Groups;
