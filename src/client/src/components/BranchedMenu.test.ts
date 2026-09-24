import { describe, expect, it } from "bun:test";
import {
  BranchedMenu,
  DEFAULT_BRANCHED_ITEMS,
  calculateBranchPath,
  calculateReachLength,
  calculateReachPath,
  type BranchedMenuItem,
} from "./BranchedMenu";

describe("BranchedMenu math helpers", () => {
  it("calculates branch curve path correctly", () => {
    const trunk = 14;
    const rowY = 24;
    const r = 10;
    const endX = 32;

    const path = calculateBranchPath(trunk, rowY, r, endX);
    expect(path).toBe("M 14 14 A 10 10 0 0 0 24 24 H 32");
  });

  it("calculates reach path from trunk top to item row", () => {
    const trunk = 14;
    const rowY = 24;
    const r = 10;
    const endX = 32;

    const path = calculateReachPath(trunk, rowY, r, endX);
    expect(path).toBe("M 14 0 V 14 A 10 10 0 0 0 24 24 H 32");
  });

  it("calculates exact path length for stroke animation", () => {
    const trunk = 14;
    const rowY = 24;
    const r = 10;
    const endX = 32;

    const length = calculateReachLength(trunk, rowY, r, endX);
    // (24 - 10) + (Math.PI * 10) / 2 + (32 - 14 - 10) = 14 + 15.70796... + 8 = 37.70796...
    expect(length).toBeCloseTo(37.708, 2);
  });
});

describe("BranchedMenu component", () => {
  it("initializes with default items and properties", () => {
    const menu = new BranchedMenu();
    expect(menu.items).toEqual(DEFAULT_BRANCHED_ITEMS);
    expect(menu.defaultOpen).toBe(0);
    expect(menu.width).toBe(240);
    expect(menu.rowHeight).toBe(36);
    expect(menu.indent).toBe(40);
    expect(menu.trunk).toBe(14);
    expect(menu.radius).toBe(10);
    expect(menu.lineWidth).toBe(1.5);
    expect(menu.fontSize).toBe(14);
    expect(menu.drawDuration).toBe(400);
    expect(menu.foldDuration).toBe(300);
  });

  it("renders template with default items", () => {
    const menu = new BranchedMenu();
    const rendered = menu.render();
    expect(rendered).toBeDefined();
  });

  it("renders with custom items and handles selection", () => {
    const customItems: BranchedMenuItem[] = [
      {
        label: "Tools",
        children: [
          { value: "eval", label: "Eval" },
          { value: "bash", label: "Bash" },
        ],
      },
    ];

    let selectedValue = "";
    const menu = new BranchedMenu();
    menu.items = customItems;
    menu.defaultOpen = 0;
    menu.defaultActive = "eval";
    menu.onSelect = (val) => {
      selectedValue = val;
    };

    const rendered = menu.render();
    expect(rendered).toBeDefined();

    // Test selection trigger
    // @ts-expect-error accessing private method for unit test
    menu.selectItem("bash", customItems[0].children![1]);
    expect(selectedValue).toBe("bash");
  });

  it("toggles section open and closed", () => {
    let toggledIndex = -1;
    let toggledOpen = false;

    const menu = new BranchedMenu();
    menu.defaultOpen = [0];
    menu.onToggle = (idx, open) => {
      toggledIndex = idx;
      toggledOpen = open;
    };

    // @ts-expect-error accessing private method for unit test
    menu.toggleSection(0);
    expect(toggledIndex).toBe(0);
    expect(toggledOpen).toBe(true);

    // @ts-expect-error accessing private method for unit test
    menu.toggleSection(0);
    expect(toggledIndex).toBe(0);
    expect(toggledOpen).toBe(false);
  });
});
