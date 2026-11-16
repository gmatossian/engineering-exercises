# Incident API frontend

This directory contains the setup-only skeleton for the human-approved Angular + Angular CLI stack. Angular's integrated compiler, development server, and test conventions provide one supported path for the later UI. The tradeoff is a larger dependency footprint and coordinated Angular/CLI upgrades compared with a smaller Vite setup.

The checked-in root is intentionally static. It does not request incidents or contain routing, product behavior, state management, a component library, or deployment configuration.

## Toolchain

The workspace was completed with Node `v24.20.0` and npm `11.19.0`. It uses Angular framework/compiler `22.2.6`, Angular CLI/build `22.2.7`, Vitest `5.1.0`, and TypeScript `6.0.3`. Exact resolutions and transitive dependencies are recorded in `package-lock.json`.

## Prerequisites

- Java 21 for the existing backend
- Node 24 LTS (`.nvmrc` contains `24`)
- npm 11.19.0 (recorded as `npm@11.19.0` in `packageManager`)

## Contributor workflow

Run each command from the repository root. Backend and frontend startup use separate foreground terminals.

Install the frontend dependencies from the committed lockfile:

```sh
cd incident-api/frontend
nvm use
npm ci
```

Start the backend in terminal 1:

```sh
cd incident-api/backend
./mvnw spring-boot:run
```

Wait for `http://127.0.0.1:8081/actuator/health`. The backend uses an in-memory database; restarting it restores its fixtures.

Start the frontend with its always-enabled development proxy in terminal 2:

```sh
cd incident-api/frontend
npm run dev
```

Open the frontend URL printed by Angular CLI, normally `http://localhost:4200/`. Relative `/incidents` requests are forwarded unchanged to `http://127.0.0.1:8081`; the proxy does not change backend CORS behavior.

Produce a production build:

```sh
cd incident-api/frontend
npm run build
```

The configured browser output is `incident-api/frontend/dist/frontend/browser`.

Run the one-shot TestBed root-render smoke test:

```sh
cd incident-api/frontend
npm test
```

The test renders the actual standalone root, performs change detection, and asserts the visible `Incident API frontend` heading. The `test` script uses Angular CLI's Vitest target, exits after one run, and returns nonzero when the assertion fails.
