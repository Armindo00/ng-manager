function isUselessMessage(value: string) {
  const normalized = value.trim();
  return (
    !normalized ||
    normalized === "{}" ||
    normalized === "[]" ||
    normalized === "[object Object]" ||
    normalized === "null" ||
    normalized === "undefined"
  );
}

export function toErrorMessage(
  value: unknown,
  fallback = "Erro inesperado."
): string {
  if (value == null || value === false) return fallback;

  if (typeof value === "string") {
    return isUselessMessage(value) ? fallback : value.trim();
  }

  if (value instanceof Error) {
    return isUselessMessage(value.message) ? fallback : value.message;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.error === "string" && !isUselessMessage(record.error)) {
      return record.error.trim();
    }

    if (typeof record.message === "string" && !isUselessMessage(record.message)) {
      return record.message.trim();
    }

    if (record.error && typeof record.error === "object") {
      const nested: string = toErrorMessage(record.error, "");
      if (nested) return nested;
    }

    const keys = Object.keys(record);
    if (keys.length === 0) return fallback;

    try {
      const json = JSON.stringify(value);
      return isUselessMessage(json) ? fallback : json;
    } catch {
      return fallback;
    }
  }

  const asString = String(value);
  return isUselessMessage(asString) ? fallback : asString;
}
