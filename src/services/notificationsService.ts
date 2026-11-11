import type { User } from "../types";
import { getLessons } from "./lessonsService";
import { getStudents } from "./studentsService";
import { getPayments } from "./paymentsService";
import { getTodayDate } from "../utils/dateUtils";
import { canMarkAttendance } from "../utils/lessonWorkflow";

export type Notification = {
  id: string;
  text: string;
};

export async function getNotifications(user: User): Promise<Notification[]> {
  const notifications: Notification[] = [];

  if (user.role === "admin") {
    const [lessons, students, payments] = await Promise.all([
      getLessons(),
      getStudents(),
      getPayments(),
    ]);

    const today = getTodayDate();
    const openToday = lessons.filter(
      (lesson) => lesson.date === today && lesson.status !== "finished"
    ).length;

    if (openToday > 0) {
      notifications.push({
        id: "open-today",
        text: `${openToday} treino(s) abertos hoje`,
      });
    }

    const unpaidStudents = students.filter((student) => !student.paid).length;

    if (unpaidStudents > 0) {
      notifications.push({
        id: "unpaid-students",
        text: `${unpaidStudents} aluno(s) com mensalidade em falta`,
      });
    }

    const pendingPayments = payments.filter(
      (payment) => payment.status === "pending"
    ).length;

    if (pendingPayments > 0) {
      notifications.push({
        id: "pending-payments",
        text: `${pendingPayments} pagamento(s) pendente(s)`,
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
