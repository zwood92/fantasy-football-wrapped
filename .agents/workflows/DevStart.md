---
name: DevStart
description: Starts the local fullstack development server (Express API handlers + Vite Vue 3 live frontend) for testing in the browser.
trigger: user_explicit
---

# DevStart Workflow

This workflow starts the local development instance for Fantasy Football Wrapped and validates browser testing readiness.

## 1. Environment & Pre-Flight Checks
- **Working Directory**: `/Users/zach/Devs/ffwrapped-zw/fantasy-football-wrapped`
- **Port**: Default `3000` (configurable via `PORT` env var).
- **Environment**: Ensure `.env` exists (copy from `.env.example` if missing).
- **Dependencies**: Ensure `node_modules` are installed.

## 2. Port Management & Zombie Cleanup
Before launching, ensure port 3000 is clear of previous dangling instances:
```bash
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
```

## 3. Server Launch
Run the fullstack development server as a background daemon process:
```bash
npm run dev:start
```
*(Alternatively: `npm run dev` / `tsx server.ts`)*

This launches:
- **Express Backend API** (`server.ts`): Handling `/api/espn`, `/api/podcast`, `/api/report-image`, `/api/report-page`.
- **Vite Vue 3 Frontend**: SPA with Hot Module Replacement (HMR).

## 4. Health Check & Verification
Probe the local endpoint to confirm initialization:
```bash
curl -s -I http://localhost:3000
```
Expected HTTP status: `HTTP/1.1 200 OK`

## 5. Testing URL Endpoints in Browser
Once running, open the browser at:
- **Home & Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Trade Lab & Calculator**: [http://localhost:3000/?destination=trade_lab&tradeMode=calculator](http://localhost:3000/?destination=trade_lab&tradeMode=calculator)
- **Player Values**: [http://localhost:3000/?destination=player_values](http://localhost:3000/?destination=player_values)
- **Trending Add/Drop Wire**: [http://localhost:3000/?destination=roster_management](http://localhost:3000/?destination=roster_management)
- **Weekly Podcasts Studio**: [http://localhost:3000/podcasts](http://localhost:3000/podcasts)
- **Weekly Gazette Newsletters**: [http://localhost:3000/newsletters](http://localhost:3000/newsletters)
- **Playoff Odds Simulator**: [http://localhost:3000/fantasy-football-playoff-odds](http://localhost:3000/fantasy-football-playoff-odds)
- **Power Rankings**: [http://localhost:3000/fantasy-football-power-rankings](http://localhost:3000/fantasy-football-power-rankings)
