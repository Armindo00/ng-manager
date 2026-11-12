import { schoolCoaches } from "../data/schoolCoaches";
import type { Student } from "../types";
import { addStudent, getStudents } from "./studentsService";
import { ensureSchoolCoach } from "./coachAuthService";
import {
  ensureFixedTrainingsSeeded,
  getUniqueStudentNamesFromTrainings,
} from "./fixedTrainingsService";
import { normalizePersonName } from "../utils/studentNameMatch";
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

export async function importFixedStudents() {
  const existing = await getStudents();
  const trainings = await ensureFixedTrainingsSeeded();
  const names = getUniqueStudentNamesFromTrainings(trainings);
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
      billingType: "monthly",
      monthlyLimit: 0,
      monthlyFee: 0,
      packSize: 0,
      packPrice: 0,
      packRemaining: 0,
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
  const results: CoachSeedResult[] = [];

  for (const name of schoolCoaches) {
    try {
      const result = await ensureSchoolCoach(name);

      if (!result.hasAccess || !result.password) {
        results.push({
          name,
          loginName: name,
          created: false,
          ok: false,
          message: toErrorMessage(
            result.error,
            "A função não devolveu password. Confirma o deploy no Supabase."
          ),
        });
        continue;
      }

      results.push({
        name,
        loginName: name,
        created: !result.repaired,
        ok: true,
        password: result.password,
        message: `Login: ${name} · password: ${result.password}`,
      });
    } catch (error) {
      results.push({
        name,
        loginName: name,
        created: false,
        ok: false,
        message: toErrorMessage(
          error,
          "Falha ao criar treinador. Confirma o deploy da Edge Function admin-student-auth."
        ),
      });
    }
  }

  return results;
}
