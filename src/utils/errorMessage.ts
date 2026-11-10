export function toErrorMessage(value: unknown, fallback = "Erro inesperado.") {
  if (!value) return fallback;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (value instanceof Error) {
    return value.message || fallback;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return String(value);
}
