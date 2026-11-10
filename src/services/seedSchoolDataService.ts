import { getUniqueStudentNames } from "../data/fixedTrainings";
import { schoolCoaches } from "../data/schoolCoaches";
import type { Student } from "../types";
import { addStudent, getStudents } from "./studentsService";
import { getCoaches } from "./coachesService";
import {
  createCoachWithAccess,
  getCoachAccessMap,
  resetCoachPassword,
} from "./coachAuthService";
import { normalizePersonName } from "../utils/studentNameMatch";
import { usernameToAuthEmail } from "../utils/usernameAuth";
import { toErrorMessage } from "../utils/errorMessage";

export type StudentImportResult = {
  created: number;
  skipped: number;
  totalFixed: number;
  createdNames: string[];
};

export type CoachSeedResult = {
  name: string;
  loginName: string;
  created: boolean;
  password?: string;
  message: string;
  ok: boolean;
};

function studentExists(students: Student[], name: string) {
  const target = normalizePersonName(name);
  return students.some(
    (student) => normalizePersonName(student.name) === target
  );
}

function findCoachByName(
  coaches: Array<{ id: string; name: string }>,
  name: string
) {
  const target = normalizePersonName(name);
  return (
    coaches.find((coach) => normalizePersonName(coach.name) === target) || null
  );
}

export async function importFixedStudents() {
  const existing = await getStudents();
  const names = getUniqueStudentNames();
  const knownNames = new Set(
    existing.map((student) => normalizePersonName(student.name))
  );
  const createdNames: string[] = [];
  let skipped = 0;

  for (const name of names) {
    const normalized = normalizePersonName(name);

    if (knownNames.has(normalized) || studentExists(existing, name)) {
      skipped += 1;
      continue;
    }

    const student: Student = {
      id: crypto.randomUUID(),
      name,
      phone: "",
      email: "",
      level: "",
      monthlyLimit: 0,
      paid: false,
      pickup: "",
      mainCoach: "",
      notes: "Importado dos grupos fixos",
    };

    await addStudent(student);
    knownNames.add(normalized);
    createdNames.push(name);
  }

  return {
    created: createdNames.length,
    skipped,
    totalFixed: names.length,
    createdNames,
  } satisfies StudentImportResult;
}

export async function createSchoolCoaches() {
  const [existingCoaches, accessMap] = await Promise.all([
    getCoaches(),
    getCoachAccessMap(),
  ]);
  const results: CoachSeedResult[] = [];

  for (const name of schoolCoaches) {
    const existing = findCoachByName(existingCoaches, name);

    if (existing) {
      try {
        if (!accessMap.has(existing.id)) {
          results.push({
            name,
            loginName: name,
            created: false,
            ok: false,
            message:
              "Treinador já existe, mas sem acesso de login. Cria o acesso em Treinadores.",
          });
          continue;
        }

        const reset = await resetCoachPassword(existing.id);

        results.push({
          name,
          loginName: name,
          created: false,
          ok: true,
          password: reset.password,
          message: reset.password
            ? `Já existia · nova password: ${reset.password}`
            : "Já existia · password reiniciada.",
        });
      } catch (error) {
        results.push({
          name,
          loginName: name,
          created: false,
          ok: false,
          message: `Já existia · ${toErrorMessage(error, "erro ao reiniciar password")}`,
        });
      }
      continue;
    }

    try {
      const email = usernameToAuthEmail(name);
      const result = await createCoachWithAccess(name, email, "-");

      if (!result.hasAccess) {
        results.push({
          name,
          loginName: name,
          created: false,
          ok: false,
          message: toErrorMessage(
            result.error,
            "Não foi possível criar o acesso"
          ),
        });
        continue;
      }

      results.push({
        name,
        loginName: name,
        created: true,
        ok: true,
        password: result.password,
        message: result.password
          ? `Criado · login: ${name} · password: ${result.password}`
          : `Criado · login: ${name}`,
      });
    } catch (error) {
      results.push({
        name,
        loginName: name,
        created: false,
        ok: false,
        message: toErrorMessage(error, "Erro ao criar treinador"),
      });
    }
  }

  return results;
}
