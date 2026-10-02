import { describe, expect, it } from "bun:test";
import { OmpUpdateAnnouncementModal } from "./OmpUpdateAnnouncementModal.js";

describe("OmpUpdateAnnouncementModal", () => {
  it("registers custom element and initial state", () => {
    expect(customElements.get("omp-update-announcement-modal")).toBeDefined();
    const modal = new OmpUpdateAnnouncementModal();
    expect(modal).toBeDefined();
  });

  it("renders modal when isOpen is true", () => {
    const modal = new OmpUpdateAnnouncementModal();
    modal.isOpen = true;
    const template = modal.render();
    expect(template).not.toBeNull();
  });
});
