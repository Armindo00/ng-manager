import type { User } from "../types";
import { getLessons } from "./lessonsService";
import { getStudents } from "./studentsService";
import { getPayments } from "./paymentsService";
import { getEvaluations } from "./evaluationsService";
import { getVanTasks, getVans } from "./vansService";
import { getInventoryItems } from "./inventoryService";
import { ensureFixedTrainingsSeeded } from "./fixedTrainingsService";
import type { InventoryItem } from "../types/inventory";
import { buildAdminAttentionAlerts } from "../utils/adminAttentionAlerts";
import { buildCoachAttentionAlerts } from "../utils/coachAttentionAlerts";

export type Notification = {
  id: string;
  text: string;
};

export async function getNotifications(user: User): Promise<Notification[]> {
  const notifications: Notification[] = [];

  if (user.role === "admin") {
    const [lessons, students, payments, evaluations, vanTasks, vans, inventoryItems] =
      await Promise.all([
        getLessons(),
        getStudents(),
        getPayments(),
        getEvaluations(),
        getVanTasks(),
        getVans(),
        getInventoryItems().catch(() => [] as InventoryItem[]),
      ]);

    const attention = buildAdminAttentionAlerts({
      students,
      lessons,
      evaluations,
      vanTasks,
      vans,
      inventoryItems,
    });

    for (const alert of attention) {
      notifications.push({
        id: alert.id,
        text: alert.detail ? `${alert.text} · ${alert.detail}` : alert.text,
      });
    }

    const pendingPayments = payments.filter(
      (payment) => payment.status === "pending"
    ).length;

    if (pendingPayments > 0) {
      notifications.push({
        id: "pending-payments",
        text: `${pendingPayments} pagamento(s) pendente(s) na matriz`,
      });
    }
  }

  if (user.role === "coach") {
    const [lessons, fixedTrainings, vanTasks, vans] = await Promise.all([
      getLessons(),
      ensureFixedTrainingsSeeded(),
      getVanTasks(),
      getVans(),
    ]);

    const attention = buildCoachAttentionAlerts({
      user,
      lessons,
      fixedTrainings,
      vanTasks,
      vans,
    });

    for (const alert of attention) {
      notifications.push({
        id: alert.id,
        text: alert.detail ? `${alert.text} · ${alert.detail}` : alert.text,
      });
    }
  }

  return notifications;
}
