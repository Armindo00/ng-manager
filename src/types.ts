export type Role = "student" | "coach" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId?: string;
  mustChangePassword?: boolean;
};

export type Student = {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: string;
  monthlyLimit: number;
  paid: boolean;
  pickup: string;
  mainCoach: string;
  notes: string;
};

export type Coach = {
  id: string;
  name: string;
  phone: string;
};

export type MaterialRequest = {
  softboard: boolean;
  fiberBoard: boolean;
  wetsuit: boolean;
  lycra: boolean;
  leash: boolean;
  vest: boolean;
  other: string;
};

export type LessonResponse = {
  studentId: string;

  status: "confirmed" | "declined";

  transportType: "pickup" | "beach";

  pickupLocation: string;

  availableFrom: string;

  material: MaterialRequest;

  notes: string;
};

export type CoachPickup = {
  id: string;
  location: string;
  time: string;
};

export type Lesson = {
  id: string;

  date: string;
  time: string;

  beach: string;

  status: "draft" | "published" | "finished";

  groupId?: string;
  groupName?: string;

  coachId: string;
  coachName: string;

  van: string;

  pickupTime: string;

  coachPickups?: CoachPickup[];

  coachNotes?: string;

  bookedStudentIds: string[];

  presentStudentIds: string[];

  responses?: LessonResponse[];
};
export type MonthlyEvaluation = {
  id: string;

  studentId: string;

  coachId: string;

  month: number;

  year: number;

  effort: number;

  attendance: number;

  technicalGoal: string;

  goalResult: "completed" | "progress" | "continue";

  coachComment: string;

  nextGoal: string;
};
