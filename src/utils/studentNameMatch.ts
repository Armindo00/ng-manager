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
