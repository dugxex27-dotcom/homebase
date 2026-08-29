import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  Clock3,
  UserRound,
} from "lucide-react";

export type MaintenanceVerificationState =
  | "pending"
  | "photo_verified"
  | "contractor_verified"
  | "self_reported"
  | "review_needed";

export interface MaintenanceVerificationStatusData {
  verificationTier?: string | null;
  aiVerificationStatus?: string | null;
  verificationReasonCodes?: string[] | null;
}

const STATE_CONFIG: Record<
  MaintenanceVerificationState,
  {
    label: string;
    description: string;
    badgeClassName: string;
    iconClassName: string;
    Icon: typeof Clock3;
  }
> = {
  pending: {
    label: "Pending verification",
    description: "The evidence review is still in progress.",
    badgeClassName: "bg-sky-50 text-sky-800 border-sky-200",
    iconClassName: "text-sky-700",
    Icon: Clock3,
  },
  photo_verified: {
    label: "Verified by photo evidence",
    description:
      "Photo and evidence checks passed. This is not a professional or contractor confirmation.",
    badgeClassName: "bg-violet-50 text-violet-800 border-violet-200",
    iconClassName: "text-violet-700",
    Icon: Camera,
  },
  contractor_verified: {
    label: "Verified by contractor",
    description: "This record includes contractor verification.",
    badgeClassName: "bg-emerald-50 text-emerald-800 border-emerald-200",
    iconClassName: "text-emerald-700",
    Icon: BadgeCheck,
  },
  self_reported: {
    label: "Self-reported / unverified",
    description: "This is a homeowner report without verification.",
    badgeClassName: "bg-slate-100 text-slate-700 border-slate-200",
    iconClassName: "text-slate-600",
    Icon: UserRound,
  },
  review_needed: {
    label: "Review needed",
    description:
      "We couldn't verify this evidence yet. This does not imply that a human has reviewed it.",
    badgeClassName: "bg-amber-50 text-amber-800 border-amber-200",
    iconClassName: "text-amber-700",
    Icon: AlertTriangle,
  },
};

export function getMaintenanceVerificationState(
  data: MaintenanceVerificationStatusData = {},
): MaintenanceVerificationState {
  const aiStatus = data.aiVerificationStatus;

  // An explicit pending/review state must never be hidden by a tier value.
  if (aiStatus === "pending") return "pending";
  if (
    aiStatus === "review_needed" ||
    data.verificationReasonCodes?.includes("review_needed")
  ) {
    return "review_needed";
  }

  // Rejected and unknown status values are intentionally conservative.
  if (aiStatus === "rejected") return "self_reported";
  if (
    aiStatus &&
    !["not_run", "verified", "pending", "rejected", "review_needed"].includes(
      aiStatus,
    )
  ) {
    return "self_reported";
  }

  if (data.verificationTier === "contractor_verified") {
    return "contractor_verified";
  }
  if (data.verificationTier === "photo_verified") {
    return "photo_verified";
  }

  return "self_reported";
}

interface MaintenanceVerificationStatusProps
  extends MaintenanceVerificationStatusData {
  className?: string;
}

export function MaintenanceVerificationStatus({
  className = "",
  ...data
}: MaintenanceVerificationStatusProps) {
  const state = getMaintenanceVerificationState(data);
  const config = STATE_CONFIG[state];
  const Icon = config.Icon;

  return (
    <div
      className={`flex min-w-0 flex-col items-start gap-1 ${className}`}
      data-testid={`maintenance-verification-status-${state}`}
      aria-label={`${config.label}. ${config.description}`}
    >
      <Badge
        variant="outline"
        className={`inline-flex max-w-full items-center gap-1 whitespace-normal text-left text-xs font-medium ${config.badgeClassName}`}
      >
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${config.iconClassName}`}
          aria-hidden="true"
        />
        <span>{config.label}</span>
      </Badge>
      <p className="max-w-[34rem] text-xs leading-snug text-muted-foreground">
        {config.description}
      </p>
    </div>
  );
}