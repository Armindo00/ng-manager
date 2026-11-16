import type { FixedTraining } from "../data/fixedTrainings";
import type { Lesson, User } from "../types";
import type { InventoryItem } from "../types/inventory";
import type { Van, VanTask } from "../types/van";
import { VAN_TASK_TYPE_LABELS } from "../types/van";
import { listVansWithLowKeys } from "./adminAttentionAlerts";
import {
  addDays,
  formatDisplayDate,
  getTodayDate,
  getWeekdayKey,
} from "./dateUtils";
import {
  findRegisteredLessonForGroup,
  getFixedTrainingsForWeekday,
} from "./fixedScheduleCalendar";
import { namesMatchLoose } from "./studentNameMatch";
import { getVanTaskStatus } from "./vanTasks";
import { canMarkAttendance } from "./lessonWorkflow";

export type CoachAttentionAlert = {
  id: string;
  text: string;
  detail?: string;
  severity: "warn" | "danger";
};

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

function isCoachAssignedToGroup(group: FixedTraining, user: User) {
  // Com treinador definido: só esse treinador é avisado.
  if (group.coachName?.trim()) {
    return namesMatchLoose(group.coachName, user.name);
  }
  // Sem treinador no grupo: aviso partilhado a todos os coaches.
  return true;
}

export function listUnregisteredCoachSessions(options: {
  user: User;
  lessons: Lesson[];
  fixedTrainings: FixedTraining[];
  lookbackDays?: number;
  today?: string;
}) {
  const today = options.today ?? getTodayDate();
  const lookbackDays = options.lookbackDays ?? 7;
  const missed: Array<{
    id: string;
    date: string;
    group: FixedTraining;
  }> = [];

  for (let offset = 0; offset < lookbackDays; offset += 1) {
    const date = addDays(today, -offset);
    const weekday = getWeekdayKey(date);
    const groups = getFixedTrainingsForWeekday(
      weekday,
      options.fixedTrainings
    ).filter((group) => isCoachAssignedToGroup(group, options.user));

    for (const group of groups) {
      const registered = findRegisteredLessonForGroup(
        options.lessons,
        date,
        group
      );
      if (registered) continue;

      missed.push({
        id: `missed-${group.id}-${date}`,
        date,
        group,
      });
    }
  }

  return missed.sort((a, b) => b.date.localeCompare(a.date));
}

export function buildCoachAttentionAlerts(options: {
  user: User;
  lessons: Lesson[];
  fixedTrainings: FixedTraining[];
  vanTasks: VanTask[];
  vans?: Van[];
  inventoryItems?: InventoryItem[];
  today?: string;
}): CoachAttentionAlert[] {
  const today = options.today ?? getTodayDate();
  const alerts: CoachAttentionAlert[] = [];
  const vans = options.vans || [];
  const inventoryItems = options.inventoryItems || [];
  const vanNameById = new Map(
    vans.map((van) => [
      van.id,
      van.name || van.plate || "Carrinha",
    ])
  );

  // Admin usa "Hoje" (este ecrã) no dia a dia — os avisos de chaves têm de aparecer aqui.
  if (options.user.role === "admin") {
    const lowKeyVans = listVansWithLowKeys(vans, inventoryItems);
    if (lowKeyVans.length > 0) {
      alerts.push({
        id: "van-keys-low-summary",
        text: `${lowKeyVans.length} ${plural(
          lowKeyVans.length,
          "carrinha com menos de 2 chaves",
          "carrinhas com menos de 2 chaves"
        )}`,
        detail: lowKeyVans.map((row) => row.label).join(", "),
        severity: lowKeyVans.some((row) => row.total === 0) ? "danger" : "warn",
      });

      for (const row of lowKeyVans) {
        const missingLabel =
          row.missing.length === 2
            ? "faltam chave principal e backup"
            : row.missing[0] === "principal"
              ? "falta chave principal"
              : "falta chave backup";

        alerts.push({
          id: `van-keys-low-${row.van.id}`,
          text:
            row.total === 0
              ? `${row.label}: sem chaves`
              : `${row.label}: só ${row.total} ${plural(
                  row.total,
                  "chave",
                  "chaves"
                )}`,
          detail: missingLabel,
          severity: row.total === 0 ? "danger" : "warn",
        });
      }
    }
  }

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
    });
  }

  const missed = listUnregisteredCoachSessions({
    user: options.user,
    lessons: options.lessons,
    fixedTrainings: options.fixedTrainings,
    today,
  });

  // Mostra no máximo 1 aviso detalhado; a partir de 2, resume o resto.
  for (const item of missed.slice(0, 1)) {
    alerts.push({
      id: item.id,
      text:
        item.date === today
          ? `${item.group.title} ainda não registado hoje`
          : `${item.group.title} sem registo (${formatDisplayDate(item.date)})`,
      detail: "Treino da escala por registar — abre o Calendário ou Hoje.",
      severity: item.date === today ? "warn" : "danger",
    });
  }

  if (missed.length > 1) {
    const extra = missed.length - 1;
    alerts.push({
      id: "missed-more",
      text: `+${extra} ${plural(
        extra,
        "treino da escala por registar",
        "treinos da escala por registar"
      )}`,
      detail: "Abre o Calendário ou Hoje para registar.",
      severity: "danger",
    });
  }

  const coachLessons = options.lessons.filter(
    (lesson) =>
      lesson.coachId === options.user.id ||
      namesMatchLoose(lesson.secondaryCoachName || "", options.user.name) ||
      namesMatchLoose(lesson.coachName || "", options.user.name)
  );

  const pendingAttendance = coachLessons.filter((lesson) => {
    if (!canMarkAttendance(lesson) || lesson.status === "finished") {
      return false;
    }
    return lesson.presentStudentIds.length < lesson.bookedStudentIds.length;
  }).length;

  if (pendingAttendance > 0) {
    alerts.push({
      id: "coach-pending-attendance",
      text: `${pendingAttendance} ${plural(
        pendingAttendance,
        "treino com presenças por marcar",
        "treinos com presenças por marcar"
      )}`,
      severity: "warn",
    });
  }

  return alerts;
}
