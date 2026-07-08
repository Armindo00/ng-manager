export type WeekDay =
  | "Segunda"
  | "Terça"
  | "Quarta"
  | "Quinta"
  | "Sexta"
  | "Sábado"
  | "Domingo";

export type RecurringTraining = {
  id: string;
  groupId: string;
  groupName: string;
  coachId: string;
  coachName: string;
  van: string;
  weekDay: WeekDay;
  repeatUntil: string;
  active: boolean;
};
