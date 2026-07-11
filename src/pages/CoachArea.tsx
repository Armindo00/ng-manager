import { useEffect, useState } from "react";
import type { Lesson, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons, updateLesson } from "../services/lessonsService";
import CoachLessonSetup from "../components/CoachLessonSetup";

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

  function getResponseText(lesson: Lesson, studentId: string) {
    const response = lesson.responses?.find(
      (item) => item.studentId === studentId
    );

    if (!response) return "Aguarda resposta";
    if (response.status === "declined") return "Não vai";

    if (response.transportType === "beach") {
      return "Vai direto à praia · chegada às " + response.availableFrom;
    }

    return response.pickupLocation + " · disponível às " + response.availableFrom;
  }

  function getMaterialText(lesson: Lesson, studentId: string) {
    const response = lesson.responses?.find(
      (item) => item.studentId === studentId
    );

    if (!response || response.status !== "confirmed") return "Sem resposta";

    const items: string[] = [];

    if (response.material.softboard) items.push("Softboard");
    if (response.material.fiberBoard) items.push("Prancha fibra");
    if (response.material.wetsuit) items.push("Fato");
    if (response.material.lycra) items.push("Licra");
    if (response.material.leash) items.push("Leash");
    if (response.material.vest) items.push("Colete");
    if (response.material.other) items.push(response.material.other);

    return items.length > 0 ? items.join(", ") : "Sem material";
  }

  function getMaterialSummary(lesson: Lesson) {
    const summary = {
      softboard: 0,
      fiberBoard: 0,
      wetsuit: 0,
      lycra: 0,
      leash: 0,
      vest: 0,
    };

    lesson.responses?.forEach((response) => {
      if (response.status !== "confirmed") return;

      if (response.material.softboard) summary.softboard++;
      if (response.material.fiberBoard) summary.fiberBoard++;
      if (response.material.wetsuit) summary.wetsuit++;
      if (response.material.lycra) summary.lycra++;
      if (response.material.leash) summary.leash++;
      if (response.material.vest) summary.vest++;
    });

    return summary;
  }

  function getPickupStudents(lesson: Lesson) {
    return (lesson.responses || []).filter(
      (response) =>
        response.status === "confirmed" && response.transportType === "pickup"
    );
  }

  function getBeachStudents(lesson: Lesson) {
    return (lesson.responses || []).filter(
      (response) =>
        response.status === "confirmed" && response.transportType === "beach"
    );
  }

  const upcomingLessons = lessons.filter((lesson) => lesson.status !== "finished");

  return (
    <div>
      <h1 className="page-title">Os meus treinos</h1>

      <p className="workflow-help">
        O admin define o dia, alunos e carrinha. Tu defines a <strong>praia</strong>,
        a <strong>hora de chegada à praia</strong> e os <strong>pickups</strong> com
        base nas respostas dos alunos.
      </p>

      <div className="card section-card">
        <h2>Treinos marcados</h2>

        {upcomingLessons.length === 0 && (
          <p className="muted">Ainda não tens treinos publicados pelo admin.</p>
        )}

        <div className="lesson-list">
          {upcomingLessons.map((lesson) => {
            const bookedStudents = students.filter((student) =>
              lesson.bookedStudentIds.includes(student.id)
            );

            const materialSummary = getMaterialSummary(lesson);
            const pickupStudents = getPickupStudents(lesson);
            const beachStudents = getBeachStudents(lesson);

            return (
              <div className="lesson-card coach-lesson-card" key={lesson.id}>
                <div>
                  <h3>
                    {lesson.date}
                    {lesson.time ? ` · ${lesson.time}` : ""}
                  </h3>

                  {lesson.groupName && <p>Grupo: {lesson.groupName}</p>}
                  <p>🏖️ {lesson.beach || "Praia por definir"}</p>
                  <p>🚐 Carrinha: {lesson.van}</p>
                  <p>Estado: {lesson.status === "published" ? "Publicado" : lesson.status}</p>

                  <CoachLessonSetup lesson={lesson} onSaved={loadData} />

                  <h4>Pickups planeados</h4>
                  {(lesson.coachPickups || []).length === 0 && (
                    <p className="muted">Ainda não definiste pickups.</p>
                  )}

                  {(lesson.coachPickups || []).map((pickup) => (
                    <p key={pickup.id}>
                      {pickup.time} — {pickup.location}
                    </p>
                  ))}

                  <h4>Resumo de transporte</h4>
                  <p>Carrinha: {pickupStudents.length}</p>
                  <p>Direto para a praia: {beachStudents.length}</p>

                  <h4>Material necessário</h4>
                  <p>Softboards: {materialSummary.softboard}</p>
                  <p>Pranchas fibra: {materialSummary.fiberBoard}</p>
                  <p>Fatos: {materialSummary.wetsuit}</p>
                  <p>Licras: {materialSummary.lycra}</p>
                  <p>Leashes: {materialSummary.leash}</p>
                  <p>Coletes: {materialSummary.vest}</p>

                  {lesson.status === "published" && (
                    <button
                      className="primary-btn"
                      onClick={() => finishLesson(lesson.id)}
                    >
                      Finalizar treino
                    </button>
                  )}
                </div>

                <div>
                  <h4>Respostas dos alunos</h4>

                  {bookedStudents.length === 0 && (
                    <p className="muted">Sem alunos inscritos neste treino.</p>
                  )}

                  {bookedStudents.map((student) => (
                    <div key={student.id} className="compact-row">
                      <div>
                        <strong>{student.name}</strong>
                        <br />
                        <small>{getResponseText(lesson, student.id)}</small>
                        <br />
                        <small>Material: {getMaterialText(lesson, student.id)}</small>
                      </div>
                    </div>
                  ))}

                  <h5>Vão na carrinha</h5>
                  {pickupStudents.length === 0 && (
                    <p className="muted">Nenhum aluno confirmado na carrinha.</p>
                  )}

                  {pickupStudents.map((response) => {
                    const student = students.find((s) => s.id === response.studentId);

                    return (
                      <p key={response.studentId}>
                        {student?.name} — {response.pickupLocation} —{" "}
                        {response.availableFrom}
                      </p>
                    );
                  })}

                  <h5>Vão direto para a praia</h5>
                  {beachStudents.length === 0 && (
                    <p className="muted">Nenhum aluno confirmado direto na praia.</p>
                  )}

                  {beachStudents.map((response) => {
                    const student = students.find((s) => s.id === response.studentId);

                    return (
                      <p key={response.studentId}>
                        {student?.name} — chegada às {response.availableFrom}
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CoachArea;
