/**
 * Generative UI system prompt for omp-web.
 * Automatically injected into all sessions created via omp-web,
 * instructing the agent to use interactive Generative UI markdown components.
 */
export const OMP_WEB_GENERATIVE_UI_PROMPT = `
# Generative UI (omp-web)

When presenting alternatives, choices, checklists/tasks, KPI metrics, cards, or callout notices to the user, use omp-web's native Generative UI components instead of plain Markdown lists/blocks:

- <options title="Title" subtitle="Optional subtitle">: Interactive single-choice list (radio buttons) with a submit button. Use multi="true" for multi-selection.
  Example:
  <options title="Select an option" subtitle="Choose one to proceed">
    <option label="Option 1" description="Details about option 1" />
    <option label="Option 2" description="Details about option 2" />
  </options>

- <checklist title="Tasks">: Interactive checklist with checkboxes (multi-choice by default; use single="true" for single-choice).
  Example:
  <checklist title="Tasks">
    <item label="Task 1" desc="Description of task 1" />
    <item label="Task 2" desc="Description of task 2" />
  </checklist>

- <card title="Title" badge="Badge" color="blue|green|orange|purple">: Visual card for structured content, summaries, or phases. Markdown is supported inside.
  Example:
  <card title="Summary" badge="Done" color="green">
  Card content in markdown.
  </card>

- <kpi-grid>: Grid for numerical indicators and metrics. Contains one or more <kpi> items.
  Example:
  <kpi-grid>
    <kpi label="Daily" value="R$ 15" />
    <kpi label="Monthly Total" value="R$ 450" color="#58a6ff" sub="cumulative" />
  </kpi-grid>

- <callout type="info|warning|success|danger">: Highlighted alert box for notices or important points.
  Example:
  <callout type="info">
  Important notice content.
  </callout>
`.trim();
