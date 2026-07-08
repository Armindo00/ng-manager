import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import type { Group } from "../types/group";
import { getGroups } from "../services/groupsService";
import { getStudents } from "../services/studentsService";
import { getLessons, addLesson, deleteLesson } from "../services/lessonsService";
import Modal from "../components/Modal";
import LessonDetailCard from "../components/LessonDetailCard";
import ActionButtons from "../components/ActionButtons";
import ConfirmDialog from "../components/ConfirmDialog";

function AdminLessons() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

  const [groupId, setGroupId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [beach, setBeach] = useState("");
  const [van, setVan] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setGroups(await getGroups());
      setStudents(await getStudents());
      setLessons(await getLessons());
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinos.");
    }
  }

  async function createLesson() {
    const group = groups.find((g) => g.id === groupId);

    if (!group || !date || !time || !beach || !van || !pickupTime) {
      toast.error("Preenche todos os campos do treino.");
      return;
    }

    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      date,
      time,
      beach,
      status: "draft",
      groupId: group.id,
      groupName: group.name,
      coachId: group.coachId,
      coachName: group.coachName,
      van,
      pickupTime,
      coachPickups: [],
      bookedStudentIds: group.studentIds,
      presentStudentIds: [],
      responses: [],
    };

    try {
      await addLesson(newLesson);
      await loadData();

      setGroupId("");
      setDate("");
      setTime("");
      setBeach("");
      setVan("");
      setPickupTime("");

      toast.success("Treino criado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar treino.");
    }
  }

  async function confirmDeleteLesson() {
    if (!lessonToDelete) return;

    try {
      await deleteLesson(lessonToDelete.id);
      await loadData();
      setLessonToDelete(null);

      toast.success("Treino eliminado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar treino.");
    }
  }

  return (
    <div className="card section-card">
      <h1 className="page-title">Treinos</h1>

      <div className="form-row">
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Selecionar grupo</option>

          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <input placeholder="Praia" value={beach} onChange={(e) => setBeach(e.target.value)} />
        <input placeholder="Carrinha" value={van} onChange={(e) => setVan(e.target.value)} />
        <input placeholder="Pickup inicial" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />

        <button className="primary-btn" onClick={createLesson}>
          Criar treino
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Hora</th>
            <th>Grupo</th>
            <th>Treinador</th>
            <th>Praia</th>
            <th>Carrinha</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {lessons.map((lesson) => (
            <tr key={lesson.id}>
              <td>{lesson.date}</td>
              <td>{lesson.time}</td>
              <td>{lesson.groupName}</td>
              <td>{lesson.coachName}</td>
              <td>{lesson.beach}</td>
              <td>{lesson.van}</td>
              <td>
                <ActionButtons
                  onView={() => setSelectedLesson(lesson)}
                  onDelete={() => setLessonToDelete(lesson)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedLesson && (
        <Modal title="Ficha do treino" onClose={() => setSelectedLesson(null)}>
          <LessonDetailCard lesson={selectedLesson} students={students} />
        </Modal>
      )}

      {lessonToDelete && (
        <ConfirmDialog
          title="⚠️ Eliminar treino"
          message={
            "Tens a certeza que pretendes eliminar este treino de " +
            lessonToDelete.date +
            "? Esta ação não pode ser desfeita."
          }
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDeleteLesson}
          onCancel={() => setLessonToDelete(null)}
        />
      )}
    </div>
  );
}

export default AdminLessons;