import { useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, LessonResponse, MaterialRequest, Student } from "../types";
import Modal from "./Modal";

const emptyMaterial = (): MaterialRequest => ({
  softboard: false,
  fiberBoard: false,
  wetsuit: false,
  lycra: false,
  leash: false,
  vest: false,
  other: "",
});

type Props = {
  lesson: Lesson;
  student: Student;
  existingResponse?: LessonResponse;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (response: LessonResponse) => void;
};

function StudentLessonResponseModal({
  lesson,
  student,
  existingResponse,
  saving = false,
  onClose,
  onSubmit,
}: Props) {
  const defaultPickup =
    existingResponse?.pickupLocation ||
    student.pickup ||
    lesson.coachPickups?.[0]?.location ||
    "";

  const [transportType, setTransportType] = useState<"pickup" | "beach">(
    existingResponse?.transportType || "pickup"
  );
  const [pickupLocation, setPickupLocation] = useState(defaultPickup);
  const [availableFrom, setAvailableFrom] = useState(
    existingResponse?.availableFrom || ""
  );
  const [material, setMaterial] = useState<MaterialRequest>(
    existingResponse?.material || emptyMaterial()
  );
  const [notes, setNotes] = useState(existingResponse?.notes || "");

  const pickupOptions = [
    ...(lesson.coachPickups || []).map((pickup) => pickup.location),
    student.pickup,
    defaultPickup,
  ].filter((location, index, list) => location && list.indexOf(location) === index);

  function toggleMaterial(key: keyof Omit<MaterialRequest, "other">) {
    setMaterial((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function handleSubmit() {
    if (!availableFrom.trim()) {
      toast.error("Indica a hora a que estás disponível.");
      return;
    }

    if (transportType === "pickup" && !pickupLocation.trim()) {
      toast.error("Indica o local de pickup.");
      return;
    }

    onSubmit({
      studentId: student.id,
      status: "confirmed",
      transportType,
      pickupLocation: transportType === "pickup" ? pickupLocation.trim() : "",
      availableFrom: availableFrom.trim(),
      material: {
        ...material,
        other: material.other.trim(),
      },
      notes: notes.trim(),
    });
  }

  const canSubmit =
    availableFrom.trim().length > 0 &&
    (transportType === "beach" || pickupLocation.trim().length > 0);

  return (
    <Modal
      title={`Confirmar presença — ${lesson.date}`}
      onClose={onClose}
    >
      <div className="student-response-form">
        <p className="muted">
          {lesson.time || "--:--"} · {lesson.beach || "Praia por definir"} ·{" "}
          {lesson.groupName || "Treino"}
        </p>

        <div className="student-response-section">
          <span className="student-response-label">Como vais?</span>

          <div className="student-response-options">
            <label className="student-response-option">
              <input
                type="radio"
                name="transportType"
                checked={transportType === "pickup"}
                onChange={() => setTransportType("pickup")}
              />
              Vou na carrinha (pickup)
            </label>

            <label className="student-response-option">
              <input
                type="radio"
                name="transportType"
                checked={transportType === "beach"}
                onChange={() => setTransportType("beach")}
              />
              Vou direto para a praia
            </label>
          </div>
        </div>

        {transportType === "pickup" && (
          <div className="student-response-section">
            <label className="student-response-label" htmlFor="pickup-location">
              Local de pickup
            </label>

            {pickupOptions.length > 0 ? (
              <select
                id="pickup-location"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
              >
                <option value="">Selecionar local</option>
                {pickupOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="pickup-location"
                placeholder="Ex: Centro da vila"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
              />
            )}
          </div>
        )}

        <div className="student-response-section">
          <label className="student-response-label" htmlFor="available-from">
            {transportType === "pickup"
              ? "A que horas estás disponível no pickup?"
              : "A que horas chegas à praia?"}
          </label>

          <input
            id="available-from"
            type="time"
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
          />
        </div>

        <div className="student-response-section">
          <span className="student-response-label">Material necessário</span>

          <div className="student-material-grid">
            <label>
              <input
                type="checkbox"
                checked={material.softboard}
                onChange={() => toggleMaterial("softboard")}
              />
              Softboard
            </label>

            <label>
              <input
                type="checkbox"
                checked={material.fiberBoard}
                onChange={() => toggleMaterial("fiberBoard")}
              />
              Prancha fibra
            </label>

            <label>
              <input
                type="checkbox"
                checked={material.wetsuit}
                onChange={() => toggleMaterial("wetsuit")}
              />
              Fato
            </label>

            <label>
              <input
                type="checkbox"
                checked={material.lycra}
                onChange={() => toggleMaterial("lycra")}
              />
              Licra
            </label>

            <label>
              <input
                type="checkbox"
                checked={material.leash}
                onChange={() => toggleMaterial("leash")}
              />
              Leash
            </label>

            <label>
              <input
                type="checkbox"
                checked={material.vest}
                onChange={() => toggleMaterial("vest")}
              />
              Colete
            </label>
          </div>

          <input
            placeholder="Outro material (opcional)"
            value={material.other}
            onChange={(e) =>
              setMaterial((current) => ({ ...current, other: e.target.value }))
            }
          />
        </div>

        <div className="student-response-section">
          <label className="student-response-label" htmlFor="response-notes">
            Notas para o treinador (opcional)
          </label>

          <textarea
            id="response-notes"
            rows={3}
            placeholder="Ex: Chego 5 minutos mais tarde"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="student-response-actions">
          <button className="primary-btn" disabled={!canSubmit || saving} onClick={handleSubmit}>
            {saving ? "A guardar..." : "Confirmar presença"}
          </button>

          <button onClick={onClose} disabled={saving}>
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default StudentLessonResponseModal;
