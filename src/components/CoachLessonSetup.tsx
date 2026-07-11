import { useState } from "react";
import toast from "react-hot-toast";
import type { CoachPickup, Lesson } from "../types";
import { updateLesson } from "../services/lessonsService";
import PickupManager from "./PickupManager";

type Props = {
  lesson: Lesson;
  onSaved: () => void;
};

function CoachLessonSetup({ lesson, onSaved }: Props) {
  const [beach, setBeach] = useState(lesson.beach || "");
  const [time, setTime] = useState(lesson.time || "");
  const [pickups, setPickups] = useState<CoachPickup[]>(lesson.coachPickups || []);
  const [saving, setSaving] = useState(false);

  async function savePlan() {
    if (!beach.trim()) {
      toast.error("Indica a praia do treino.");
      return;
    }

    if (!time.trim()) {
      toast.error("Indica a hora de chegada à praia.");
      return;
    }

    try {
      setSaving(true);

      await updateLesson({
        ...lesson,
        beach: beach.trim(),
        time,
        coachPickups: pickups,
        pickupTime: pickups[0]?.time || lesson.pickupTime || "",
      });

      toast.success("Treino atualizado.");
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar treino.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="coach-lesson-setup">
      <h4>Definir praia, hora e pickups</h4>
      <p className="muted">
        Usa as respostas dos alunos abaixo para planear os horários de pickup.
      </p>

      <div className="form-row">
        <input
          placeholder="Praia"
          value={beach}
          onChange={(e) => setBeach(e.target.value)}
        />

        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          title="Hora de chegada à praia"
        />
      </div>

      <PickupManager pickups={pickups} onChange={setPickups} />

      <button className="primary-btn" onClick={savePlan} disabled={saving}>
        {saving ? "A guardar..." : "Guardar plano do treino"}
      </button>
    </div>
  );
}

export default CoachLessonSetup;
