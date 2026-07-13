import { useEffect, useState } from "react";
import type { Lesson, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons, updateLesson } from "../services/lessonsService";
import CoachLessonSetup from "../components/CoachLessonSetup";
import CoachStudentResponsesPanel from "../components/CoachStudentResponsesPanel";

type Props = {
  user: User;
};

function CoachArea({ user }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const studentsData = await getStudents();
    const lessonsData = await getLessons();

    setStudents(studentsData);
    setLessons(
      lessonsData
        .filter((lesson) => lesson.coachId === user.id)
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    );
  }

  async function finishLesson(lessonId: string) {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;

    await updateLesson({ ...lesson, status: "finished" });
    await loadData();
  }

  const upcomingLessons = lessons.filter((lesson) => lesson.status !== "finished");

  return (
    <div>
      <h1 className="page-title">Os meus treinos</h1>

      <p className="workflow-help">
        Vê primeiro as <strong>respostas dos alunos</strong> (pickup, hora e material).
        Depois defines a praia, hora de chegada e pickups planeados.
      </p>

      <div className="card section-card">
        <h2>Treinos marcados</h2>

        {upcomingLessons.length === 0 && (
          <p className="muted">Ainda não tens treinos publicados pelo admin.</p>
        )}

        <div className="lesson-list coach-lesson-list">
          {upcomingLessons.map((lesson) => (
            <div className="lesson-card coach-lesson-card" key={lesson.id}>
              <div className="coach-lesson-header">
                <div>
                  <h3>
                    {lesson.date}
                    {lesson.time ? ` · Chegada à praia: ${lesson.time}` : ""}
                  </h3>

                  {lesson.groupName && <p>Grupo: {lesson.groupName}</p>}
                  <p>🏖️ {lesson.beach || "Praia por definir"}</p>
                  <p>🚐 Carrinha: {lesson.van}</p>
                </div>

                {lesson.status === "published" && (
                  <button
                    className="primary-btn compact-btn"
                    onClick={() => finishLesson(lesson.id)}
                  >
                    Finalizar treino
                  </button>
                )}
              </div>

              <section className="coach-lesson-section">
                <h4>Respostas dos alunos</h4>
                <CoachStudentResponsesPanel lesson={lesson} students={students} />
              </section>

              <section className="coach-lesson-section">
                <h4>Definir praia, hora e pickups</h4>
                <CoachLessonSetup lesson={lesson} onSaved={loadData} />

                <div className="coach-planned-pickups">
                  <strong>Pickups planeados</strong>
                  {(lesson.coachPickups || []).length === 0 ? (
                    <p className="muted">Ainda não definiste pickups.</p>
                  ) : (
                    (lesson.coachPickups || []).map((pickup) => (
                      <p key={pickup.id}>
                        {pickup.time} — {pickup.location}
                      </p>
                    ))
                  )}
                </div>
              </section>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CoachArea;
