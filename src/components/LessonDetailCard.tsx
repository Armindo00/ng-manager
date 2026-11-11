import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, Lesson, Student } from "../types";
import { updateLesson, getLessons } from "../services/lessonsService";
import { getCoaches } from "../services/coachesService";
import CoachAttendancePanel from "./CoachAttendancePanel";
import { canFinishLesson } from "../utils/lessonWorkflow";
import { formatSessionCoaches } from "../utils/sessionCoaches";

type Props = {
  lesson: Lesson;
  students: Student[];
  onClose?: () => void;
};

function LessonDetailCard({ lesson, students }: Props) {
  const [currentLesson, setCurrentLesson] = useState<Lesson>(lesson);
  const [coachNotes, setCoachNotes] = useState(lesson.coachNotes || "");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    setCurrentLesson(lesson);
    setCoachNotes(lesson.coachNotes || "");
    setStudentSearch("");
  }, [lesson]);

  useEffect(() => {
    loadCoaches();
  }, []);

  const bookedStudents = students.filter((student) =>
    currentLesson.bookedStudentIds.includes(student.id)
  );

  const availableStudents = students.filter(
    (student) =>
      !currentLesson.bookedStudentIds.includes(student.id) &&
      student.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  async function loadCoaches() {
    try {
      setCoaches(await getCoaches());
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinadores.");
    }
  }

  async function saveLessonChanges(
    updatedLesson: Lesson,
    successMessage: string
  ) {
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

  function updateField(field: keyof Lesson, value: string) {
    saveLessonChanges(
      { ...currentLesson, [field]: value },
      "Treino atualizado."
    );
  }

  function updateCoach(coachId: string) {
    const coach = coaches.find((item) => item.id === coachId);
    if (!coach) return;

    saveLessonChanges(
      { ...currentLesson, coachId: coach.id, coachName: coach.name },
      "Treinador atualizado."
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
      },
      "Aluno removido do treino."
    );
  }

  function saveNotes() {
    saveLessonChanges({ ...currentLesson, coachNotes }, "Notas guardadas.");
  }

  async function refreshLesson() {
    const lessons = await getLessons();
    const updated = lessons.find((item) => item.id === currentLesson.id);
    if (updated) setCurrentLesson(updated);
  }

  const statusLabel =
    currentLesson.status === "finished"
      ? "Concluído"
      : currentLesson.status === "published"
        ? "Registado"
        : "Aberto";

  return (
    <div className="lesson-detail-card">
      <div className="lesson-detail-hero">
        <div>
          <span className="lesson-kicker">Sessão</span>
          <h2>{currentLesson.groupName || "Treino extra"}</h2>
          <p>
            {formatSessionCoaches(
              currentLesson.coachName,
              currentLesson.secondaryCoachName
            )}
          </p>
        </div>

        <span className={"lesson-status status-" + currentLesson.status}>
          {statusLabel}
        </span>
      </div>

      <div className="lesson-actions-bar">
        {currentLesson.status !== "finished" &&
          canFinishLesson(currentLesson) && (
            <button className="primary-btn" onClick={finishLesson}>
              Concluir treino
            </button>
          )}

        {currentLesson.status !== "finished" &&
          !canFinishLesson(currentLesson) && (
            <span className="muted">
              Conclusão disponível no dia do treino ({currentLesson.date}).
            </span>
          )}

        {currentLesson.status === "finished" && (
          <span className="muted">Este treino já foi concluído.</span>
        )}
      </div>

      <div className="lesson-section">
        <h3>Detalhes</h3>

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
            Segundo treinador
            <select
              value={currentLesson.secondaryCoachName || ""}
              onChange={(e) =>
                saveLessonChanges(
                  {
                    ...currentLesson,
                    secondaryCoachName: e.target.value || undefined,
                  },
                  "Segundo treinador atualizado."
                )
              }
            >
              <option value="">Só um treinador</option>
              {coaches
                .filter((coach) => coach.id !== currentLesson.coachId)
                .map((coach) => (
                  <option key={coach.id} value={coach.name}>
                    {coach.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>

      <div className="lesson-section">
        <div className="lesson-section-header">
          <h3>Alunos do treino</h3>
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
                  {student.name}
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
        <h3>Presenças</h3>
        <CoachAttendancePanel
          lesson={currentLesson}
          students={students}
          onSaved={refreshLesson}
        />
      </div>

      <div className="lesson-section">
        <h3>Notas do treinador</h3>

        <label className="field-label">
          Notas sobre o treino
          <textarea
            rows={4}
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
