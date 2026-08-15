# Rule: DevStart (Local Development Instance Startup)

## Purpose
Enforces the standard procedure for starting, managing, and health-checking the local fullstack development server for browser testing.

## Execution Rules & Guidelines
1. **Never run `cd` in commands**: Always pass the working directory `Cwd: "/Users/zach/Devs/ffwrapped-zw/fantasy-football-wrapped"`.
2. **Daemon Mode**: Launch long-running development servers with `IsDaemon: true` and appropriate `WaitMsBeforeAsync` (e.g. 3000ms).
3. **Port Freeing**: Always ensure port 3000 is cleared of zombie processes before booting the server (`lsof -ti :3000 | xargs kill -9 2>/dev/null || true` or use `scripts/dev-start.sh`).
4. **Health Check Verification**: After starting the daemon, probe `http://localhost:3000` to confirm HTTP 200 readiness before directing the user.
5. **App Structure**:
   - Backend Express server (`server.ts`) handles API routes (`/api/espn`, `/api/podcast`, `/api/report-image`, `/api/report-page`).
   - Vite runs as Express middleware in development for instant HMR.
