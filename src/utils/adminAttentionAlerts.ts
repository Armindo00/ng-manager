import type { Lesson, MonthlyEvaluation, Student } from "../types";
import type { InventoryItem } from "../types/inventory";
import type { Van, VanTask } from "../types/van";
import { VAN_TASK_TYPE_LABELS } from "../types/van";
import { getCurrentMonthYear, getTodayDate } from "./dateUtils";
import { getVanTaskStatus } from "./vanTasks";
import { listOverQuotaStudents } from "./studentTrainingUsage";

export type AttentionSection =
  | "vans"
  | "inventory"
  | "payments"
  | "training-quota"
  | "evaluations"
  | "my-dashboard"
  | "lessons";

export type AttentionAlert = {
  id: string;
  text: string;
  detail?: string;
  severity: "warn" | "danger";
  section?: AttentionSection;
};

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

function sumVanKeySlot(
  inventoryItems: InventoryItem[],
  vanId: string,
  condition: "good" | "fair"
): number {
  return inventoryItems
    .filter(
      (item) =>
        item.itemType === "van_keys" &&
        item.size === vanId &&
        item.condition === condition
    )
    .reduce((sum, item) => sum + item.quantity, 0);
}

/** Principal (good) + backup (fair) por carrinha. */
export function countVanKeys(
  inventoryItems: InventoryItem[],
  vanId: string
): number {
  return (
    sumVanKeySlot(inventoryItems, vanId, "good") +
    sumVanKeySlot(inventoryItems, vanId, "fair")
  );
}

export function getVanKeyShortage(
  inventoryItems: InventoryItem[],
  vanId: string
): {
  principal: number;
  backup: number;
  total: number;
  missing: Array<"principal" | "backup">;
} {
  const principal = sumVanKeySlot(inventoryItems, vanId, "good");
  const backup = sumVanKeySlot(inventoryItems, vanId, "fair");
  const missing: Array<"principal" | "backup"> = [];
  if (principal < 1) missing.push("principal");
  if (backup < 1) missing.push("backup");
  return { principal, backup, total: principal + backup, missing };
}

export function listVansWithLowKeys(
  vans: Van[],
  inventoryItems: InventoryItem[]
) {
  return vans
    .filter((van) => van.active)
    .map((van) => {
      const status = getVanKeyShortage(inventoryItems, van.id);
      return {
        van,
        ...status,
        label: van.name || van.plate || "Carrinha",
      };
    })
    .filter((row) => row.total < 2 || row.missing.length > 0);
}

function missingKeyLabel(missing: Array<"principal" | "backup">) {
  if (missing.length === 2) return "faltam principal e backup";
  if (missing[0] === "principal") return "falta chave principal";
  return "falta chave backup";
}

/** Um único aviso de chaves — sem duplicar resumo + linha por carrinha. */
export function buildVanKeysAttentionAlert(
  vans: Van[],
  inventoryItems: InventoryItem[],
  section?: AttentionSection
): AttentionAlert | null {
  const lowKeyVans = listVansWithLowKeys(vans, inventoryItems);
  if (lowKeyVans.length === 0) return null;

  if (lowKeyVans.length === 1) {
    const row = lowKeyVans[0];
    return {
      id: "van-keys-low",
      text: `${row.label}: ${missingKeyLabel(row.missing)}`,
      detail: "Inventário → Chaves carrinhas",
      severity: row.total === 0 ? "danger" : "warn",
      section,
    };
  }

  return {
    id: "van-keys-low",
    text: `${lowKeyVans.length} carrinhas com menos de 2 chaves`,
    detail: lowKeyVans
      .map((row) => `${row.label} (${missingKeyLabel(row.missing)})`)
      .join(" · "),
    severity: lowKeyVans.some((row) => row.total === 0) ? "danger" : "warn",
    section,
  };
}

export function buildOverdueVanTasksAlert(
  overdueTasks: VanTask[],
  vanNameById: Map<string, string>,
  section?: AttentionSection
): AttentionAlert | null {
  if (overdueTasks.length === 0) return null;

  if (overdueTasks.length === 1) {
    const task = overdueTasks[0];
    const vanLabel = vanNameById.get(task.vanId) || "Carrinha";
    const typeLabel = VAN_TASK_TYPE_LABELS[task.taskType] || "Tarefa";
    return {
      id: `van-overdue-${task.id}`,
      text: `${vanLabel}: ${task.title || typeLabel} em atraso`,
      detail: `Prazo ultrapassado (${task.dueDate})`,
      severity: "danger",
      section,
    };
  }

  const preview = overdueTasks
    .slice(0, 3)
    .map((task) => {
      const vanLabel = vanNameById.get(task.vanId) || "Carrinha";
      const typeLabel = VAN_TASK_TYPE_LABELS[task.taskType] || "Tarefa";
      return `${vanLabel}: ${task.title || typeLabel}`;
    })
    .join(" · ");
  const extra = overdueTasks.length - 3;

  return {
    id: "van-overdue-summary",
    text: `${overdueTasks.length} tarefas de carrinha em atraso`,
    detail: extra > 0 ? `${preview} · +${extra}` : preview,
    severity: "danger",
    section,
  };
}

export function buildAdminAttentionAlerts(options: {
  students: Student[];
  lessons: Lesson[];
  evaluations: MonthlyEvaluation[];
  vanTasks: VanTask[];
  vans?: Van[];
  inventoryItems?: InventoryItem[];
  today?: string;
  month?: number;
  year?: number;
}): AttentionAlert[] {
  const today = options.today ?? getTodayDate();
  const period = getCurrentMonthYear();
  const month = options.month ?? period.month;
  const year = options.year ?? period.year;
  const vans = options.vans || [];
  const inventoryItems = options.inventoryItems || [];
  const vanNameById = new Map(
    vans.map((van) => [van.id, van.name || van.plate || "Carrinha"])
  );

  const alerts: AttentionAlert[] = [];

  const keysAlert = buildVanKeysAttentionAlert(
    vans,
    inventoryItems,
    "inventory"
  );
  if (keysAlert) alerts.push(keysAlert);

  const openVanTasks = options.vanTasks.filter((task) => !task.completed);
  const overdueTasks = openVanTasks.filter(
    (task) => getVanTaskStatus(task, today) === "overdue"
  );
  const dueSoonTasks = openVanTasks.filter(
    (task) => getVanTaskStatus(task, today) === "due_soon"
  );

  const overdueAlert = buildOverdueVanTasksAlert(
    overdueTasks,
    vanNameById,
    "vans"
  );
  if (overdueAlert) alerts.push(overdueAlert);

  if (dueSoonTasks.length > 0) {
    alerts.push({
      id: "van-due-soon",
      text: `${dueSoonTasks.length} ${plural(
        dueSoonTasks.length,
        "tarefa de carrinha",
        "tarefas de carrinha"
      )} a vencer em 14 dias`,
      severity: "warn",
      section: "vans",
    });
  }

  const unpaidStudents = options.students
    .filter((student) => !student.paid)
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));

  if (unpaidStudents.length > 0) {
    const preview = unpaidStudents
      .slice(0, 4)
      .map((student) => student.name)
      .join(", ");
    const extra = unpaidStudents.length - 4;
    alerts.push({
      id: "payments-unpaid",
      text: `${unpaidStudents.length} ${plural(
        unpaidStudents.length,
        "mensalidade em falta",
        "mensalidades em falta"
      )}`,
      detail:
        extra > 0 ? `${preview} e mais ${extra}` : preview || undefined,
      severity: "danger",
      section: "payments",
    });
  }

  const overQuota = listOverQuotaStudents(
    options.students,
    options.lessons,
    month,
    year
  );

  if (overQuota.length > 0) {
    const preview = overQuota
      .slice(0, 4)
      .map((row) => row.studentName)
      .join(", ");
    const extra = overQuota.length - 4;
    alerts.push({
      id: "training-over-quota",
      text: `${overQuota.length} ${plural(
        overQuota.length,
        "atleta com treinos a mais / pack esgotado",
        "atletas com treinos a mais / pack esgotado"
      )}`,
      detail: extra > 0 ? `${preview} e mais ${extra}` : preview || undefined,
      severity: "danger",
      section: "training-quota",
    });
  }

  const todayOpen = options.lessons.filter(
    (lesson) =>
      lesson.date === today &&
      lesson.status !== "draft" &&
      lesson.status !== "finished"
  ).length;

  if (todayOpen > 0) {
    alerts.push({
      id: "sessions-open-today",
      text: `${todayOpen} ${plural(
        todayOpen,
        "sessão ainda aberta hoje",
        "sessões ainda abertas hoje"
      )}`,
      severity: "warn",
      section: "my-dashboard",
    });
  }

  const evaluationsThisMonth = options.evaluations.filter(
    (evaluation) => evaluation.month === month && evaluation.year === year
  ).length;

  if (evaluationsThisMonth === 0) {
    alerts.push({
      id: "evaluations-none",
      text: "Ainda sem avaliações este mês",
      severity: "warn",
      section: "evaluations",
    });
  }

  return alerts;
}
