/** Treinadores da escola (nomes de uso na app). */
export const schoolCoaches = [
  "Mindo",
  "Goncalo",
  "Manuel",
  "Tiz",
  "Kiko",
  "Tomas",
] as const;

export type SchoolCoachName = (typeof schoolCoaches)[number];
