/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/consistent-type-assertions */
import { describe, expect, it, vi } from "vitest";
import { PlanReviewDialog } from "./PlanReviewDialog";

describe("PlanReviewDialog", () => {
  it("renders plan title, path and content", () => {
    const dialog = new PlanReviewDialog();
    dialog.plan = {
      planFilePath: "local://auth-plan.md",
      title: "Auth Refactor",
      planContent: "## Step 1: Token refresh",
    };

    const template = dialog.render();
    expect(template).not.toBeNull();
  });

  it("handles approve action", () => {
    const onApprove = vi.fn();
    const dialog = new PlanReviewDialog();
    dialog.plan = {
      planFilePath: "PLAN.md",
      title: "Main Plan",
      planContent: "# Plan",
    };
    dialog.onApprove = onApprove;

    Reflect.get(dialog, "handleApprove").call(dialog);
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it("handles reject action with feedback", () => {
    const onReject = vi.fn();
    const dialog = new PlanReviewDialog();
    dialog.plan = {
      planFilePath: "PLAN.md",
      title: "Main Plan",
      planContent: "# Plan",
    };
    dialog.onReject = onReject;
    Reflect.set(dialog, "feedback", "needs more steps");

    Reflect.get(dialog, "handleReject").call(dialog);
    expect(onReject).toHaveBeenCalledWith("needs more steps");
  });

  it("handles cancel action on Escape key", () => {
    const onCancel = vi.fn();
    const dialog = new PlanReviewDialog();
    dialog.plan = {
      planFilePath: "PLAN.md",
      title: "Main Plan",
      planContent: "# Plan",
    };
    dialog.onCancel = onCancel;

    const event = { key: "Escape", preventDefault: vi.fn() } as unknown as KeyboardEvent;
    Reflect.get(dialog, "handleGlobalKeyDown").call(dialog, event);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
