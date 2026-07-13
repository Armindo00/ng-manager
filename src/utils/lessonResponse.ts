import type { Lesson, LessonResponse } from "../types";

const materialLabels: Record<string, string> = {
  softboard: "Softboard",
  fiberBoard: "Prancha fibra",
  wetsuit: "Fato",
  lycra: "Licra",
  leash: "Leash",
  vest: "Colete",
};

export function getMaterialItems(response: LessonResponse) {
  const items = Object.entries(materialLabels)
    .filter(([key]) => response.material[key as keyof typeof response.material])
    .map(([, label]) => label);

  if (response.material.other) {
    items.push(response.material.other);
  }

  return items;
}

export function formatMaterialText(response?: LessonResponse) {
  if (!response || response.status !== "confirmed") {
    return "—";
  }

  const items = getMaterialItems(response);
  return items.length > 0 ? items.join(", ") : "Sem material";
}

export function formatTransportText(response?: LessonResponse) {
  if (!response) return "Por responder";
  if (response.status === "declined") {
    return response.declineReason
      ? `Não vai · ${response.declineReason}`
      : "Não vai";
  }

  if (response.transportType === "pickup") {
    return `Carrinha · ${response.pickupLocation} · ${response.availableFrom}`;
  }

  return `Praia direta · ${response.availableFrom}`;
}

export function getResponseStatusLabel(response?: LessonResponse) {
  if (!response) return { label: "Por responder", className: "pending" };
  if (response.status === "declined") {
    return {
      label: response.declineReason ? "Não vai (justificado)" : "Não vai",
      className: "declined",
    };
  }
  return { label: "Vou", className: "confirmed" };
}

export function formatStudentResponseSummary(response: LessonResponse) {
  const parts: string[] = [];

  if (response.transportType === "pickup") {
    parts.push(`Pickup: ${response.pickupLocation} às ${response.availableFrom}`);
  } else {
    parts.push(`Praia às ${response.availableFrom}`);
  }

  const materialItems = getMaterialItems(response);

  if (materialItems.length > 0) {
    parts.push(`Material: ${materialItems.join(", ")}`);
  }

  if (response.notes) {
    parts.push(`Notas: ${response.notes}`);
  }

  return parts;
}

export function getLessonMaterialSummary(lesson: Lesson) {
  const summary = {
    softboard: 0,
    fiberBoard: 0,
    wetsuit: 0,
    lycra: 0,
    leash: 0,
    vest: 0,
  };

  lesson.responses?.forEach((response) => {
    if (response.status !== "confirmed") return;

    if (response.material.softboard) summary.softboard++;
    if (response.material.fiberBoard) summary.fiberBoard++;
    if (response.material.wetsuit) summary.wetsuit++;
    if (response.material.lycra) summary.lycra++;
    if (response.material.leash) summary.leash++;
    if (response.material.vest) summary.vest++;
  });

  return summary;
}
