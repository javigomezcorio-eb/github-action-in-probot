export const CANCELLATION_MESSAGE = `🚫 Pipeline Cancelled

The pipeline has been stopped by the Policy Decision Point due to an incident in production.

If you believe this is an error, please contact the SRE team.`;

export type WorkflowRunPayload = {
  id: number;
  status: string;
  conclusion: string | null;
};

export type PolicyDecision = {
  shouldCancel: boolean;
  reason: string;
};

export function isFreezeModeEnabled(): boolean {
  const value = process.env.FREEZE_MODE;

  if (value === undefined) {
    return true;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function decideCancellation(
  run: WorkflowRunPayload,
  alreadyHandled: boolean,
): PolicyDecision {
  if (!isFreezeModeEnabled()) {
    return { shouldCancel: false, reason: "freeze_mode_disabled" };
  }

  if (run.status === "completed") {
    return { shouldCancel: false, reason: "run_completed" };
  }

  if (run.conclusion === "cancelled") {
    return { shouldCancel: false, reason: "run_already_cancelled" };
  }

  if (alreadyHandled) {
    return { shouldCancel: false, reason: "run_already_handled" };
  }

  return { shouldCancel: true, reason: "policy_cancel_all" };
}
