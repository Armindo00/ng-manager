export const appVersion = import.meta.env.VITE_APP_VERSION || "dev";
export const appBuildDate = import.meta.env.VITE_APP_BUILD_DATE || "";

export function formatBuildDate(isoDate: string) {
  if (!isoDate) return "";

  return new Date(isoDate).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getVersionLabel() {
  const buildDate = formatBuildDate(appBuildDate);

  if (appVersion === "dev") {
    return "Versão de desenvolvimento";
  }

  if (buildDate) {
    return `v${appVersion} · ${buildDate}`;
  }

  return `v${appVersion}`;
}
