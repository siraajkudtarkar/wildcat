# Wildcat Fantasy

Cross-platform Expo client with a local Express + Mongo server.

## Prerequisites
- Node.js 18+ and npm
- MongoDB running locally (default URI `mongodb://127.0.0.1:27017/wildcat_dev`)
- Expo CLI (`npm install -g expo` recommended)

## Environment
- Server: Create .env file inside server directory
  - `MONGO_URI` (default local Mongo)
  - `JWT_SECRET` (set to a long random string)
  - `PORT` (default 4000)
  - `DEMO_TOKEN` (will be provided in submission)
- Client (optional): set `EXPO_PUBLIC_API_BASE` to point to your server (e.g. `http://<your-ip>:4000`). If unset, the app auto-derives a host for simulator/device.

## Seed data and demo users
- From `server/`, run `npm run seed` after installing deps to load demo data.
- Demo logins: will be provided in submission

## Install and run
1) Install client deps
```
cd Wildcat
npm install
```
2) Install server deps
```
cd server
npm install
```
3) Seed demo data (optional but recommended)
```
cd server
npm run seed
```
4) Start server
```
cd server
npm run dev
```
5) Start Expo client
```
cd ..
npm start
```
Then open iOS/Android simulator or scan the QR code.

## Build/Deploy notes
- Local dev uses the Express server; ensure `PORT` matches client `EXPO_PUBLIC_API_BASE` if you override it.
- No third-party API keys are required for the current demo build.
- If deploying the server, set the same env vars as in `.env.example` and update `EXPO_PUBLIC_API_BASE` to the deployed URL for clients.

## Key commands
- `npm start` (client via Expo)
- `npm run dev` (server, from `server/`)
- `node ./seed.js` (server, from `server/`)
