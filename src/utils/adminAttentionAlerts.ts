import type { Lesson, MonthlyEvaluation, Student } from "../types";
import type { Van, VanTask } from "../types/van";
import { VAN_TASK_TYPE_LABELS } from "../types/van";
import { getCurrentMonthYear, getTodayDate } from "./dateUtils";
import { getVanTaskStatus } from "./vanTasks";
import { listOverQuotaStudents } from "./studentTrainingUsage";

export type AttentionSection =
  | "vans"
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

export function buildAdminAttentionAlerts(options: {
  students: Student[];
  lessons: Lesson[];
  evaluations: MonthlyEvaluation[];
  vanTasks: VanTask[];
  vans?: Van[];
  today?: string;
  month?: number;
  year?: number;
}): AttentionAlert[] {
  const today = options.today ?? getTodayDate();
  const period = getCurrentMonthYear();
  const month = options.month ?? period.month;
  const year = options.year ?? period.year;
  const vanNameById = new Map(
    (options.vans || []).map((van) => [van.id, van.name || van.plate || "Carrinha"])
  );

  const alerts: AttentionAlert[] = [];

  const openVanTasks = options.vanTasks.filter((task) => !task.completed);
  const overdueTasks = openVanTasks.filter(
    (task) => getVanTaskStatus(task, today) === "overdue"
  );
  const dueSoonTasks = openVanTasks.filter(
    (task) => getVanTaskStatus(task, today) === "due_soon"
  );

  for (const task of overdueTasks) {
    const vanLabel = vanNameById.get(task.vanId) || "Carrinha";
    const typeLabel = VAN_TASK_TYPE_LABELS[task.taskType] || "Tarefa";
    alerts.push({
      id: `van-overdue-${task.id}`,
      text: `${vanLabel}: ${task.title || typeLabel} em atraso`,
      detail: `Prazo ultrapassado (${task.dueDate})`,
      severity: "danger",
      section: "vans",
    });
  }

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
