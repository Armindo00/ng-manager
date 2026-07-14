import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons, deleteLesson, updateLesson } from "../services/lessonsService";
import LessonDetailCard from "../components/LessonDetailCard";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  DetailPanel,
  DetailPanelEmpty,
  MasterDetailLayout,
  SelectionList,
  SelectionListItem,
} from "../components/MasterDetailLayout";

function statusLabel(status: Lesson["status"]) {
  if (status === "published") return "Publicado";
  if (status === "finished") return "Terminado";
  return "Rascunho";
}

function statusBadgeClass(status: Lesson["status"]) {
  if (status === "published") return "payment-status payment-status-paid";
  if (status === "draft") return "payment-status payment-status-pending";
  return "payment-status payment-status-cancelled";
}

function AdminLessons() {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [publishingDrafts, setPublishingDrafts] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setStudents(await getStudents());
      const lessonsData = await getLessons();
      setLessons(lessonsData);
      setSelectedLessonId((current) => {
        if (current && lessonsData.some((lesson) => lesson.id === current)) {
          return current;
        }
        return lessonsData[0]?.id ?? null;
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinos.");
    }
  }

  const sortedLessons = useMemo(
    () =>
      [...lessons].sort((a, b) =>
        `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
      ),
    [lessons]
  );

  const selectedLesson =
    sortedLessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

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
      if (selectedLessonId === lessonToDelete.id) {
        setSelectedLessonId(null);
      }
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
    <div>
      <h1 className="page-title">Calendário de Treinos</h1>

      <p className="workflow-help">
        Os treinos publicados em <strong>Horários</strong> aparecem aqui e ficam
        visíveis para treinadores e alunos. Seleciona um treino na lista para ver
        a ficha completa.
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

      <MasterDetailLayout
        showDetail={Boolean(selectedLesson)}
        list={
          <SelectionList
            title="Treinos"
            empty={
              <p className="muted">
                Ainda não existem treinos. Vai a Horários e clica em Publicar.
              </p>
            }
          >
            {sortedLessons.map((lesson) => (
              <SelectionListItem
                key={lesson.id}
                active={lesson.id === selectedLessonId}
                onClick={() => setSelectedLessonId(lesson.id)}
                title={`${lesson.date} · ${lesson.groupName || "Treino"}`}
                subtitle={`${lesson.coachName} · ${lesson.beach || "Praia por definir"}`}
                meta={lesson.time || "--:--"}
                badge={
                  <span className={statusBadgeClass(lesson.status)}>
                    {statusLabel(lesson.status)}
                  </span>
                }
              />
            ))}
          </SelectionList>
        }
        detail={
          selectedLesson ? (
            <DetailPanel
              title="Ficha do treino"
              actions={
                <button
                  className="compact-btn danger-btn"
                  onClick={() => setLessonToDelete(selectedLesson)}
                >
                  Eliminar
                </button>
              }
            >
              <LessonDetailCard lesson={selectedLesson} students={students} />
            </DetailPanel>
          ) : (
            <DetailPanelEmpty message="Seleciona um treino da lista." />
          )
        }
      />

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
