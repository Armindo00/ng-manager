import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, CoachPickup, Lesson, Student } from "../types";
import { updateLesson, getLessons } from "../services/lessonsService";
import { getCoaches } from "../services/coachesService";
import PickupManager from "./PickupManager";
import CoachStudentResponsesPanel from "./CoachStudentResponsesPanel";
import CoachLessonSetup from "./CoachLessonSetup";
import CoachAttendancePanel from "./CoachAttendancePanel";
import {
  canFinishLesson,
  canMarkAttendance,
  canSendLessonPlan,
} from "../utils/lessonWorkflow";

type Props = {
  lesson: Lesson;
  students: Student[];
  readOnlyVan?: boolean;
  coachMode?: boolean;
  onClose?: () => void;
};

function LessonDetailCard({
  lesson,
  students,
  readOnlyVan = false,
  coachMode = false,
  onClose,
}: Props) {
  const [currentLesson, setCurrentLesson] = useState<Lesson>(lesson);
  const [coachNotes, setCoachNotes] = useState(lesson.coachNotes || "");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    setCurrentLesson(lesson);
    setCoachNotes(lesson.coachNotes || "");
    setStudentSearch("");
  }, [lesson]);

  const bookedStudents = students.filter((student) =>
    currentLesson.bookedStudentIds.includes(student.id)
  );

  const availableStudents = students.filter(
    (student) =>
      !currentLesson.bookedStudentIds.includes(student.id) &&
      student.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    try {
      setCoaches(await getCoaches());
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinadores.");
    }
  }

  async function saveLessonChanges(updatedLesson: Lesson, successMessage: string) {
    const previousLesson = currentLesson;
    setCurrentLesson(updatedLesson);

    try {
      await updateLesson(updatedLesson);
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar alterações.");
      setCurrentLesson(previousLesson);
    }
  }

  function getStudentResponse(studentId: string) {
    return currentLesson.responses?.find(
      (response) => response.studentId === studentId
    );
  }

  function responseText(studentId: string) {
    const response = getStudentResponse(studentId);

    if (response?.status === "confirmed") return "🟢 Confirmou";
    if (response?.status === "declined") return "🔴 Não vai";
    return "⏳ Sem resposta";
  }

  function updateField(field: keyof Lesson, value: string) {
    saveLessonChanges({ ...currentLesson, [field]: value }, "Treino atualizado.");
  }

  function updateCoach(coachId: string) {
    const coach = coaches.find((item) => item.id === coachId);
    if (!coach) return;

    saveLessonChanges(
      { ...currentLesson, coachId: coach.id, coachName: coach.name },
      "Treinador atualizado."
    );
  }

  function publishLesson() {
    saveLessonChanges(
      { ...currentLesson, status: "published" },
      "Treino publicado com sucesso."
    );
  }

  function finishLesson() {
    if (!canFinishLesson(currentLesson)) {
      toast.error("Só podes concluir o treino no dia do treino ou depois.");
      return;
    }

    saveLessonChanges(
      { ...currentLesson, status: "finished" },
      "Treino concluído."
    );
  }

  function addStudent(studentId: string) {
    saveLessonChanges(
      {
        ...currentLesson,
        bookedStudentIds: [...currentLesson.bookedStudentIds, studentId],
      },
      "Aluno adicionado ao treino."
    );

    setStudentSearch("");
  }

  function removeStudent(studentId: string) {
    saveLessonChanges(
      {
        ...currentLesson,
        bookedStudentIds: currentLesson.bookedStudentIds.filter(
          (id) => id !== studentId
        ),
        presentStudentIds: currentLesson.presentStudentIds.filter(
          (id) => id !== studentId
        ),
        responses: (currentLesson.responses || []).filter(
          (response) => response.studentId !== studentId
        ),
      },
      "Aluno removido do treino."
    );
  }

  function togglePresence(studentId: string) {
    const isPresent = currentLesson.presentStudentIds.includes(studentId);

    saveLessonChanges(
      {
        ...currentLesson,
        presentStudentIds: isPresent
          ? currentLesson.presentStudentIds.filter((id) => id !== studentId)
          : [...currentLesson.presentStudentIds, studentId],
      },
      isPresent ? "Aluno marcado como ausente." : "Presença marcada."
    );
  }

  function savePickups(pickups: CoachPickup[]) {
    saveLessonChanges(
      {
        ...currentLesson,
        coachPickups: pickups,
        pickupTime: pickups[0]?.time || "",
      },
      "Pickups atualizados."
    );
  }

  function saveNotes() {
    saveLessonChanges({ ...currentLesson, coachNotes }, "Notas guardadas.");
  }

  async function refreshLesson() {
    const lessons = await getLessons();
    const updated = lessons.find((item) => item.id === currentLesson.id);

    if (updated) {
      setCurrentLesson(updated);
    }
  }

  async function handlePlanSent() {
    await refreshLesson();
    onClose?.();
  }

  return (
    <div className="lesson-detail-card">
      <div className="lesson-detail-hero">
        <div>
          <span className="lesson-kicker">Treino</span>
          <h2>{currentLesson.groupName || "Treino extra"}</h2>
          <p>{currentLesson.beach || "Praia por definir"}</p>
        </div>

        <span className={"lesson-status status-" + currentLesson.status}>
          {currentLesson.status === "draft" && "Rascunho"}
          {currentLesson.status === "published" && "Publicado"}
          {currentLesson.status === "finished" && "Concluído"}
        </span>
      </div>

      <div className="lesson-actions-bar">
        {!coachMode && currentLesson.status === "draft" && (
          <button className="primary-btn" onClick={publishLesson}>
            📢 Publicar treino
          </button>
        )}

        {currentLesson.status === "published" && canFinishLesson(currentLesson) && (
          <button className="primary-btn" onClick={finishLesson}>
            ✅ Concluir treino
          </button>
        )}

        {currentLesson.status === "published" && !canFinishLesson(currentLesson) && (
          <span className="muted">
            Conclusão disponível no dia do treino ({currentLesson.date}).
          </span>
        )}

        {currentLesson.status === "finished" && (
          <span className="muted">Este treino já foi concluído.</span>
        )}
      </div>

      {coachMode ? (
        <>
          <div className="lesson-section">
            <h3>📋 Respostas dos alunos</h3>
            <CoachStudentResponsesPanel
              lesson={currentLesson}
              students={students}
            />
          </div>

          {canSendLessonPlan(currentLesson) && (
            <div className="lesson-section">
              <h3>📢 Enviar plano (antes do treino)</h3>
              <CoachLessonSetup
                lesson={currentLesson}
                onSaved={() => {
                  void handlePlanSent();
                }}
              />
            </div>
          )}

          <div className="lesson-section">
            <h3>✅ Presenças</h3>
            <CoachAttendancePanel
              lesson={currentLesson}
              students={students}
              onSaved={refreshLesson}
            />
          </div>
        </>
      ) : (
        <>
      <div className="lesson-section">
        <h3>✏️ Editar treino</h3>

        <div className="lesson-edit-grid">
          <label>
            Data
            <input
              type="date"
              value={currentLesson.date}
              onChange={(e) => updateField("date", e.target.value)}
            />
          </label>

          <label>
            Hora de chegada à praia
            <input
              type="time"
              value={currentLesson.time || ""}
              onChange={(e) => updateField("time", e.target.value)}
            />
          </label>

          <label>
            Praia
            <input
              value={currentLesson.beach || ""}
              onChange={(e) => updateField("beach", e.target.value)}
            />
          </label>

          <label>
            Treinador
            <select
              value={currentLesson.coachId}
              onChange={(e) => updateCoach(e.target.value)}
            >
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Carrinha
            <input
              value={currentLesson.van || ""}
              onChange={(e) => updateField("van", e.target.value)}
              readOnly={readOnlyVan}
              title={readOnlyVan ? "Definida pelo admin" : undefined}
            />
          </label>
        </div>
      </div>

      <div className="lesson-section">
        <h3>📋 Respostas dos alunos</h3>
        <p className="muted">
          Pickup, hora disponível e material pedido por cada aluno.
        </p>

        <CoachStudentResponsesPanel
          lesson={currentLesson}
          students={students}
        />
      </div>

      <div className="lesson-section">
        <h3>🚐 Pickups</h3>
        <p className="muted">
          Define os horários de recolha com base nas respostas dos alunos.
        </p>

        <PickupManager
          pickups={currentLesson.coachPickups || []}
          onChange={savePickups}
        />
      </div>

      <div className="lesson-section">
        <div className="lesson-section-header">
          <h3>👥 Inscritos</h3>
          <span>{bookedStudents.length}</span>
        </div>

        {bookedStudents.length === 0 && (
          <p className="muted">Ainda não existem alunos neste treino.</p>
        )}

        <div className="lesson-students-list">
          {bookedStudents.map((student) => (
            <div className="lesson-student-manage-row" key={student.id}>
              <div>
                <strong>{student.name}</strong>
                <p className="student-response-status">
                  {responseText(student.id)}
                </p>
              </div>

              <button
                type="button"
                className="danger-btn compact-btn"
                onClick={() => removeStudent(student.id)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>

        <div className="lesson-add-student">
          <label className="field-label">
            Adicionar aluno
            <input
              placeholder="Pesquisar por nome..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </label>

          {studentSearch && (
            <div className="lesson-add-results">
              {availableStudents.slice(0, 5).map((student) => (
                <button
                  type="button"
                  key={student.id}
                  onClick={() => addStudent(student.id)}
                >
                  ➕ {student.name}
                </button>
              ))}

              {availableStudents.length === 0 && (
                <p className="muted">Nenhum aluno encontrado.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="lesson-section">
        <div className="lesson-section-header">
          <h3>✅ Presenças</h3>
          <span>
            {currentLesson.presentStudentIds.length}/{bookedStudents.length}
          </span>
        </div>

        {canMarkAttendance(currentLesson) ? (
          <div className="lesson-students-list">
            {bookedStudents.map((student) => {
              const isPresent = currentLesson.presentStudentIds.includes(student.id);

              return (
                <button
                  type="button"
                  className={
                    isPresent
                      ? "lesson-student-row present"
                      : "lesson-student-row"
                  }
                  key={student.id}
                  onClick={() => togglePresence(student.id)}
                >
                  <span>
                    {student.name}
                    <small className="student-response-status">
                      {responseText(student.id)}
                    </small>
                  </span>

                  <strong>{isPresent ? "✅ Presente" : "⬜ Ausente"}</strong>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="muted">
            Presenças disponíveis no dia do treino ({currentLesson.date}).
          </p>
        )}
      </div>
        </>
      )}

      <div className="lesson-section">
        <h3>📝 Notas do treinador</h3>

        <label className="field-label">
          Notas sobre o treino
          <textarea
            rows={5}
            placeholder="Escreve notas sobre este treino..."
            value={coachNotes}
            onChange={(e) => setCoachNotes(e.target.value)}
          />
        </label>

        <button className="primary-btn" onClick={saveNotes}>
          Guardar notas
        </button>
      </div>
    </div>
  );
}

export default LessonDetailCard;