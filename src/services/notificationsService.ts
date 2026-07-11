import type { User } from "../types";
import { getLessons } from "./lessonsService";
import { getStudents } from "./studentsService";
import { getPayments } from "./paymentsService";
import { getEvaluations } from "./evaluationsService";

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

    const draftLessons = lessons.filter((lesson) => lesson.status === "draft").length;

    if (draftLessons > 0) {
      notifications.push({
        id: "draft-lessons",
        text: `${draftLessons} treino(s) por publicar`,
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
    const [lessons, evaluations, students] = await Promise.all([
      getLessons(),
      getEvaluations(),
      getStudents(),
    ]);

    const coachLessons = lessons.filter(
      (lesson) =>
        lesson.coachId === user.id || lesson.coachName === user.name
    );

    const draftLessons = coachLessons.filter(
      (lesson) => lesson.status === "draft"
    ).length;

    if (draftLessons > 0) {
      notifications.push({
        id: "coach-draft-lessons",
        text: `${draftLessons} treino(s) por publicar`,
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const todayLessons = coachLessons.filter(
      (lesson) => lesson.date === today && lesson.status !== "finished"
    ).length;

    if (todayLessons > 0) {
      notifications.push({
        id: "coach-today-lessons",
        text: `${todayLessons} treino(s) hoje`,
      });
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const evaluationsThisMonth = evaluations.filter(
      (evaluation) =>
        evaluation.month === currentMonth &&
        evaluation.year === currentYear &&
        evaluation.coachId === user.id
    );

    const pendingEvaluations = students.filter(
      (student) =>
        !evaluationsThisMonth.some(
          (evaluation) => evaluation.studentId === student.id
        )
    ).length;

    if (pendingEvaluations > 0) {
      notifications.push({
        id: "coach-pending-evaluations",
        text: `${pendingEvaluations} avaliação(ões) por fazer este mês`,
      });
    }
  }

  if (user.role === "student" && user.studentId) {
    const [lessons, payments] = await Promise.all([
      getLessons(),
      getPayments(),
    ]);

    const today = new Date().toISOString().split("T")[0];
    const studentId = user.studentId;

    const pendingLessons = lessons.filter(
      (lesson) =>
        lesson.status === "published" &&
        lesson.date >= today &&
        lesson.bookedStudentIds.includes(studentId) &&
        !lesson.responses?.some((response) => response.studentId === studentId)
    ).length;

    if (pendingLessons > 0) {
      notifications.push({
        id: "student-pending-lessons",
        text: `${pendingLessons} treino(s) por responder`,
      });
    }

    const pendingPayments = payments.filter(
      (payment) =>
        payment.studentId === studentId && payment.status === "pending"
    ).length;

    if (pendingPayments > 0) {
      notifications.push({
        id: "student-pending-payments",
        text: `${pendingPayments} pagamento(s) pendente(s)`,
      });
    }
  }

  return notifications;
}
