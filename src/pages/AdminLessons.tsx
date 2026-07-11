import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons, deleteLesson, updateLesson } from "../services/lessonsService";
import Modal from "../components/Modal";
import LessonDetailCard from "../components/LessonDetailCard";
import ActionButtons from "../components/ActionButtons";
import ConfirmDialog from "../components/ConfirmDialog";

function statusLabel(status: Lesson["status"]) {
  if (status === "published") return "Publicado";
  if (status === "finished") return "Terminado";
  return "Rascunho";
}

function AdminLessons() {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [publishingDrafts, setPublishingDrafts] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setStudents(await getStudents());
      setLessons(await getLessons());
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinos.");
    }
  }

  async function publishAllDrafts() {
    const drafts = lessons.filter((lesson) => lesson.status === "draft");

    if (drafts.length === 0) {
      toast.error("Não há treinos em rascunho.");
      return;
    }

    try {
      setPublishingDrafts(true);

      for (const lesson of drafts) {
        await updateLesson({ ...lesson, status: "published" });
      }

      await loadData();
      toast.success(`${drafts.length} treino(s) publicado(s).`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao publicar treinos.");
    } finally {
      setPublishingDrafts(false);
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

  const publishedCount = lessons.filter((lesson) => lesson.status === "published").length;
  const draftCount = lessons.filter((lesson) => lesson.status === "draft").length;

  return (
    <div className="card section-card">
      <h1 className="page-title">Calendário de Treinos</h1>

      <p className="workflow-help">
        Os treinos publicados em <strong>Horários</strong> aparecem aqui e ficam
        visíveis para treinadores e alunos. Treinos em rascunho ainda não são
        visíveis para os alunos.
      </p>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="card stat-card">
          <span className="stat-label">Publicados</span>
          <strong className="stat-number">{publishedCount}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Rascunhos</span>
          <strong className="stat-number">{draftCount}</strong>
        </div>
      </div>

      {draftCount > 0 && (
        <div className="quick-actions" style={{ marginBottom: 20 }}>
          <button
            className="primary-btn"
            onClick={publishAllDrafts}
            disabled={publishingDrafts}
          >
            {publishingDrafts
              ? "A publicar..."
              : `Publicar ${draftCount} rascunho(s)`}
          </button>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Hora</th>
            <th>Grupo</th>
            <th>Treinador</th>
            <th>Praia</th>
            <th>Estado</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {lessons.map((lesson) => (
            <tr key={lesson.id}>
              <td className="data-table-primary" data-label="Data">
                {lesson.date}
              </td>
              <td data-label="Hora">{lesson.time || "--:--"}</td>
              <td data-label="Grupo">{lesson.groupName || "—"}</td>
              <td data-label="Treinador">{lesson.coachName}</td>
              <td data-label="Praia">{lesson.beach || "A definir"}</td>
              <td data-label="Estado">
                <span className={`payment-status payment-status-${lesson.status === "published" ? "paid" : lesson.status === "draft" ? "pending" : "cancelled"}`}>
                  {statusLabel(lesson.status)}
                </span>
              </td>
              <td data-label="Ações">
                <ActionButtons
                  onView={() => setSelectedLesson(lesson)}
                  onDelete={() => setLessonToDelete(lesson)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {lessons.length === 0 && (
        <p className="muted">
          Ainda não existem treinos. Vai a Horários e clica em Publicar.
        </p>
      )}

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
