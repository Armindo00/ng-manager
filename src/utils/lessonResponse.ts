import type { LessonResponse } from "../types";

const materialLabels: Record<string, string> = {
  softboard: "Softboard",
  fiberBoard: "Prancha fibra",
  wetsuit: "Fato",
  lycra: "Licra",
  leash: "Leash",
  vest: "Colete",
};

export function formatStudentResponseSummary(response: LessonResponse) {
  const parts: string[] = [];

  if (response.transportType === "pickup") {
    parts.push(`Pickup: ${response.pickupLocation} às ${response.availableFrom}`);
  } else {
    parts.push(`Praia às ${response.availableFrom}`);
  }

  const materialItems = Object.entries(materialLabels)
    .filter(([key]) => response.material[key as keyof typeof response.material])
    .map(([, label]) => label);

  if (response.material.other) {
    materialItems.push(response.material.other);
  }

  if (materialItems.length > 0) {
    parts.push(`Material: ${materialItems.join(", ")}`);
  }

  if (response.notes) {
    parts.push(`Notas: ${response.notes}`);
  }

  return parts;
}
