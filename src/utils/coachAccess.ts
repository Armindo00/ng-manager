import type { User } from "../types";
import { getCoaches } from "../services/coachesService";

/**
 * Resolve o id de treinador a usar nas aulas.
 * - Contas coach: o id da app é o id em `coaches`
 * - Contas admin (chefe/treinador): tenta o mesmo id; se não existir,
 *   faz match pelo nome para ligar ao registo de treinador
 */
export async function resolveCoachId(user: User): Promise<string | null> {
  if (user.role === "coach") {
    return user.id;
  }

  if (user.role !== "admin") {
    return null;
  }

  const coaches = await getCoaches();
  const byId = coaches.find((coach) => coach.id === user.id);
  if (byId) return byId.id;

  const normalizedName = user.name.trim().toLowerCase();
  const byName = coaches.find(
    (coach) => coach.name.trim().toLowerCase() === normalizedName
  );

  return byName?.id ?? user.id;
}

export function canUseCoachAttendance(user: User) {
  return user.role === "coach" || user.role === "admin";
}
