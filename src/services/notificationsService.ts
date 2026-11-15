import type { User } from "../types";
import { getLessons } from "./lessonsService";
import { getStudents } from "./studentsService";
import { getPayments } from "./paymentsService";
import { getEvaluations } from "./evaluationsService";
import { getVanTasks, getVans } from "./vansService";
import { getTodayDate } from "../utils/dateUtils";
import { canMarkAttendance } from "../utils/lessonWorkflow";
import { buildAdminAttentionAlerts } from "../utils/adminAttentionAlerts";

export type Notification = {
  id: string;
  text: string;
};

export async function getNotifications(user: User): Promise<Notification[]> {
  const notifications: Notification[] = [];

  if (user.role === "admin") {
    const [lessons, students, payments, evaluations, vanTasks, vans] =
      await Promise.all([
        getLessons(),
        getStudents(),
        getPayments(),
        getEvaluations(),
        getVanTasks(),
        getVans(),
      ]);

    const attention = buildAdminAttentionAlerts({
      students,
      lessons,
      evaluations,
      vanTasks,
      vans,
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

    if (
      pendingPayments > 0 &&
      !notifications.some((item) => item.id === "payments-unpaid")
    ) {
      notifications.push({
        id: "pending-payments",
        text: `${pendingPayments} pagamento(s) pendente(s)`,
      });
    } else if (pendingPayments > 0) {
      notifications.push({
        id: "pending-payments",
        text: `${pendingPayments} pagamento(s) pendente(s) na matriz`,
      });
    }
  }

  if (user.role === "coach") {
    const lessons = await getLessons();
    const coachLessons = lessons.filter(
      (lesson) =>
        lesson.coachId === user.id ||
        (lesson.secondaryCoachName || "").toLowerCase() ===
          user.name.trim().toLowerCase()
    );

    const today = getTodayDate();
    const todayLessons = coachLessons.filter(
      (lesson) => lesson.date === today && lesson.status !== "finished"
    ).length;

    if (todayLessons > 0) {
      notifications.push({
        id: "coach-today-lessons",
        text: `${todayLessons} treino(s) hoje`,
      });
    }

    const pendingAttendance = coachLessons.filter((lesson) => {
      if (!canMarkAttendance(lesson) || lesson.status === "finished") {
        return false;
      }

      return lesson.presentStudentIds.length < lesson.bookedStudentIds.length;
    }).length;

    if (pendingAttendance > 0) {
      notifications.push({
        id: "coach-pending-attendance",
        text: `${pendingAttendance} treino(s) com presenças por marcar`,
      });
    }
  }

  return notifications;
}
