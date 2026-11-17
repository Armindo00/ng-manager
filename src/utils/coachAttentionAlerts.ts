import type { FixedTraining } from "../data/fixedTrainings";
import type { Lesson, User } from "../types";
import type { InventoryItem } from "../types/inventory";
import type { Van, VanTask } from "../types/van";
import {
  buildOverdueVanTasksAlert,
  buildVanKeysAttentionAlert,
} from "./adminAttentionAlerts";
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

  // Admin usa "Hoje" no dia a dia — chaves têm de aparecer aqui (1 aviso só).
  if (options.user.role === "admin") {
    const keysAlert = buildVanKeysAttentionAlert(vans, inventoryItems);
    if (keysAlert) {
      alerts.push({
        id: keysAlert.id,
        text: keysAlert.text,
        detail: keysAlert.detail,
        severity: keysAlert.severity,
      });
    }
  }

  const openVanTasks = options.vanTasks.filter((task) => !task.completed);
  const overdueTasks = openVanTasks.filter(
    (task) => getVanTaskStatus(task, today) === "overdue"
  );
  const dueSoonTasks = openVanTasks.filter(
    (task) => getVanTaskStatus(task, today) === "due_soon"
  );

  const overdueAlert = buildOverdueVanTasksAlert(overdueTasks, vanNameById);
  if (overdueAlert) {
    alerts.push({
      id: overdueAlert.id,
      text: overdueAlert.text,
      detail: overdueAlert.detail,
      severity: overdueAlert.severity,
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

  // Um único aviso da escala — total + exemplo direto.
  if (missed.length > 0) {
    const todayMissed = missed.filter((item) => item.date === today);
    const sample = todayMissed[0] || missed[0];
    const sampleLabel =
      sample.date === today
        ? sample.group.title
        : `${sample.group.title} (${formatDisplayDate(sample.date)})`;

    alerts.push({
      id: "missed-scale",
      text: `${missed.length} ${plural(
        missed.length,
        "treino da escala por registar",
        "treinos da escala por registar"
      )}`,
      detail:
        missed.length === 1
          ? sampleLabel
          : todayMissed.length > 0
            ? `Hoje: ${sampleLabel}${
                todayMissed.length > 1 ? ` +${todayMissed.length - 1}` : ""
              }`
            : `Ex.: ${sampleLabel}`,
      severity:
        todayMissed.length === missed.length && missed.length === 1
          ? "warn"
          : "danger",
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
