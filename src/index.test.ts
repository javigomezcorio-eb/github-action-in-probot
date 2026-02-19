import { jest } from "@jest/globals";

import appFn from "./index.js";
import { CANCELLATION_MESSAGE } from "./policy.js";

type Handler = (context: TestContext) => Promise<void>;

type TestContext = {
  payload: {
    action: string;
    repository: {
      owner: { login: string };
      name: string;
    };
    workflow_run: {
      id: number;
      status: string;
      conclusion: string | null;
      head_sha: string;
      html_url: string;
    };
  };
  octokit: {
    request: jest.Mock;
  };
  log: {
    info: jest.Mock;
    error: jest.Mock;
  };
};

function makeContext(overrides?: Partial<TestContext["payload"]["workflow_run"]>): TestContext {
  return {
    payload: {
      action: "requested",
      repository: {
        owner: { login: "acme" },
        name: "service",
      },
      workflow_run: {
        id: 1001,
        status: "in_progress",
        conclusion: null,
        head_sha: "deadbeef",
        html_url: "https://github.com/acme/service/actions/runs/1001",
        ...overrides,
      },
    },
    octokit: {
      request: jest.fn().mockResolvedValue({}),
    },
    log: {
      info: jest.fn(),
      error: jest.fn(),
    },
  };
}

function registerHandler(): Handler {
  let handler: Handler | undefined;

  const app = {
    on: jest.fn((events: readonly string[], h: Handler) => {
      expect(events).toEqual([
        "workflow_run.requested",
        "workflow_run.in_progress",
      ]);
      handler = h;
    }),
  };

  appFn(app as never);

  if (!handler) {
    throw new Error("workflow handler was not registered");
  }

  return handler;
}

describe("workflow run policy app", () => {
  const original = process.env.FREEZE_MODE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.FREEZE_MODE;
    } else {
      process.env.FREEZE_MODE = original;
    }
  });

  test("skips completed workflow runs", async () => {
    process.env.FREEZE_MODE = "true";
    const handler = registerHandler();
    const context = makeContext({ id: 1002, status: "completed" });

    await handler(context);

    expect(context.octokit.request).not.toHaveBeenCalled();
    expect(context.log.error).not.toHaveBeenCalled();
    expect(context.log.info).toHaveBeenCalledWith(
      expect.objectContaining({ actionTaken: "skipped", policyDecision: "run_completed" }),
      "workflow run skipped",
    );
  });

  test("cancels run and posts commit comment", async () => {
    process.env.FREEZE_MODE = "true";
    const handler = registerHandler();
    const context = makeContext({ id: 1003 });

    await handler(context);

    expect(context.octokit.request).toHaveBeenNthCalledWith(
      1,
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel",
      {
        owner: "acme",
        repo: "service",
        run_id: 1003,
      },
    );

    expect(context.octokit.request).toHaveBeenNthCalledWith(
      2,
      "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments",
      {
        owner: "acme",
        repo: "service",
        commit_sha: "deadbeef",
        body: CANCELLATION_MESSAGE,
      },
    );

    expect(context.log.error).not.toHaveBeenCalled();
  });

  test("skips when freeze mode is disabled", async () => {
    process.env.FREEZE_MODE = "false";
    const handler = registerHandler();
    const context = makeContext({ id: 1004 });

    await handler(context);

    expect(context.octokit.request).not.toHaveBeenCalled();
    expect(context.log.info).toHaveBeenCalledWith(
      expect.objectContaining({ actionTaken: "skipped", policyDecision: "freeze_mode_disabled" }),
      "workflow run skipped",
    );
  });

  test("logs and exits when cancel API fails", async () => {
    process.env.FREEZE_MODE = "true";
    const handler = registerHandler();
    const context = makeContext({ id: 1005 });
    context.octokit.request.mockRejectedValueOnce({ status: 403, message: "forbidden" });

    await handler(context);

    expect(context.octokit.request).toHaveBeenCalledTimes(1);
    expect(context.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ actionTaken: "cancel_failed", errorStatus: 403 }),
      "failed to cancel workflow run",
    );
  });

  test("logs comment failure after successful cancellation", async () => {
    process.env.FREEZE_MODE = "true";
    const handler = registerHandler();
    const context = makeContext({ id: 1006 });
    context.octokit.request
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ status: 404, message: "not found" });

    await handler(context);

    expect(context.octokit.request).toHaveBeenCalledTimes(2);
    expect(context.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ actionTaken: "comment_failed", errorStatus: 404 }),
      "failed to post cancellation comment",
    );
  });

  test("handles duplicate events idempotently", async () => {
    process.env.FREEZE_MODE = "true";
    const handler = registerHandler();
    const context = makeContext({ id: 1007 });

    await handler(context);
    await handler(context);

    expect(context.octokit.request).toHaveBeenCalledTimes(2);
    expect(context.log.info).toHaveBeenCalledWith(
      expect.objectContaining({ actionTaken: "skipped", policyDecision: "run_already_handled" }),
      "workflow run skipped",
    );
  });
});
