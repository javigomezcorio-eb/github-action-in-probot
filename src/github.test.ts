import { jest } from "@jest/globals";

import {
  cancelWorkflowRun,
  getErrorStatus,
  postCommitComment,
  type RepoRef,
} from "./github.js";

type MockContext = {
  octokit: {
    request: jest.Mock;
  };
};

describe("github helpers", () => {
  const ref: RepoRef = { owner: "acme", repo: "service" };

  test("cancelWorkflowRun calls cancel endpoint", async () => {
    const context: MockContext = {
      octokit: { request: jest.fn().mockResolvedValue({}) },
    };

    await cancelWorkflowRun(context as never, ref, 123);

    expect(context.octokit.request).toHaveBeenCalledWith(
      "POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel",
      {
        owner: "acme",
        repo: "service",
        run_id: 123,
      },
    );
  });

  test("postCommitComment calls commit comments endpoint", async () => {
    const context: MockContext = {
      octokit: { request: jest.fn().mockResolvedValue({}) },
    };

    await postCommitComment(context as never, ref, "abc123", "body");

    expect(context.octokit.request).toHaveBeenCalledWith(
      "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments",
      {
        owner: "acme",
        repo: "service",
        commit_sha: "abc123",
        body: "body",
      },
    );
  });

  test("getErrorStatus returns numeric status", () => {
    expect(getErrorStatus({ status: 403 })).toBe(403);
  });

  test("getErrorStatus returns undefined for invalid error shapes", () => {
    expect(getErrorStatus({ status: "403" })).toBeUndefined();
    expect(getErrorStatus(new Error("x"))).toBeUndefined();
    expect(getErrorStatus(null)).toBeUndefined();
  });
});
