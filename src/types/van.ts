export type Van = {
  id: string;
  name: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  capacity: string;
  notes: string;
  active: boolean;
};

export type VanTaskType =
  | "inspection"
  | "revision"
  | "maintenance"
  | "insurance"
  | "other";

export type VanTask = {
  id: string;
  vanId: string;
  title: string;
  taskType: VanTaskType;
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
  notes: string;
};

export type VanTaskStatus = "completed" | "overdue" | "due_soon" | "pending";

export const VAN_TASK_TYPE_LABELS: Record<VanTaskType, string> = {
  inspection: "Inspeção",
  revision: "Revisão",
  maintenance: "Manutenção",
  insurance: "Seguro",
  other: "Outro",
};

export const VAN_TASK_STATUS_LABELS: Record<VanTaskStatus, string> = {
  completed: "Concluída",
  overdue: "Em atraso",
  due_soon: "Próxima",
  pending: "Agendada",
};
