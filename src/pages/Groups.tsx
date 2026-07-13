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
import ActionButtons from "../components/ActionButtons";
import ConfirmDialog from "../components/ConfirmDialog";

function Groups() {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [coachId, setCoachId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setStudents(await getStudents());
      setCoaches(await getCoaches());
      setGroups(await getGroups());
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar grupos.");
    }
  }

  function resetForm() {
    setName("");
    setCoachId("");
    setSelectedStudentIds([]);
    setEditingGroupId(null);
  }

  function editGroup(group: Group) {
    setEditingGroupId(group.id);
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
      id: editingGroupId || crypto.randomUUID(),
      name: name.trim(),
      coachId: coach.id,
      coachName: coach.name,
      studentIds: selectedStudentIds,
      active: true,
    };

    try {
      if (editingGroupId) {
        await updateGroup(group);
        toast.success("Grupo atualizado.");
      } else {
        await addGroup(group);
        toast.success("Grupo criado com sucesso!");
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error(editingGroupId ? "Erro ao atualizar grupo." : "Erro ao criar grupo.");
    }
  }

  async function confirmDeleteGroup() {
    if (!groupToDelete) return;

    try {
      await deleteGroup(groupToDelete.id);
      await loadData();
      setGroupToDelete(null);

      if (editingGroupId === groupToDelete.id) {
        resetForm();
      }

      toast.success("Grupo eliminado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar grupo.");
    }
  }

  return (
    <div className="card section-card">
      <h1 className="page-title">Grupos</h1>

      <p className="workflow-help">
        Cria ou edita aqui o grupo com treinador e alunos. Depois vai a{" "}
        <strong>Horários</strong> para definir o dia fixo de treino, carrinha e
        publicar. Treinos já publicados mantêm a lista de alunos da altura em
        que foram criados.
      </p>

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
          {editingGroupId ? "Guardar alterações" : "Criar grupo"}
        </button>

        {editingGroupId && (
          <button onClick={resetForm}>Cancelar edição</button>
        )}
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

      <h3 style={{ marginTop: 24 }}>Grupos criados</h3>

      <table className="data-table">
        <thead>
          <tr>
            <th>Grupo</th>
            <th>Treinador</th>
            <th>Alunos</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {groups.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                Ainda não há grupos criados.
              </td>
            </tr>
          )}

          {groups.map((group) => (
            <tr key={group.id}>
              <td className="data-table-primary" data-label="Grupo">
                {group.name}
              </td>
              <td data-label="Treinador">{group.coachName}</td>
              <td data-label="Alunos">{group.studentIds.length}</td>
              <td data-label="Ações">
                <ActionButtons
                  onEdit={() => editGroup(group)}
                  onDelete={() => setGroupToDelete(group)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
