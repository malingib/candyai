// SLA targets per priority (in minutes)
// Response = first agent reply; Resolution = ticket closed/resolved
export type Priority = "low" | "medium" | "high" | "urgent";

export const SLA_TARGETS: Record<Priority, { responseMin: number; resolveMin: number }> = {
  urgent: { responseMin: 15, resolveMin: 4 * 60 },
  high: { responseMin: 60, resolveMin: 8 * 60 },
  medium: { responseMin: 4 * 60, resolveMin: 24 * 60 },
  low: { responseMin: 8 * 60, resolveMin: 72 * 60 },
};

const minutesBetween = (a: string | Date, b: string | Date) =>
  Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 60000);

export type SlaState = "met" | "at_risk" | "breached" | "pending";

export interface SlaStatus {
  response: { state: SlaState; remainingMin: number; targetMin: number };
  resolution: { state: SlaState; remainingMin: number; targetMin: number };
}

export const computeSla = (ticket: {
  created_at: string;
  first_response_at?: string | null;
  resolved_at?: string | null;
  priority: Priority;
  status: string;
}): SlaStatus => {
  const target = SLA_TARGETS[ticket.priority];
  const now = new Date();

  // Response SLA
  const responseEnd = ticket.first_response_at ?? now;
  const responseElapsed = minutesBetween(ticket.created_at, responseEnd);
  const responseRemaining = target.responseMin - responseElapsed;
  let responseState: SlaState;
  if (ticket.first_response_at) {
    responseState = responseElapsed <= target.responseMin ? "met" : "breached";
  } else {
    responseState =
      responseRemaining < 0 ? "breached" : responseRemaining < target.responseMin * 0.2 ? "at_risk" : "pending";
  }

  // Resolution SLA
  const resolveEnd = ticket.resolved_at ?? now;
  const resolveElapsed = minutesBetween(ticket.created_at, resolveEnd);
  const resolveRemaining = target.resolveMin - resolveElapsed;
  let resolveState: SlaState;
  if (ticket.resolved_at || ticket.status === "closed") {
    resolveState = resolveElapsed <= target.resolveMin ? "met" : "breached";
  } else {
    resolveState =
      resolveRemaining < 0 ? "breached" : resolveRemaining < target.resolveMin * 0.2 ? "at_risk" : "pending";
  }

  return {
    response: { state: responseState, remainingMin: responseRemaining, targetMin: target.responseMin },
    resolution: { state: resolveState, remainingMin: resolveRemaining, targetMin: target.resolveMin },
  };
};

export const formatDuration = (minutes: number): string => {
  const abs = Math.abs(minutes);
  if (abs < 60) return `${Math.round(abs)}m`;
  if (abs < 60 * 24) return `${Math.floor(abs / 60)}h ${Math.round(abs % 60)}m`;
  return `${Math.floor(abs / (60 * 24))}d ${Math.floor((abs % (60 * 24)) / 60)}h`;
};

export const slaColor: Record<SlaState, string> = {
  met: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-900",
  pending: "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-900",
  at_risk: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-900",
  breached: "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-900",
};
