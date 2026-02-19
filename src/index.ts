import type { Probot } from "probot";

import { cancelWorkflowRun, getErrorStatus, postCommitComment } from "./github.js";
import {
  CANCELLATION_MESSAGE,
  decideCancellation,
  type WorkflowRunPayload,
} from "./policy.js";

type WorkflowRunEventPayload = {
  action: string;
  repository: {
    owner: {
      login: string;
    };
    name: string;
  };
  workflow_run: WorkflowRunPayload & {
    head_sha: string;
    html_url: string;
  };
};

const HANDLED_RUNS = new Set<number>();
const SUPPORTED_EVENTS: ["workflow_run.requested", "workflow_run.in_progress"] = [
  "workflow_run.requested",
  "workflow_run.in_progress",
];

export default (app: Probot): void => {
  app.on(SUPPORTED_EVENTS, async (context) => {
    const payload = context.payload as unknown as WorkflowRunEventPayload;
    const run = payload.workflow_run;

    const ref = {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
    };

    const runLog = {
      owner: ref.owner,
      repo: ref.repo,
      runId: run.id,
      action: payload.action,
      status: run.status,
      conclusion: run.conclusion,
      runUrl: run.html_url,
    };

    context.log.info(runLog, "workflow_run event received");

    const decision = decideCancellation(run, HANDLED_RUNS.has(run.id));
    if (!decision.shouldCancel) {
      context.log.info(
        {
          ...runLog,
          policyDecision: decision.reason,
          actionTaken: "skipped",
        },
        "workflow run skipped",
      );
      return;
    }

    HANDLED_RUNS.add(run.id);

    try {
      await cancelWorkflowRun(context, ref, run.id);

      context.log.info(
        {
          ...runLog,
          actionTaken: "cancelled",
        },
        "workflow run cancelled",
      );
    } catch (error: unknown) {
      const status = getErrorStatus(error);

      context.log.error(
        {
          ...runLog,
          actionTaken: "cancel_failed",
          errorStatus: status,
          error,
        },
        "failed to cancel workflow run",
      );
      return;
    }

    try {
      await postCommitComment(context, ref, run.head_sha, CANCELLATION_MESSAGE);

      context.log.info(
        {
          ...runLog,
          actionTaken: "comment_posted",
          sha: run.head_sha,
        },
        "cancellation comment posted",
      );
    } catch (error: unknown) {
      const status = getErrorStatus(error);

      context.log.error(
        {
          ...runLog,
          actionTaken: "comment_failed",
          errorStatus: status,
          sha: run.head_sha,
          error,
        },
        "failed to post cancellation comment",
      );
    }
  });
};
