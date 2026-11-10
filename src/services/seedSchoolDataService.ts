import { getUniqueStudentNames } from "../data/fixedTrainings";
import { schoolCoaches } from "../data/schoolCoaches";
import type { Student } from "../types";
import { addStudent, getStudents } from "./studentsService";
import { getCoaches } from "./coachesService";
import { createCoachWithAccess } from "./coachAuthService";
import { normalizePersonName } from "../utils/studentNameMatch";
import { usernameToAuthEmail } from "../utils/usernameAuth";

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
  error?: string;
};

function studentExists(students: Student[], name: string) {
  const target = normalizePersonName(name);
  return students.some(
    (student) => normalizePersonName(student.name) === target
  );
}

function coachExistsByName(
  coaches: Array<{ name: string }>,
  name: string
) {
  const target = normalizePersonName(name);
  return coaches.some(
    (coach) => normalizePersonName(coach.name) === target
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
  const existingCoaches = await getCoaches();
  const results: CoachSeedResult[] = [];

  for (const name of schoolCoaches) {
    if (coachExistsByName(existingCoaches, name)) {
      results.push({
        name,
        loginName: name,
        created: false,
        error: "Já existe um treinador com este nome",
      });
      continue;
    }

    try {
      const email = usernameToAuthEmail(name);
      // Telefone interno vazio: a API atual exige um valor truthy.
      const result = await createCoachWithAccess(name, email, "-");

      if (!result.hasAccess) {
        results.push({
          name,
          loginName: name,
          created: false,
          error: result.error || "Não foi possível criar o acesso",
        });
        continue;
      }

      results.push({
        name,
        loginName: name,
        created: true,
        password: result.password,
      });
    } catch (error) {
      results.push({
        name,
        loginName: name,
        created: false,
        error:
          error instanceof Error ? error.message : "Erro ao criar treinador",
      });
    }
  }

  return results;
}
