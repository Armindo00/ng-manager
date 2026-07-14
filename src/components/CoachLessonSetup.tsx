import { useState } from "react";
import toast from "react-hot-toast";
import type { CoachPickup, Lesson } from "../types";
import { updateLesson } from "../services/lessonsService";
import FormField from "./FormField";
import PickupManager from "./PickupManager";
import {
  canSendLessonPlan,
  getPickupStudentsCount,
  isLessonPlanComplete,
  isLessonPlanSent,
} from "../utils/lessonWorkflow";

type Props = {
  lesson: Lesson;
  onSaved: () => void;
};

function CoachLessonSetup({ lesson, onSaved }: Props) {
  const [beach, setBeach] = useState(lesson.beach || "");
  const [time, setTime] = useState(lesson.time || "");
  const [pickups, setPickups] = useState<CoachPickup[]>(lesson.coachPickups || []);
  const [saving, setSaving] = useState(false);

  const pickupStudents = getPickupStudentsCount(lesson);
  const planSent = isLessonPlanSent(lesson);

  async function sendPlan() {
    if (!canSendLessonPlan(lesson)) {
      toast.error("Este treino já foi concluído.");
      return;
    }

    if (!beach.trim()) {
      toast.error("Indica a praia do treino.");
      return;
    }

    if (!time.trim()) {
      toast.error("Indica a hora de chegada à praia.");
      return;
    }

    const validPickups = pickups.filter(
      (pickup) => pickup.location.trim() && pickup.time.trim()
    );

    if (pickupStudents > 0 && validPickups.length === 0) {
      toast.error("Define pelo menos um pickup para os alunos da carrinha.");
      return;
    }

    try {
      setSaving(true);

      await updateLesson({
        ...lesson,
        beach: beach.trim(),
        time,
        coachPickups: validPickups,
        pickupTime: validPickups[0]?.time || lesson.pickupTime || "",
      });

      toast.success("Plano enviado. Os alunos já podem ver praia, hora e pickups.");
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar plano do treino.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="coach-lesson-setup">
      <div className="coach-plan-status">
        {planSent ? (
          <span className="coach-plan-badge sent">Plano enviado aos alunos</span>
        ) : (
          <span className="coach-plan-badge pending">Plano por enviar</span>
        )}

        {isLessonPlanComplete(lesson) && (
          <span className="coach-plan-badge complete">Completo</span>
        )}
      </div>

      <p className="muted">
        Envia <strong>antes do treino</strong> a praia, hora de chegada e pickups.
        Os alunos veem estes dados na área deles.
      </p>

      {pickupStudents > 0 && (
        <p className="coach-plan-hint">
          {pickupStudents} aluno(s) vão na carrinha — define os horários de pickup.
        </p>
      )}

      <div className="form-fields-grid">
        <FormField label="Praia">
          <input
            placeholder="Ex: Praia da Vila"
            value={beach}
            onChange={(e) => setBeach(e.target.value)}
          />
        </FormField>

        <FormField label="Hora de chegada à praia">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </FormField>
      </div>

      <PickupManager pickups={pickups} onChange={setPickups} />

      <button className="primary-btn" onClick={sendPlan} disabled={saving}>
        {saving ? "A enviar..." : "Enviar plano aos alunos"}
      </button>
    </div>
  );
}

export default CoachLessonSetup;
