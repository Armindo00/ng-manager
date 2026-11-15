import type { Student } from "../types";

export function normalizePersonName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Match livre para nomes de treinador (ex: "Manuel" ≈ "Manuel Gameiro"). */
export function namesMatchLoose(a: string, b: string) {
  const left = normalizePersonName(a);
  const right = normalizePersonName(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

export function isStudentMainCoach(
  student: Pick<Student, "mainCoach">,
  coachNames: string[]
) {
  return coachNames.some((name) => namesMatchLoose(student.mainCoach, name));
}

export function findStudentByName(students: Student[], name: string) {
  const target = normalizePersonName(name);
  return (
    students.find(
      (student) => normalizePersonName(student.name) === target
    ) || null
  );
}

export function matchStudentIdsByNames(
  names: string[],
  students: Student[]
) {
  const matchedIds: string[] = [];
  const unmatchedNames: string[] = [];

  for (const name of names) {
    const student = findStudentByName(students, name);
    if (student) {
      matchedIds.push(student.id);
    } else {
      unmatchedNames.push(name);
    }
  }

  return { matchedIds, unmatchedNames };
}
