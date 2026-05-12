const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getCycleResetAt(periodStart?: string | null): Date {
  const start = periodStart ? new Date(periodStart) : new Date();
  if (Number.isNaN(start.getTime())) return new Date();
  return new Date(start.getTime() + THIRTY_DAYS_MS);
}

export function formatCycleResetDate(periodStart?: string | null): string {
  return getCycleResetAt(periodStart).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
