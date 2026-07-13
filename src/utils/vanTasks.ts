import type { VanTask, VanTaskStatus } from "../types/van";

export function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export function getVanTaskStatus(task: VanTask, today = getTodayDate()): VanTaskStatus {
  if (task.completed) return "completed";

  if (task.dueDate < today) return "overdue";

  const due = new Date(`${task.dueDate}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 14) return "due_soon";

  return "pending";
}

export function sortVanTasks(tasks: VanTask[]) {
  const today = getTodayDate();

  return [...tasks].sort((a, b) => {
    const statusOrder: Record<VanTaskStatus, number> = {
      overdue: 0,
      due_soon: 1,
      pending: 2,
      completed: 3,
    };

    const statusA = getVanTaskStatus(a, today);
    const statusB = getVanTaskStatus(b, today);

    if (statusA !== statusB) {
      return statusOrder[statusA] - statusOrder[statusB];
    }

    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    return a.dueDate.localeCompare(b.dueDate);
  });
}

export function getNextTaskDate(
  tasks: VanTask[],
  taskType: VanTask["taskType"]
) {
  const pending = tasks
    .filter((task) => task.taskType === taskType && !task.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return pending[0]?.dueDate ?? null;
}
