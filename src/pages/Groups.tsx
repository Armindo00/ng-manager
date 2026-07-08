import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Student, Coach } from "../types";
import type { Group } from "../types/group";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import { getGroups, addGroup, deleteGroup } from "../services/groupsService";
import ActionButtons from "../components/ActionButtons";
import ConfirmDialog from "../components/ConfirmDialog";

function Groups() {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

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

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  async function createGroup() {
    const coach = coaches.find((c) => c.id === coachId);

    if (!name || !coach) {
      toast.error("Preenche o nome do grupo e seleciona um treinador.");
      return;
    }

    const newGroup: Group = {
      id: crypto.randomUUID(),
      name,
      coachId: coach.id,
      coachName: coach.name,
      studentIds: selectedStudentIds,
      active: true,
    };

    try {
      await addGroup(newGroup);
      await loadData();

      setName("");
      setCoachId("");
      setSelectedStudentIds([]);

      toast.success("Grupo criado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar grupo.");
    }
  }

  async function confirmDeleteGroup() {
    if (!groupToDelete) return;

    try {
      await deleteGroup(groupToDelete.id);
      await loadData();
      setGroupToDelete(null);

      toast.success("Grupo eliminado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar grupo.");
    }
  }

  return (
    <div className="card section-card">
      <h1 className="page-title">Grupos</h1>

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

        <button className="primary-btn" onClick={createGroup}>
          Criar grupo
        </button>
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
          {groups.map((group) => (
            <tr key={group.id}>
              <td>{group.name}</td>
              <td>{group.coachName}</td>
              <td>{group.studentIds.length}</td>
              <td>
                <ActionButtons onDelete={() => setGroupToDelete(group)} />
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
