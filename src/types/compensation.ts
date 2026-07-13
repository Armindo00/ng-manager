export type CompensationStatus =
  | "pending"
  | "approved"
  | "scheduled"
  | "completed"
  | "rejected";

export type LessonCompensation = {
  id: string;
  studentId: string;
  missedLessonId: string;
  compensationLessonId: string | null;
  reason: string;
  status: CompensationStatus;
  adminNotes: string;
  createdAt: string;
};

export const COMPENSATION_STATUS_LABELS: Record<CompensationStatus, string> = {
  pending: "Por validar",
  approved: "A agendar",
  scheduled: "Agendada",
  completed: "Compensada",
  rejected: "Rejeitada",
};
