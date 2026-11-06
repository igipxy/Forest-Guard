# Cross-Application API Contracts

## Authentication
Machine-to-machine requests between `monitoring-dashboard` and `camera-web` require the `X-Internal-Api-Key` HTTP header matching `CAMERA_API_SECRET`.

## Endpoints (`apps/camera-web` — Port 3001)
- `GET /api/v1/cameras`: Returns all registered cameras with both `status` and `streamStatus`.
- `POST /api/v1/cameras`: Registers a camera (`CameraCreateSchema`) and runs an initial `#EXTM3U` stream probe.
- `POST /api/v1/cameras/:id/heartbeat`: Updates camera `status` (`ONLINE | OFFLINE`), probes the HLS stream if `ONLINE`, and broadcasts changes.
- `GET /api/v1/cameras/events`: Server-Sent Events (SSE) stream emitting real-time status and stream playability transitions.

## Endpoints (`apps/monitoring-dashboard` — Port 3000)
- `POST /api/weather/sync`: Synchronizes weather telemetry from BMKG (`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=...`) with a 6-second abort timeout and labeled fallback support.
- `POST /api/cameras/:id/validate-stream`: Probes a camera's HLS `.m3u8` URL and verifies HTTP 200 + `#EXTM3U` header.
- `GET /api/logs`: Returns structured system logs. Strips `stackTrace` unless `X-User-Role: ADMIN`.