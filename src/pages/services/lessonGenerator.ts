import type { Lesson } from "../../types";
import { getLessons, addLesson } from "../../services/lessonsService";
import { getRecurringTrainings } from "../../services/recurringTrainingsService";
import { getGroups } from "../../services/groupsService";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export async function generateLessonsFromRecurring() {
  const today = getTodayDate();

  const lessons = await getLessons();
  const recurringTrainings = await getRecurringTrainings();
  const groups = await getGroups();

  for (const training of recurringTrainings) {
    const alreadyExists = lessons.some(
      (lesson) =>
        lesson.date === today &&
        lesson.groupId === training.groupId &&
        lesson.coachName === training.coachName
    );

    if (alreadyExists) continue;

    const groupStudents =
      groups.find((group) => group.id === training.groupId)?.studentIds ?? [];

    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      date: today,
      time: "",
      beach: "",
      status: "draft",
      groupId: training.groupId,
      groupName: training.groupName,
      coachId: training.coachId,
      coachName: training.coachName,
      van: training.van,
      pickupTime: "",
      coachPickups: [],
      bookedStudentIds: groupStudents,
      presentStudentIds: [],
      responses: [],
    };

    await addLesson(newLesson);
  }
}
