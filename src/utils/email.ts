export function normalizeEmail(email: string) {
  return email
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

export function isValidEmail(email: string) {
  const normalized = normalizeEmail(email);

  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized);
}

export function getEmailValidationMessage(email: string) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return "O email é obrigatório.";
  }

  if (!normalized.includes("@")) {
    return "O email deve conter @. Exemplo: aluno@escola.com";
  }

  if (!isValidEmail(normalized)) {
    return `Email inválido: "${email}". Usa um formato como aluno@escola.com`;
  }

  return null;
}
