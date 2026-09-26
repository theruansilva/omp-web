// Import OMP's full CSS bundle and Squircles library
import "../omp.css";
import "@progmruansilva/squircles/index.css";

// Export all modular OMP Lit components
export * from "./omp";

// Backwards-compatibility alias for m3-poc-dashboard
import { OmpApp } from "./omp/OmpApp";
if (!customElements.get("m3-poc-dashboard")) {
  customElements.define("m3-poc-dashboard", class extends OmpApp { });
}
