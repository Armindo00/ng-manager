export function formatVanCapacity(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const seats = Number(digits);
  if (!Number.isFinite(seats) || seats < 1) return "";

  return seats === 1 ? "1 Lugar" : `${seats} Lugares`;
}
