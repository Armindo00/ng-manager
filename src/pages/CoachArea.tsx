import { useEffect, useState } from "react";
import type { CoachPickup, Lesson, Student, User } from "../types";
import type { Group } from "../types/group";
import { getStudents } from "../services/studentsService";
import { getGroups } from "../services/groupsService";
import { getRecurringTrainings } from "../services/recurringTrainingsService";
import {
  getLessons,
  addLesson,
  updateLesson,
  deleteLesson as removeLesson,
} from "../services/lessonsService";
import PickupManager from "../components/PickupManager";

type Props = {
  user: User;
};

function CoachArea({ user }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [recurringTrainings, setRecurringTrainings] = useState<any[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [beach, setBeach] = useState("");
  const [pickups, setPickups] = useState<CoachPickup[]>([]);

  const [extraDate, setExtraDate] = useState("");
  const [extraTime, setExtraTime] = useState("");
  const [extraBeach, setExtraBeach] = useState("");
  const [extraVan, setExtraVan] = useState("");
  const [extraPickups, setExtraPickups] = useState<CoachPickup[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const studentsData = await getStudents();
    const groupsData = await getGroups();
    const recurringData = await getRecurringTrainings();
    const lessonsData = await getLessons();

    setStudents(studentsData);
    setGroups(groupsData);
    setRecurringTrainings(
      recurringData.filter((training) => training.coachName === user.name)
    );
    setLessons(lessonsData.filter((lesson) => lesson.coachName === user.name));
  }

  async function prepareRecurringLesson(trainingId: string) {
    const training = recurringTrainings.find((item) => item.id === trainingId);
    if (!training || !date || !time || !beach || pickups.length === 0) return;

    const groupStudents =
      groups.find((group) => group.id === training.groupId)?.studentIds ?? [];

    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      date,
      time,
      beach,
      status: "draft",
      groupId: training.groupId,
      groupName: training.groupName,
      coachId: training.coachId || user.id,
      coachName: user.name,
      van: training.van,
      pickupTime: pickups[0]?.time || "",
      coachPickups: pickups,
      bookedStudentIds: groupStudents,
      presentStudentIds: [],
      responses: [],
    };

    await addLesson(newLesson);
    await loadData();

    setDate("");
    setTime("");
    setBeach("");
    setPickups([]);
  }

  async function createExtraLesson() {
    if (
      !extraDate ||
      !extraTime ||
      !extraBeach ||
      !extraVan ||
      extraPickups.length === 0
    )
      return;

    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      date: extraDate,
      time: extraTime,
      beach: extraBeach,
      status: "draft",
      coachId: user.id,
      coachName: user.name,
      van: extraVan,
      pickupTime: extraPickups[0]?.time || "",
      coachPickups: extraPickups,
      bookedStudentIds: [],
      presentStudentIds: [],
      responses: [],
    };

    await addLesson(newLesson);
    await loadData();

    setExtraDate("");
    setExtraTime("");
    setExtraBeach("");
    setExtraVan("");
    setExtraPickups([]);
  }

  async function publishLesson(lessonId: string) {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;

    await updateLesson({ ...lesson, status: "published" });
    await loadData();
  }

  async function finishLesson(lessonId: string) {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;

    await updateLesson({ ...lesson, status: "finished" });
    await loadData();
  }

  async function deleteLesson(lessonId: string) {
    await removeLesson(lessonId);
    await loadData();
  }

  async function togglePresence(lessonId: string, studentId: string) {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;

    const alreadyPresent = lesson.presentStudentIds.includes(studentId);

    const updatedLesson: Lesson = {
      ...lesson,
      presentStudentIds: alreadyPresent
        ? lesson.presentStudentIds.filter((id) => id !== studentId)
        : [...lesson.presentStudentIds, studentId],
    };

    await updateLesson(updatedLesson);
    await loadData();
  }

  function getResponseText(lesson: Lesson, studentId: string) {
    const response = lesson.responses?.find(
      (item) => item.studentId === studentId
    );

    if (!response) return "Aguarda resposta";
    if (response.status === "declined") return "Não vai";

    if (response.transportType === "beach") {
      return "Vai direto para a praia · chegada às " + response.availableFrom;
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

  return (
    <div>
      <h1 className="page-title">Área do Treinador</h1>

      <div className="card section-card">
        <h2>Treinos semanais atribuídos</h2>

        {recurringTrainings.length === 0 && (
          <p className="muted">Ainda não existem treinos semanais atribuídos.</p>
        )}

        {recurringTrainings.map((training) => (
          <div className="lesson-card" key={training.id}>
            <div>
              <h3>{training.groupName}</h3>
              <p>Dia: {training.weekDay}</p>
              <p>Carrinha: {training.van}</p>
              <p>Até: {training.repeatUntil}</p>
            </div>

            <div>
              <h4>Preparar treino</h4>

              <div className="form-row">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                <input placeholder="Praia" value={beach} onChange={(e) => setBeach(e.target.value)} />
              </div>

              <PickupManager pickups={pickups} onChange={setPickups} />

              <button className="primary-btn" onClick={() => prepareRecurringLesson(training.id)}>
                Criar treino
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card section-card">
        <h2>Criar treino extra</h2>

        <div className="form-row">
          <input type="date" value={extraDate} onChange={(e) => setExtraDate(e.target.value)} />
          <input type="time" value={extraTime} onChange={(e) => setExtraTime(e.target.value)} />
          <input placeholder="Praia" value={extraBeach} onChange={(e) => setExtraBeach(e.target.value)} />
          <input placeholder="Carrinha" value={extraVan} onChange={(e) => setExtraVan(e.target.value)} />
        </div>

        <PickupManager pickups={extraPickups} onChange={setExtraPickups} />

        <button className="primary-btn" onClick={createExtraLesson}>
          Criar treino extra
        </button>
      </div>

      <div className="card section-card">
        <h2>Treinos criados</h2>

        <div className="lesson-list">
          {lessons.map((lesson) => {
            const bookedStudents = students.filter((student) =>
              lesson.bookedStudentIds.includes(student.id)
            );

            const materialSummary = getMaterialSummary(lesson);
            const pickupStudents = getPickupStudents(lesson);
            const beachStudents = getBeachStudents(lesson);

            return (
              <div className="lesson-card" key={lesson.id}>
                <div>
                  <h3>{lesson.date} · {lesson.time}</h3>
                  {lesson.groupName && <p>Grupo: {lesson.groupName}</p>}
                  <p>{lesson.beach}</p>
                  <p>Carrinha: {lesson.van}</p>
                  <p>Estado: {lesson.status}</p>

                  {lesson.status === "draft" && (
                    <button className="primary-btn" onClick={() => publishLesson(lesson.id)}>
                      Publicar treino
                    </button>
                  )}

                  {lesson.status === "published" && (
                    <button className="primary-btn" onClick={() => finishLesson(lesson.id)}>
                      Finalizar treino
                    </button>
                  )}

                  {lesson.status === "finished" && (
                    <p className="muted">Treino concluído</p>
                  )}

                  <h4>Pickups</h4>
                  {(lesson.coachPickups || []).map((pickup) => (
                    <p key={pickup.id}>{pickup.time} — {pickup.location}</p>
                  ))}

                  <h4>Transporte</h4>
                  <p>Carrinha: {pickupStudents.length}</p>
                  <p>Direto para a praia: {beachStudents.length}</p>

                  <h4>Material necessário</h4>
                  <p>Softboards: {materialSummary.softboard}</p>
                  <p>Pranchas fibra: {materialSummary.fiberBoard}</p>
                  <p>Fatos: {materialSummary.wetsuit}</p>
                  <p>Licras: {materialSummary.lycra}</p>
                  <p>Leashes: {materialSummary.leash}</p>
                  <p>Coletes: {materialSummary.vest}</p>

                  <button className="danger-btn" onClick={() => deleteLesson(lesson.id)}>
                    Apagar treino
                  </button>
                </div>

                <div>
                  <h4>Respostas dos alunos</h4>

                  <h5>Vão na carrinha</h5>
                  {pickupStudents.length === 0 && (
                    <p className="muted">Nenhum aluno confirmado na carrinha.</p>
                  )}

                  {pickupStudents.map((response) => {
                    const student = students.find((s) => s.id === response.studentId);

                    return (
                      <p key={response.studentId}>
                        {student?.name} — {response.pickupLocation} — {response.availableFrom}
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

                  <h4>Presenças</h4>

                  {bookedStudents.map((student) => (
                    <div key={student.id} className="compact-row">
                      <div>
                        <strong>{student.name}</strong>
                        <br />
                        <small>{getResponseText(lesson, student.id)}</small>
                        <br />
                        <small>Material: {getMaterialText(lesson, student.id)}</small>
                      </div>

                      <label>
                        <input
                          type="checkbox"
                          checked={lesson.presentStudentIds.includes(student.id)}
                          onChange={() => togglePresence(lesson.id, student.id)}
                        />
                        Presente
                      </label>
                    </div>
                  ))}
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
