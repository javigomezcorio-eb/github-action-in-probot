import { decideCancellation, isFreezeModeEnabled } from "./policy.js";

describe("isFreezeModeEnabled", () => {
  const original = process.env.FREEZE_MODE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.FREEZE_MODE;
      return;
    }

    process.env.FREEZE_MODE = original;
  });

  test("returns true when FREEZE_MODE is unset", () => {
    delete process.env.FREEZE_MODE;

    expect(isFreezeModeEnabled()).toBe(true);
  });

  test("returns true for truthy values", () => {
    process.env.FREEZE_MODE = " true ";
    expect(isFreezeModeEnabled()).toBe(true);

    process.env.FREEZE_MODE = "1";
    expect(isFreezeModeEnabled()).toBe(true);

    process.env.FREEZE_MODE = "on";
    expect(isFreezeModeEnabled()).toBe(true);
  });

  test("returns false for other values", () => {
    process.env.FREEZE_MODE = "false";
    expect(isFreezeModeEnabled()).toBe(false);

    process.env.FREEZE_MODE = "0";
    expect(isFreezeModeEnabled()).toBe(false);
  });
});

describe("decideCancellation", () => {
  const original = process.env.FREEZE_MODE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.FREEZE_MODE;
      return;
    }

    process.env.FREEZE_MODE = original;
  });

  test("skips when freeze mode is disabled", () => {
    process.env.FREEZE_MODE = "false";

    expect(
      decideCancellation({ id: 1, status: "in_progress", conclusion: null }, false),
    ).toEqual({ shouldCancel: false, reason: "freeze_mode_disabled" });
  });

  test("skips when run is completed", () => {
    process.env.FREEZE_MODE = "true";

    expect(
      decideCancellation({ id: 2, status: "completed", conclusion: null }, false),
    ).toEqual({ shouldCancel: false, reason: "run_completed" });
  });

  test("skips when run is already cancelled", () => {
    process.env.FREEZE_MODE = "true";

    expect(
      decideCancellation(
        { id: 3, status: "in_progress", conclusion: "cancelled" },
        false,
      ),
    ).toEqual({ shouldCancel: false, reason: "run_already_cancelled" });
  });

  test("skips when run was already handled", () => {
    process.env.FREEZE_MODE = "true";

    expect(
      decideCancellation({ id: 4, status: "in_progress", conclusion: null }, true),
    ).toEqual({ shouldCancel: false, reason: "run_already_handled" });
  });

  test("cancels when policy applies", () => {
    process.env.FREEZE_MODE = "true";

    expect(
      decideCancellation({ id: 5, status: "in_progress", conclusion: null }, false),
    ).toEqual({ shouldCancel: true, reason: "policy_cancel_all" });
  });
});
