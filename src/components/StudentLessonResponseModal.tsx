import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import type { Lesson, LessonResponse, MaterialRequest, Student } from "../types";
import { formatStudentResponseSummary } from "../utils/lessonResponse";
import { isLessonPlanSent } from "../utils/lessonWorkflow";
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
  inline?: boolean;
  onClose: () => void;
  onSubmit: (response: LessonResponse) => void;
  onDecline: (reason: string) => void;
};

function ResponseShell({
  inline,
  title,
  onClose,
  children,
}: {
  inline?: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (inline) {
    return <div className="student-response-inline">{children}</div>;
  }

  return (
    <Modal title={title} onClose={onClose}>
      {children}
    </Modal>
  );
}

function StudentLessonResponseModal({
  lesson,
  student,
  existingResponse,
  saving = false,
  inline = false,
  onClose,
  onSubmit,
  onDecline,
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
  const [declineMode, setDeclineMode] = useState(false);
  const [declineReason, setDeclineReason] = useState(
    existingResponse?.declineReason || ""
  );

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

  const isConfirmed = existingResponse?.status === "confirmed";
  const isDeclined = existingResponse?.status === "declined";
  const summary = existingResponse ? formatStudentResponseSummary(existingResponse) : [];

  function handleDecline() {
    if (!declineReason.trim()) {
      toast.error("Indica a justificação para não ires ao treino.");
      return;
    }

    onDecline(declineReason.trim());
  }

  const modalTitle = `${lesson.groupName || "Treino"}${lesson.time ? ` · ${lesson.time}` : ""}`;

  if (declineMode || isDeclined) {
    return (
      <ResponseShell inline={inline} title={modalTitle} onClose={onClose}>
        <div className="student-response-form">
          <div className="student-lesson-detail-block">
            <p className="muted student-lesson-detail-date">{lesson.date}</p>
            <p>👨‍🏫 Treinador: {lesson.coachName}</p>
            {isDeclined && (
              <p className="student-status declined">❌ Não vou</p>
            )}
          </div>

          <h3 className="student-response-form-title">
            {isDeclined ? "Justificação registada" : "Justificar ausência"}
          </h3>

          <p className="muted workflow-help">
            Explica o motivo da ausência. O admin vai validar e, se for aceite,
            o treino fica registado para compensação.
          </p>

          <div className="student-response-section">
            <label className="student-response-label" htmlFor="decline-reason">
              Justificação
            </label>
            <textarea
              id="decline-reason"
              rows={4}
              placeholder="Ex: Consulta médica, exame escolar, viagem familiar..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              disabled={isDeclined}
            />
          </div>

          <div className="student-response-actions">
            {!isDeclined && (
              <button
                className="danger-btn"
                disabled={saving || !declineReason.trim()}
                onClick={handleDecline}
              >
                {saving ? "A guardar..." : "Confirmar ausência"}
              </button>
            )}

            {!isDeclined && (
              <button onClick={() => setDeclineMode(false)} disabled={saving}>
                Voltar
              </button>
            )}

            <button onClick={onClose} disabled={saving}>
              Fechar
            </button>
          </div>
        </div>
      </ResponseShell>
    );
  }

  return (
    <ResponseShell inline={inline} title={modalTitle} onClose={onClose}>
      <div className="student-response-form">
        <div className="student-lesson-detail-block">
          <p className="muted student-lesson-detail-date">{lesson.date}</p>

          <div className="student-lesson-detail-grid">
            <p>🏖️ {lesson.beach || "Praia por definir pelo treinador"}</p>
            <p>🕒 Chegada à praia: {lesson.time || "Por definir pelo treinador"}</p>
            <p>👨‍🏫 Treinador: {lesson.coachName}</p>
            <p>🚐 Carrinha: {lesson.van || "Por definir"}</p>
          </div>

          {isLessonPlanSent(lesson) && (lesson.coachPickups || []).length > 0 && (
            <div className="student-plan-pickups">
              <strong>Pickups do treinador:</strong>
              {(lesson.coachPickups || []).map((pickup) => (
                <p key={pickup.id}>
                  {pickup.time} — {pickup.location}
                </p>
              ))}
            </div>
          )}

          {isConfirmed && !isLessonPlanSent(lesson) && (
            <p className="student-plan-pending">
              O treinador ainda não enviou o plano final (praia/hora/pickups).
            </p>
          )}

          {isConfirmed && <p className="student-status confirmed">✅ Vou</p>}
          {isDeclined && <p className="student-status declined">❌ Não vou</p>}
          {!isConfirmed && !isDeclined && (
            <p className="student-status pending">⏳ Por responder</p>
          )}

          {isConfirmed && summary.length > 0 && (
            <div className="student-response-summary">
              {summary.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}

          {isDeclined && existingResponse?.declineReason && (
            <div className="student-response-summary">
              <p>Justificação: {existingResponse.declineReason}</p>
            </div>
          )}
        </div>

        <h3 className="student-response-form-title">
          {existingResponse ? "Atualizar resposta" : "A tua resposta"}
        </h3>

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

          <label className="student-response-label" htmlFor="material-other">
            Outro material (opcional)
          </label>
          <input
            id="material-other"
            placeholder="Ex: Capa de chuva"
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
            {saving ? "A guardar..." : isConfirmed ? "Guardar alterações" : "Confirmar presença"}
          </button>

          <button
            className="danger-btn"
            disabled={saving}
            onClick={() => setDeclineMode(true)}
          >
            Não vou
          </button>

          <button onClick={onClose} disabled={saving}>
            Fechar
          </button>
        </div>
      </div>
    </ResponseShell>
  );
}

export default StudentLessonResponseModal;
