import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("omp-agent-process")
export class OmpAgentProcess extends LitElement {
 @property({ type: Number }) currentStep = 0;
 @property({ type: Boolean }) autoAnimate = false;
 private timer: unknown = null;

 protected override createRenderRoot() {
  return this;
 }

 override connectedCallback() {
  super.connectedCallback();
  if (this.autoAnimate) {
   this.startAnimation();
  }
 }

 override disconnectedCallback() {
  super.disconnectedCallback();
  this.clearTimer();
 }

 private clearTimer() {
  if (this.timer) {
   globalThis.clearTimeout(this.timer as number);
   this.timer = null;
  }
 }

 public restartAnimation() {
  this.clearTimer();
  this.currentStep = 0;
  this.startAnimation();
 }

 public goToStep(stepIndex: number) {
  this.clearTimer();
  this.currentStep = Math.max(0, Math.min(stepIndex, 4));
  this.notifyStepChange();
 }

 private startAnimation() {
  const advance = () => {
   this.timer = globalThis.setTimeout(() => {
    if (this.currentStep < 4) {
     this.currentStep += 1;
     this.notifyStepChange();
     advance();
    }
   }, 1900);
  };

  advance();
 }

 private notifyStepChange() {
  this.dispatchEvent(
   new CustomEvent("agent-step-changed", {
    detail: { currentStep: this.currentStep },
    bubbles: true,
    composed: true,
   })
  );
 }

 override render() {
  return html`
      <!-- OMP Agent Process Timeline (Compact Agent Workflow) -->
      <div
        class="omp-agent-timeline-container relative w-full overflow-hidden select-none my-3"
        style="height: 250px; min-height: 250px;"
      >
        <div class="flex size-full flex-col items-center relative">
          ${this.renderStep0()}
          ${this.renderStep1()}
          ${this.renderStep2()}
          ${this.renderStep3()}
          ${this.renderStep4()}
        </div>
      </div>
    `;
 }

 /**
  * Helper to calculate translateY and opacity for a step.
  * Compact centered positioning: calc(-50% + diff * 115%)
  */
 private getStepStyle(stepIndex: number) {
  const diff = stepIndex - this.currentStep;
  const translateY = `calc(-50% + ${diff * 115}%)`;
  let opacity = 1;

  if (diff === 0) {
   opacity = 1;
  } else if (diff === -1) {
   opacity = 0.85;
  } else if (diff < -1) {
   opacity = 0;
  } else if (diff === 1) {
   opacity = 0.35;
  } else {
   opacity = 0;
  }

  return `transform: translateY(${translateY}); opacity: ${opacity}; transition: transform 0.75s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1);`;
 }

 /**
  * Step 0: Thinking & Reasoning
  */
 private renderStep0() {
  const diff = 0 - this.currentStep;
  const isCompleted = diff < 0;
  const isActive = diff === 0;

  return html`
      <div
        class="omp-agent-step w-full max-w-[min(768px,100%)] will-change-[opacity,transform] gpu-text flex justify-start gap-4 md:gap-6 px-4 sm:px-6 absolute top-[50%] cursor-pointer"
        style="min-height: 95px; ${this.getStepStyle(0)}"
        @click=${() => this.goToStep(0)}
      >
        <div class="relative flex min-h-0 w-[44px] items-start justify-center">
          <div class="absolute flex size-full items-start justify-center">
            <div class="border-s border-s-foreground-300 dark:border-s-white/20 h-full"></div>
          </div>
          <div
            class="relative mt-0.5 size-6 rounded-full bg-white will-change-transform dark:bg-background-150 md:size-7"
            style="transform: ${isCompleted ? "scale(1.35)" : isActive ? "scale(1.35)" : "none"}; transition: transform 0.6s ease;"
          >
            <!-- Pending outline ring -->
            <div
              class="absolute inset-0 rounded-full border border-foreground-350 dark:border-white/20 bg-background-200 dark:bg-white/5 will-change-[opacity]"
              style="opacity: ${diff > 0 ? "1" : "0"}; transition: opacity 0.6s ease;"
            ></div>
            <!-- Vibrant Green checkmark (Active) -->
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-white will-change-[opacity] dark:bg-background-150"
              style="opacity: ${isActive ? "1" : "0"}; transition: opacity 0.6s ease;"
            >
              ${this.renderVibrantCheckmarkSvg("s0")}
            </div>
            <!-- Slate/Muted checkmark (Completed) -->
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-background-300 will-change-[opacity]"
              style="opacity: ${isCompleted ? "1" : "0"}; transition: opacity 0.6s ease;"
            >
              ${this.renderSlateCheckmarkSvg()}
            </div>
          </div>
        </div>
        <div
          class="w-full origin-left flex-col pt-0 will-change-[opacity] md:pt-0 rtl:origin-right"
          style="opacity: ${diff <= 0 ? "1" : "0.35"}; transition: opacity 0.6s ease;"
        >
          <h3
            class="w-full origin-left will-change-transform text-base md:text-lg font-medium gpu-text rtl:origin-right ${isActive ? "text-white dark:text-white" : "text-foreground-700 dark:text-foreground-300"}"
            style="transform: ${diff <= 0 ? "none" : "scale(0.88)"}; transition: transform 0.6s ease;"
          >
            Thinking
          </h3>
          <div
            class="flex flex-col gap-2 pt-1 will-change-[opacity]"
            style="opacity: ${diff <= 0 ? "1" : "0"}; transition: opacity 0.6s ease;"
          >
            <div class="text-xs md:text-sm sm:line-clamp-2 text-foreground-700 dark:text-foreground-400">
              Reasoning through plan, constraints and task strategy
            </div>
            <div class="flex flex-wrap gap-2">
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="size-3.5 md:size-4 ${isActive ? "animate-spin" : ""}">
                  <path d="M16.2506 5.18011C15.9994 5.50947 16.0627 5.9801 16.3921 6.23128C18.1804 7.59515 19.25 9.70821 19.25 12C19.25 15.736 16.4242 18.812 12.7933 19.2071L13.4697 18.5303C13.7626 18.2374 13.7626 17.7626 13.4697 17.4697C13.2034 17.2034 12.7867 17.1792 12.4931 17.3971L12.409 17.4697L10.409 19.4697C10.1427 19.7359 10.1185 20.1526 10.3364 20.4462L10.409 20.5303L12.409 22.5303C12.7019 22.8232 13.1768 22.8232 13.4697 22.5303C13.7359 22.2641 13.7601 21.8474 13.5423 21.5538L13.4697 21.4697L12.7194 20.7208C17.2154 20.355 20.75 16.5903 20.75 12C20.75 9.23526 19.4582 6.68321 17.3017 5.03856C16.9724 4.78738 16.5017 4.85075 16.2506 5.18011ZM10.5303 1.46967C10.2374 1.76256 10.2374 2.23744 10.5303 2.53033L11.2796 3.27923C6.78409 3.6456 3.25 7.41008 3.25 12C3.25 14.6445 4.43126 17.0974 6.43081 18.7491C6.75016 19.0129 7.22289 18.9679 7.48669 18.6485C7.75048 18.3292 7.70545 17.8564 7.3861 17.5926C5.72793 16.2229 4.75 14.1922 4.75 12C4.75 8.26436 7.57532 5.18861 11.2057 4.79301L10.5303 5.46967C10.2374 5.76256 10.2374 6.23744 10.5303 6.53033C10.8232 6.82322 11.2981 6.82322 11.591 6.53033L13.591 4.53033C13.8839 4.23744 13.8839 3.76256 13.591 3.46967L11.591 1.46967C11.2981 1.17678 10.8232 1.17678 10.5303 1.46967Z"></path>
                </svg>
                <div class="px-0.5">Deep Thinking (1.8s)</div>
              </div>
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/10 dark:bg-white/5 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs md:text-sm">
                <span class="size-1.5 rounded-full bg-blue-400"></span>
                <span>Planning approach</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
 }

 /**
  * Step 1: Inspecting codebase (Tool calling: glob, read, grep)
  */
 private renderStep1() {
  const diff = 1 - this.currentStep;
  const isCompleted = diff < 0;
  const isActive = diff === 0;

  return html`
      <div
        class="omp-agent-step w-full max-w-[min(768px,100%)] will-change-[opacity,transform] gpu-text flex justify-start gap-4 md:gap-6 px-4 sm:px-6 absolute top-[50%] cursor-pointer"
        style="min-height: 95px; ${this.getStepStyle(1)}"
        @click=${() => this.goToStep(1)}
      >
        <div class="relative flex min-h-0 w-[44px] items-start justify-center">
          <div class="absolute flex size-full items-start justify-center">
            <div class="border-s border-s-foreground-300 dark:border-s-white/20 h-full"></div>
          </div>
          <div
            class="relative mt-0.5 size-6 rounded-full bg-white will-change-transform dark:bg-background-150 md:size-7"
            style="transform: ${isCompleted ? "scale(1.35)" : isActive ? "scale(1.35)" : "none"}; transition: transform 0.6s ease;"
          >
            <!-- Pending outline ring -->
            <div
              class="absolute inset-0 rounded-full border border-foreground-350 dark:border-white/20 bg-background-200 dark:bg-white/5 will-change-[opacity]"
              style="opacity: ${diff > 0 ? "1" : "0"}; transition: opacity 0.6s ease;"
            ></div>
            <!-- Vibrant Green checkmark (Active) -->
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-white will-change-[opacity] dark:bg-background-150"
              style="opacity: ${isActive ? "1" : "0"}; transition: opacity 0.6s ease;"
            >
              ${this.renderVibrantCheckmarkSvg("s1")}
            </div>
            <!-- Slate/Muted checkmark (Completed) -->
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-background-300 will-change-[opacity]"
              style="opacity: ${isCompleted ? "1" : "0"}; transition: opacity 0.6s ease;"
            >
              ${this.renderSlateCheckmarkSvg()}
            </div>
          </div>
        </div>
        <div
          class="w-full origin-left flex-col pt-0 will-change-[opacity] md:pt-0 rtl:origin-right"
          style="opacity: ${diff <= 0 ? "1" : "0.35"}; transition: opacity 0.6s ease;"
        >
          <h3
            class="w-full origin-left will-change-transform text-base md:text-lg font-medium gpu-text rtl:origin-right ${isActive ? "text-white dark:text-white" : "text-foreground-700 dark:text-foreground-300"}"
            style="transform: ${diff <= 0 ? "none" : "scale(0.88)"}; transition: transform 0.6s ease;"
          >
            Inspecting codebase
          </h3>
          <div
            class="flex flex-col gap-2 pt-1 will-change-[opacity]"
            style="opacity: ${diff <= 0 ? "1" : "0"}; transition: opacity 0.6s ease;"
          >
            <div class="text-xs md:text-sm sm:line-clamp-2 text-foreground-700 dark:text-foreground-400">
              Executing tools to locate symbols, files and dependencies
            </div>
            <div class="flex flex-wrap gap-2">
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <svg class="size-3.5 md:size-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M2 4.75A2.75 2.75 0 0 1 4.75 2h3.693a2.75 2.75 0 0 1 1.945.805l1.807 1.808a.75.75 0 0 0 .53.22h4.525A2.75 2.75 0 0 1 20 7.58v8.67A2.75 2.75 0 0 1 17.25 19H4.75A2.75 2.75 0 0 1 2 16.25V4.75Z" clip-rule="evenodd" />
                </svg>
                <div class="px-0.5">tool: glob</div>
              </div>
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <svg class="size-3.5 md:size-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12a1.5 1.5 0 0 1 .439 1.061V16.5A1.5 1.5 0 0 1 15.5 18h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
                </svg>
                <div class="px-0.5">tool: read</div>
              </div>
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <svg class="size-3.5 md:size-4 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" />
                </svg>
                <div class="px-0.5">tool: grep</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
 }

 /**
  * Step 2: Applying changes (Tool execution: edit, bash, mcp)
  */
 private renderStep2() {
  const diff = 2 - this.currentStep;
  const isCompleted = diff < 0;
  const isActive = diff === 0;

  return html`
      <div
        class="omp-agent-step w-full max-w-[min(768px,100%)] will-change-[opacity,transform] gpu-text flex justify-start gap-4 md:gap-6 px-4 sm:px-6 absolute top-[50%] cursor-pointer"
        style="min-height: 95px; ${this.getStepStyle(2)}"
        @click=${() => this.goToStep(2)}
      >
        <div class="relative flex min-h-0 w-[44px] items-start justify-center">
          <div class="absolute flex size-full items-start justify-center">
            <div class="border-s border-s-foreground-300 dark:border-s-white/20 h-full"></div>
          </div>
          <div
            class="relative mt-0.5 size-6 rounded-full bg-white will-change-transform dark:bg-background-150 md:size-7"
            style="transform: ${isCompleted ? "scale(1.35)" : isActive ? "scale(1.35)" : "none"}; transition: transform 0.6s ease;"
          >
            <!-- Pending outline ring -->
            <div
              class="absolute inset-0 rounded-full border border-foreground-350 dark:border-white/20 bg-background-200 dark:bg-white/5 will-change-[opacity]"
              style="opacity: ${diff > 0 ? "1" : "0"}; transition: opacity 0.6s ease;"
            ></div>
            <!-- Vibrant Green checkmark (Active) -->
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-white will-change-[opacity] dark:bg-background-150"
              style="opacity: ${isActive ? "1" : "0"}; transition: opacity 0.6s ease;"
            >
              ${this.renderVibrantCheckmarkSvg("s2")}
            </div>
            <!-- Slate/Muted checkmark (Completed) -->
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-background-300 will-change-[opacity]"
              style="opacity: ${isCompleted ? "1" : "0"}; transition: opacity 0.6s ease;"
            >
              ${this.renderSlateCheckmarkSvg()}
            </div>
          </div>
        </div>
        <div
          class="w-full origin-left flex-col pt-0 will-change-[opacity] md:pt-0 rtl:origin-right"
          style="opacity: ${diff <= 0 ? "1" : "0.35"}; transition: opacity 0.6s ease;"
        >
          <h3
            class="w-full origin-left will-change-transform text-base md:text-lg font-medium gpu-text rtl:origin-right ${isActive ? "text-white dark:text-white" : "text-foreground-700 dark:text-foreground-300"}"
            style="transform: ${diff <= 0 ? "none" : "scale(0.88)"}; transition: transform 0.6s ease;"
          >
            Applying changes
          </h3>
          <div
            class="flex flex-col gap-2 pt-1 will-change-[opacity]"
            style="opacity: ${diff <= 0 ? "1" : "0"}; transition: opacity 0.6s ease;"
          >
            <div class="text-xs md:text-sm sm:line-clamp-2 text-foreground-700 dark:text-foreground-400">
              Running bash commands, editing files and consulting MCP memory
            </div>
            <div class="flex flex-wrap gap-2">
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <svg class="size-3.5 md:size-4 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                </svg>
                <div class="px-0.5">tool: edit</div>
              </div>
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <svg class="size-3.5 md:size-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v11.5A2.25 2.25 0 0 1 15.75 18H4.25A2.25 2.25 0 0 1 2 15.75V4.25Zm4.03 6.28a.75.75 0 0 0-1.06-1.06L3.22 11.22a.75.75 0 0 0 0 1.06l1.75 1.75a.75.75 0 1 0 1.06-1.06L4.81 11.75l1.22-1.22Zm4.22 2.72a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" />
                </svg>
                <div class="px-0.5">tool: bash</div>
              </div>
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <svg class="size-3.5 md:size-4 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6Z" />
                </svg>
                <div class="px-0.5">mcp: ai-memory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
 }

 /**
  * Step 3: Running evals & tests
  */
 private renderStep3() {
  const diff = 3 - this.currentStep;
  const isCompleted = diff < 0;
  const isActive = diff === 0;

  return html`
      <div
        class="omp-agent-step w-full max-w-[min(768px,100%)] will-change-[opacity,transform] gpu-text flex justify-start gap-4 md:gap-6 px-4 sm:px-6 absolute top-[50%] cursor-pointer"
        style="min-height: 95px; ${this.getStepStyle(3)}"
        @click=${() => this.goToStep(3)}
      >
        <div class="relative flex min-h-0 w-[44px] items-start justify-center">
          <div class="absolute flex size-full items-start justify-center">
            <div class="border-s border-s-foreground-300 dark:border-s-white/20 h-full"></div>
          </div>
          <div
            class="relative mt-0.5 size-6 rounded-full bg-white will-change-transform dark:bg-background-150 md:size-7"
            style="transform: ${isCompleted ? "scale(1.35)" : isActive ? "scale(1.35)" : "none"}; transition: transform 0.6s ease;"
          >
            <!-- Pending outline ring -->
            <div
              class="absolute inset-0 rounded-full border border-foreground-350 dark:border-white/20 bg-background-200 dark:bg-white/5 will-change-[opacity]"
              style="opacity: ${diff > 0 ? "1" : "0"}; transition: opacity 0.6s ease;"
            ></div>
            <!-- Vibrant Green checkmark (Active) -->
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-white will-change-[opacity] dark:bg-background-150"
              style="opacity: ${isActive ? "1" : "0"}; transition: opacity 0.6s ease;"
            >
              ${this.renderVibrantCheckmarkSvg("s3")}
            </div>
            <!-- Slate/Muted checkmark (Completed) -->
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-background-300 will-change-[opacity]"
              style="opacity: ${isCompleted ? "1" : "0"}; transition: opacity 0.6s ease;"
            >
              ${this.renderSlateCheckmarkSvg()}
            </div>
          </div>
        </div>
        <div
          class="w-full origin-left flex-col pt-0 will-change-[opacity] md:pt-0 rtl:origin-right"
          style="opacity: ${diff <= 0 ? "1" : "0.35"}; transition: opacity 0.6s ease;"
        >
          <h3
            class="w-full origin-left will-change-transform text-base md:text-lg font-medium gpu-text rtl:origin-right ${isActive ? "text-white dark:text-white" : "text-foreground-700 dark:text-foreground-300"}"
            style="transform: ${diff <= 0 ? "none" : "scale(0.88)"}; transition: transform 0.6s ease;"
          >
            Running evals & tests
          </h3>
          <div
            class="flex flex-col gap-2 pt-1 will-change-[opacity]"
            style="opacity: ${diff <= 0 ? "1" : "0"}; transition: opacity 0.6s ease;"
          >
            <div class="text-xs md:text-sm sm:line-clamp-2 text-foreground-700 dark:text-foreground-400">
              Validating TypeScript typecheck and running unit tests
            </div>
            <div class="flex flex-wrap gap-2">
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <span class="size-1.5 rounded-full bg-blue-400"></span>
                <div class="px-0.5">eval: tsc --noEmit</div>
              </div>
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <span class="size-1.5 rounded-full bg-emerald-400"></span>
                <div class="px-0.5">eval: bun test</div>
              </div>
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <svg class="size-3.5 md:size-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
                </svg>
                <div class="px-0.5">Assertions passed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
 }

 /**
  * Step 4: Synthesizing response
  */
 private renderStep4() {
  const diff = 4 - this.currentStep;
  const isCompleted = diff < 0;
  const isActive = diff === 0;

  return html`
      <div
        class="omp-agent-step w-full max-w-[min(768px,100%)] will-change-[opacity,transform] gpu-text flex justify-start gap-4 md:gap-6 px-4 sm:px-6 absolute top-[50%] cursor-pointer"
        style="min-height: 95px; ${this.getStepStyle(4)}"
        @click=${() => this.goToStep(4)}
      >
        <div class="relative flex min-h-0 w-[44px] items-start justify-center">
          <div class="absolute flex size-full items-start justify-center">
            <div class="border-s border-s-foreground-300 dark:border-s-white/20 h-screen"></div>
          </div>
          <div
            class="relative mt-0.5 size-6 rounded-full bg-white will-change-transform dark:bg-background-150 md:size-7"
            style="transform: ${isCompleted ? "scale(1.35)" : isActive ? "scale(1.35)" : "none"}; transition: transform 0.6s ease;"
          >
            <!-- Pending outline ring -->
            <div
              class="absolute inset-0 rounded-full border border-foreground-350 dark:border-white/20 bg-background-200 dark:bg-white/5 will-change-[opacity]"
              style="opacity: ${diff > 0 ? "1" : "0"}; transition: opacity 0.6s ease;"
            ></div>
            <!-- Vibrant Green checkmark (Active) -->
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-white will-change-[opacity] dark:bg-background-150"
              style="opacity: ${isActive ? "1" : "0"}; transition: opacity 0.6s ease;"
            >
              ${this.renderVibrantCheckmarkSvg("s4")}
            </div>
            <!-- Slate/Muted checkmark (Completed) -->
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-background-300 will-change-[opacity]"
              style="opacity: ${isCompleted ? "1" : "0"}; transition: opacity 0.6s ease;"
            >
              ${this.renderSlateCheckmarkSvg()}
            </div>
          </div>
        </div>
        <div
          class="w-full origin-left flex-col pt-0 will-change-[opacity] md:pt-0 rtl:origin-right"
          style="opacity: ${diff <= 0 ? "1" : "0.35"}; transition: opacity 0.6s ease;"
        >
          <h3
            class="w-full origin-left will-change-transform text-base md:text-lg font-medium gpu-text rtl:origin-right ${isActive ? "text-white dark:text-white" : "text-foreground-700 dark:text-foreground-300"}"
            style="transform: ${diff <= 0 ? "none" : "scale(0.88)"}; transition: transform 0.6s ease;"
          >
            Synthesizing response
          </h3>
          <div
            class="flex flex-col gap-2 pt-1 will-change-[opacity]"
            style="opacity: ${diff <= 0 ? "1" : "0"}; transition: opacity 0.6s ease;"
          >
            <div class="text-xs md:text-sm sm:line-clamp-2 text-foreground-700 dark:text-foreground-400">
              Verifying output criteria and formatting deliverable
            </div>
            <div class="flex flex-wrap gap-2">
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <svg class="size-3.5 md:size-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clip-rule="evenodd" />
                </svg>
                <div class="px-0.5">Verification complete</div>
              </div>
              <div class="relative flex items-center gap-1.5 rounded-full border border-black/12 bg-white/15 px-2.5 py-1 text-foreground-600 dark:text-foreground-300 text-xs dark:bg-white/5 md:gap-2 md:px-3 md:text-sm">
                <span class="size-1.5 rounded-full bg-emerald-400"></span>
                <div class="px-0.5">Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
 }

 /**
  * Vibrant Green checkmark (Active Step in Image 1)
  */
 private renderVibrantCheckmarkSvg(prefix: string) {
  return html`
      <!-- Light mode vibrant checkmark -->
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-6 shrink-0 dark:hidden md:size-7">
        <g clip-path="url(#${prefix}-clip0_23237)">
          <path d="M10 2C14.4183 2 18 5.58172 18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2Z" fill="#C8E8D4"></path>
          <path d="M10 2.25C14.2802 2.25 17.75 5.71979 17.75 10C17.75 14.2802 14.2802 17.75 10 17.75C5.71979 17.75 2.25 14.2802 2.25 10C2.25 5.71979 5.71979 2.25 10 2.25Z" stroke="url(#${prefix}-paint0_linear)" stroke-width="0.5"></path>
          <path d="M13.8327 7.17556C14.031 7.38364 14.053 7.70664 13.8988 7.94025L13.8327 8.02327L9.25894 12.8244C9.06071 13.0325 8.75301 13.0556 8.53046 12.8938L8.45138 12.8244L6.16725 10.4268C5.94425 10.1927 5.94425 9.81315 6.16725 9.57907C6.36547 9.37099 6.67317 9.34787 6.89573 9.50971L6.97481 9.57907L8.85516 11.5532L13.0252 7.17556C13.2482 6.94148 13.6097 6.94148 13.8327 7.17556Z" fill="#0D682B"></path>
        </g>
        <defs>
          <linearGradient id="${prefix}-paint0_linear" x1="10" y1="2" x2="10" y2="18" gradientUnits="userSpaceOnUse">
            <stop stop-color="#6CCF90"></stop>
            <stop offset="1" stop-color="#4AA46B"></stop>
          </linearGradient>
          <clipPath id="${prefix}-clip0_23237">
            <rect width="20" height="20" fill="white"></rect>
          </clipPath>
        </defs>
      </svg>

      <!-- Dark mode vibrant green checkmark (Exact match for Image 1) -->
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="hidden size-6 shrink-0 dark:block md:size-7">
        <g clip-path="url(#${prefix}-clip0_dark)">
          <path opacity="0.5" d="M10 2C14.4183 2 18 5.58172 18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2Z" fill="#0C5D2A"></path>
          <path opacity="0.4" d="M10 2.25C14.2802 2.25 17.75 5.71979 17.75 10C17.75 14.2802 14.2802 17.75 10 17.75C5.71979 17.75 2.25 14.2802 2.25 10C2.25 5.71979 5.71979 2.25 10 2.25Z" stroke="url(#${prefix}-paint0_dark)" stroke-width="0.5"></path>
          <path d="M13.8327 7.17556C14.031 7.38364 14.053 7.70664 13.8988 7.94025L13.8327 8.02327L9.25894 12.8244C9.06071 13.0325 8.75301 13.0556 8.53046 12.8938L8.45138 12.8244L6.16725 10.4268C5.94425 10.1927 5.94425 9.81315 6.16725 9.57907C6.36547 9.37099 6.67317 9.34787 6.89573 9.50971L6.97481 9.57907L8.85516 11.5532L13.0252 7.17556C13.2482 6.94148 13.6097 6.94148 13.8327 7.17556Z" fill="#272320"></path>
          <path d="M13.8327 7.17556C14.031 7.38364 14.053 7.70664 13.8988 7.94025L13.8327 8.02327L9.25894 12.8244C9.06071 13.0325 8.75301 13.0556 8.53046 12.8938L8.45138 12.8244L6.16725 10.4268C5.94425 10.1927 5.94425 9.81315 6.16725 9.57907C6.36547 9.37099 6.67317 9.34787 6.89573 9.50971L6.97481 9.57907L8.85516 11.5532L13.0252 7.17556C13.2482 6.94148 13.6097 6.94148 13.8327 7.17556Z" fill="#63F092"></path>
        </g>
        <defs>
          <linearGradient id="${prefix}-paint0_dark" x1="10" y1="2" x2="10" y2="18" gradientUnits="userSpaceOnUse">
            <stop stop-color="#6CCF90"></stop>
            <stop offset="1" stop-color="#4AA46B"></stop>
          </linearGradient>
          <clipPath id="${prefix}-clip0_dark">
            <rect width="20" height="20" fill="white"></rect>
          </clipPath>
        </defs>
      </svg>
    `;
 }

 /**
  * Slate / Muted checkmark circle (Completed step above, Exact match for Image 1)
  */
 private renderSlateCheckmarkSvg() {
  return html`
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-6 shrink-0 text-foreground-400 dark:text-foreground-500 md:size-7">
        <g>
          <path d="M10 2.5C14.1421 2.5 17.5 5.85786 17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5Z" stroke="currentColor"></path>
          <path d="M13.8327 7.17556C14.031 7.38364 14.053 7.70664 13.8988 7.94025L13.8327 8.02327L9.25894 12.8244C9.06071 13.0325 8.75301 13.0556 8.53046 12.8938L8.45138 12.8244L6.16725 10.4268C5.94425 10.1927 5.94425 9.81315 6.16725 9.57907C6.36547 9.37099 6.67317 9.34787 6.89573 9.50971L6.97481 9.57907L8.85516 11.5532L13.0252 7.17556C13.2482 6.94148 13.6097 6.94148 13.8327 7.17556Z" fill="currentColor"></path>
        </g>
      </svg>
    `;
 }
}

declare global {
 interface HTMLElementTagNameMap {
  "omp-agent-process": OmpAgentProcess;
 }
}
