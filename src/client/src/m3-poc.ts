// Import Copilot's full CSS bundle and Squircles library
import "../copilot.css";
import "@progmruansilva/squircles/index.css";

// Export all modular Copilot Lit components
export * from "./copilot";

// Backwards-compatibility alias for m3-poc-dashboard
import { CopilotApp } from "./copilot/CopilotApp";
if (!customElements.get("m3-poc-dashboard")) {
  customElements.define("m3-poc-dashboard", class extends CopilotApp { });
}
