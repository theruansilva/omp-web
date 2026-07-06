---
"@ProgmRuanSilva/omp-web": patch
---

Fix terminal output in development mode by dynamically loading `bun-pty` when running under Bun, while preserving `node-pty` for Node.js production and testing environments.
