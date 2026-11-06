# Next Steps to Run Locally or Execute E2E Tests

- **Start both applications in development mode:**

  ```powershell
  pnpm dev
  ```

  - **Monitoring Dashboard:** [http://localhost:3000](http://localhost:3000)
  - **Camera Management Web:** [http://localhost:3001](http://localhost:3001)

- **Run Playwright E2E Workflow** (installs Chromium once if not yet installed, then runs the 12-step browser test):

  ```powershell
  npx playwright install chromium
  pnpm test:e2e
  ```
