# Wildcat Fantasy Football

Wildcat is a bite-sized fantasy football mobile app where you draft a handful of stars, lock lineups fast, make simple over/under bets on your picks, and watch head-to-head results swing in real time.

## Stack
- React Native & Expo
- Express Middleware
- MongoDB NoSQL Backend

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

## Seed data and demo users
- From `server/`, run `npm run seed` after installing deps to load demo data.
- Logins: will be provided in submission

## Install and run
1) Install client deps
```
npm install
```
2) Install server deps, seed data, and start server
```
cd server
npm install
npm run seed
npm run dev
```
4) In a new terminal, Start Expo client
```
cd ..
npm start
```
Then open iOS/Android simulator or scan the QR code.

## Build/Deploy notes
- Local dev uses the Express server.
- No third-party API keys are required for the current demo build.
- If deployment link does not work, try using locally with environment variables provided (switch out MONGO_URI for default URI `mongodb://127.0.0.1:27017/wildcat_dev`).

## Key commands
- `npm start` (client via Expo)
- `npm run dev` (server, from `server/`)
- `npm run seed` (server, from `server/`)
