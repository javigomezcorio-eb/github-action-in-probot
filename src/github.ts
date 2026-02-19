import type { Context } from "probot";

export type RepoRef = {
  owner: string;
  repo: string;
};

export async function cancelWorkflowRun(
  context: Context,
  ref: RepoRef,
  runId: number,
): Promise<void> {
  await context.octokit.request(
    "POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel",
    {
      owner: ref.owner,
      repo: ref.repo,
      run_id: runId,
    },
  );
}

export async function postCommitComment(
  context: Context,
  ref: RepoRef,
  sha: string,
  body: string,
): Promise<void> {
  await context.octokit.request(
    "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments",
    {
      owner: ref.owner,
      repo: ref.repo,
      commit_sha: sha,
      body,
    },
  );
}

export function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") {
      return status;
    }
  }

  return undefined;
}
