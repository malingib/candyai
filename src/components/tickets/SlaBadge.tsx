import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle2, Clock, Timer } from "lucide-react";
import { computeSla, formatDuration, slaColor, type Priority } from "@/lib/sla";

interface Props {
  ticket: {
    created_at: string;
    first_response_at?: string | null;
    resolved_at?: string | null;
    priority: Priority;
    status: string;
  };
  compact?: boolean;
}

const iconFor = (state: string) =>
  state === "breached" ? AlertTriangle : state === "met" ? CheckCircle2 : state === "at_risk" ? Timer : Clock;

export const SlaBadge = ({ ticket, compact }: Props) => {
  const sla = computeSla(ticket);
  // Worst state of the two drives the compact pill
  const worst =
    sla.response.state === "breached" || sla.resolution.state === "breached"
      ? sla.response.state === "breached"
        ? sla.response
        : sla.resolution
      : sla.response.state === "at_risk" || sla.resolution.state === "at_risk"
        ? sla.response.state === "at_risk"
          ? sla.response
          : sla.resolution
        : sla.response.state === "met" && sla.resolution.state === "met"
          ? sla.resolution
          : sla.response;

  const Icon = iconFor(worst.state);
  const label =
    worst.state === "breached"
      ? `Breached ${formatDuration(worst.remainingMin)}`
      : worst.state === "met"
        ? "SLA met"
        : worst.state === "at_risk"
          ? `${formatDuration(worst.remainingMin)} left`
          : `${formatDuration(worst.remainingMin)} left`;

  const tooltip = (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Response:</span>
        <span>
          {sla.response.state === "met"
            ? "Met"
            : sla.response.state === "breached"
              ? `Breached by ${formatDuration(sla.response.remainingMin)}`
              : `${formatDuration(sla.response.remainingMin)} of ${formatDuration(sla.response.targetMin)} left`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold">Resolution:</span>
        <span>
          {sla.resolution.state === "met"
            ? "Met"
            : sla.resolution.state === "breached"
              ? `Breached by ${formatDuration(sla.resolution.remainingMin)}`
              : `${formatDuration(sla.resolution.remainingMin)} of ${formatDuration(sla.resolution.targetMin)} left`}
        </span>
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${slaColor[worst.state]} ${compact ? "px-1.5 py-0 text-[10px]" : ""}`}>
            <Icon className="h-3 w-3" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
