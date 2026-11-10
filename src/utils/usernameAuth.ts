import { normalizeEmail } from "./email";

/** Domínio interno: o Supabase Auth precisa de email, mas o utilizador só vê o nome. */
export const AUTH_EMAIL_DOMAIN = "ngmanager.local";

export function usernameToAuthEmail(username: string) {
  const local = username
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  if (!local) {
    throw new Error("Nome de utilizador inválido.");
  }

  return `${local}@${AUTH_EMAIL_DOMAIN}`;
}

/** Aceita nome (Mindo) ou email real (admin). */
export function resolveLoginEmail(login: string) {
  const value = login.trim();

  if (!value) return "";

  if (value.includes("@")) {
    return normalizeEmail(value);
  }

  return usernameToAuthEmail(value);
}
