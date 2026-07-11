import type { WeekDay } from "../types/recurringTraining";
import type { Group } from "../types/group";
import type { Lesson } from "../types";
import type { RecurringTraining } from "../services/recurringTrainingsService";
import { addLesson } from "./lessonsService";

const WEEKDAY_TO_JS: Record<WeekDay, number> = {
  Domingo: 0,
  Segunda: 1,
  Terça: 2,
  Quarta: 3,
  Quinta: 4,
  Sexta: 5,
  Sábado: 6,
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getScheduleDates(
  weekDay: WeekDay,
  repeatUntil: string,
  fromDate = new Date()
) {
  const dates: string[] = [];
  const end = new Date(`${repeatUntil}T12:00:00`);
  const current = new Date(fromDate);
  current.setHours(12, 0, 0, 0);

  const targetDay = WEEKDAY_TO_JS[weekDay];

  while (current <= end) {
    if (current.getDay() === targetDay) {
      dates.push(formatDate(current));
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function lessonExists(
  existingLessons: Lesson[],
  groupId: string,
  date: string
) {
  return existingLessons.some(
    (lesson) => lesson.groupId === groupId && lesson.date === date
  );
}

export async function publishTrainingSchedule(
  training: RecurringTraining,
  group: Group,
  existingLessons: Lesson[]
) {
  const dates = getScheduleDates(
    training.weekDay as WeekDay,
    training.repeatUntil
  );

  let created = 0;
  let skipped = 0;

  for (const date of dates) {
    if (lessonExists(existingLessons, training.groupId, date)) {
      skipped += 1;
      continue;
    }

    const lesson: Lesson = {
      id: crypto.randomUUID(),
      date,
      time: "",
      beach: "",
      status: "published",
      groupId: training.groupId,
      groupName: training.groupName,
      coachId: training.coachId,
      coachName: training.coachName,
      van: training.van,
      pickupTime: "",
      coachPickups: [],
      bookedStudentIds: group.studentIds,
      presentStudentIds: [],
      responses: [],
    };

    await addLesson(lesson);
    existingLessons.push(lesson);
    created += 1;
  }

  return { created, skipped, totalDates: dates.length };
}

export async function publishAllTrainingSchedules(
  trainings: RecurringTraining[],
  groups: Group[],
  existingLessons: Lesson[]
) {
  let created = 0;
  let skipped = 0;

  for (const training of trainings) {
    const group = groups.find((item) => item.id === training.groupId);

    if (!group) continue;

    const result = await publishTrainingSchedule(
      training,
      group,
      existingLessons
    );

    created += result.created;
    skipped += result.skipped;
  }

  return { created, skipped };
}
