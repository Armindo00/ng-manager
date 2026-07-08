import { useEffect, useState } from "react";
import type { Lesson, MaterialRequest, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons, updateLesson } from "../services/lessonsService";

type Props = {
  user: User;
};

const emptyMaterial: MaterialRequest = {
  softboard: false,
  fiberBoard: false,
  wetsuit: false,
  lycra: false,
  leash: false,
  vest: false,
  other: "",
};

function StudentArea({ user }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const [transportType, setTransportType] = useState<"pickup" | "beach">("pickup");
  const [selectedPickup, setSelectedPickup] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [notes, setNotes] = useState("");
  const [material, setMaterial] = useState<MaterialRequest>(emptyMaterial);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const studentsData = await getStudents();
      const lessonsData = await getLessons();

      setStudents(studentsData);
      setLessons(lessonsData.filter((lesson) => lesson.status === "published"));
    } finally {
      setLoading(false);
    }
  }

  const student = students.find((s) => s.id === user.studentId);

  if (loading) {
    return <p className="muted">A carregar...</p>;
  }

  if (!student) {
    return <p>Aluno não encontrado.</p>;
  }

  const studentId = student.id;

  const attended = lessons.filter((lesson) =>
    lesson.presentStudentIds.includes(studentId)
  );

  function toggleMaterial(key: keyof MaterialRequest) {
    if (key === "other") return;

    setMaterial({
      ...material,
      [key]: !material[key],
    });
  }

  async function confirmLesson(lessonId: string) {
    if (transportType === "pickup" && !selectedPickup) return;
    if (!availableFrom) return;

    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;

    const responses = lesson.responses || [];

    const filteredResponses = responses.filter(
      (response) => response.studentId !== studentId
    );

    const updatedLesson: Lesson = {
      ...lesson,
      bookedStudentIds: lesson.bookedStudentIds.includes(studentId)
        ? lesson.bookedStudentIds
        : [...lesson.bookedStudentIds, studentId],
      responses: [
        ...filteredResponses,
        {
          studentId,
          status: "confirmed",
          transportType,
          pickupLocation:
            transportType === "pickup" ? selectedPickup : "Direto para a praia",
          availableFrom,
          material,
          notes,
        },
      ],
    };

    await updateLesson(updatedLesson);
    await loadData();

    setTransportType("pickup");
    setSelectedPickup("");
    setAvailableFrom("");
    setNotes("");
    setMaterial(emptyMaterial);
  }

  async function declineLesson(lessonId: string) {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;

    const responses = lesson.responses || [];

    const filteredResponses = responses.filter(
      (response) => response.studentId !== studentId
    );

    const updatedLesson: Lesson = {
      ...lesson,
      bookedStudentIds: lesson.bookedStudentIds.filter((id) => id !== studentId),
      responses: [
        ...filteredResponses,
        {
          studentId,
          status: "declined",
          transportType: "pickup",
          pickupLocation: "",
          availableFrom: "",
          material: emptyMaterial,
          notes,
        },
      ],
    };

    await updateLesson(updatedLesson);
    await loadData();
  }

  return (
    <div>
      <h1 className="page-title">Área do Aluno</h1>

      <div className="stats-grid">
        <div className="card">
          <span className="stat-label">Nome</span>
          <strong className="stat-number small">{student.name}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Treinos permitidos</span>
          <strong className="stat-number">{student.monthlyLimit}</strong>
        </div>

        <div className="card">
          <span className="stat-label">Treinos realizados</span>
          <strong className="stat-number">{attended.length}</strong>
        </div>
      </div>

      <div className="card section-card">
        <h2>Treinos disponíveis</h2>

        {lessons.length === 0 && <p className="muted">Sem treinos criados.</p>}

        <div className="lesson-list">
          {lessons.map((lesson) => {
            const response = lesson.responses?.find(
              (item) => item.studentId === studentId
            );

            const isConfirmed = response?.status === "confirmed";
            const isDeclined = response?.status === "declined";

            return (
              <div className="lesson-card" key={lesson.id}>
                <div>
                  <h3>{lesson.date} · {lesson.time}</h3>

                  {lesson.groupName && <p>Grupo: {lesson.groupName}</p>}

                  <p>{lesson.beach}</p>
                  <p>Treinador: {lesson.coachName}</p>
                  <p>Carrinha: {lesson.van}</p>

                  {isConfirmed && <p className="muted">Confirmado</p>}
                  {isDeclined && <p className="muted">Não vou</p>}
                </div>

                <div>
                  <h4>Como vais para o treino?</h4>

                  <label className="check-row">
                    <input
                      type="radio"
                      name={"transport-" + lesson.id}
                      checked={transportType === "pickup"}
                      onChange={() => setTransportType("pickup")}
                    />
                    Vou na carrinha
                  </label>

                  <label className="check-row">
                    <input
                      type="radio"
                      name={"transport-" + lesson.id}
                      checked={transportType === "beach"}
                      onChange={() => setTransportType("beach")}
                    />
                    Vou direto para a praia
                  </label>

                  {transportType === "pickup" && (
                    <>
                      <h4>Escolher pickup</h4>

                      {(lesson.coachPickups || []).length === 0 && (
                        <p className="muted">
                          O treinador ainda não definiu pickups.
                        </p>
                      )}

                      {(lesson.coachPickups || []).map((pickup) => (
                        <label className="check-row" key={pickup.id}>
                          <input
                            type="radio"
                            name={"pickup-" + lesson.id}
                            checked={selectedPickup === pickup.location}
                            onChange={() => setSelectedPickup(pickup.location)}
                          />
                          {pickup.location} — {pickup.time}
                        </label>
                      ))}
                    </>
                  )}

                  <h4>
                    {transportType === "pickup"
                      ? "A partir de que hora consegues estar no pickup?"
                      : "A que horas chegas à praia?"}
                  </h4>

                  <input
                    type="time"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                  />

                  <h4>Material necessário</h4>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={material.softboard}
                      onChange={() => toggleMaterial("softboard")}
                    />
                    Softboard
                  </label>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={material.fiberBoard}
                      onChange={() => toggleMaterial("fiberBoard")}
                    />
                    Prancha fibra
                  </label>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={material.wetsuit}
                      onChange={() => toggleMaterial("wetsuit")}
                    />
                    Fato
                  </label>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={material.lycra}
                      onChange={() => toggleMaterial("lycra")}
                    />
                    Licra
                  </label>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={material.leash}
                      onChange={() => toggleMaterial("leash")}
                    />
                    Leash
                  </label>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={material.vest}
                      onChange={() => toggleMaterial("vest")}
                    />
                    Colete
                  </label>

                  <input
                    placeholder="Outro material"
                    value={material.other}
                    onChange={(e) =>
                      setMaterial({ ...material, other: e.target.value })
                    }
                  />

                  <input
                    placeholder="Observações"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />

                  <button
                    className="primary-btn"
                    onClick={() => confirmLesson(lesson.id)}
                  >
                    Vou ao treino
                  </button>

                  <button
                    className="danger-btn"
                    onClick={() => declineLesson(lesson.id)}
                    style={{ marginLeft: 8 }}
                  >
                    Não vou
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StudentArea;
