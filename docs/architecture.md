# System Architecture — Fire Risk Monitoring & Live CCTV System

## 1. Monorepo Structure
The repository uses PNPM Workspaces:
- `apps/monitoring-dashboard` (Port `3000`): Operator and Administrator command center for BMKG weather telemetry, rule-based fire risk scoring, live HLS camera feeds, daily PDF/print reports, real-time alerts, and RBAC system logs.
- `apps/camera-web` (Port `3001`): Dedicated CCTV inventory and stream health management web application.
- `packages/shared`: Single source of truth for TypeScript interfaces, Zod schemas, and fire risk constants.

## 2. Decoupled Camera & Stream Synchronization
Camera connectivity (`status`: `'ONLINE' | 'OFFLINE'`) and video playability (`streamStatus`: `'PLAYABLE' | 'UNAVAILABLE'`) are tracked as two orthogonal state machines:
1. `OFFLINE` + `Any` -> Renders Offline Hardware Placeholder.
2. `ONLINE` + `PLAYABLE` -> Renders HLS.js live video player (`#EXTM3U` verified).
3. `ONLINE` + `UNAVAILABLE` -> Renders Stream Unreachable diagnostic state with manual retry button, raises a `WARNING` alert, and writes a `STREAM_FAILURE` log entry.