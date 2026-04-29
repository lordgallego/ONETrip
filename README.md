# One Trip

**One System for Efficient Mobility — Every trip tracked. Every decision smarter.**

One Trip is a vehicle dispatch and parcel logistics management system for DOST Western Visayas.

It allows members to submit vehicle/travel and parcel ("Padala") requests, recommenders and approvers to act on them, and everyone to view a unified multi-vehicle timeline so trips never collide.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- React Router
- Supabase (Auth + Postgres) — Google Sign-In
- TanStack Query, react-hook-form + zod, sonner

## Roles

- **Member** — submit travel and padala requests
- **Recommender** — endorses pending requests
- **Approver** — final approval / rejection
- **Admin** — manages users and assigns roles

## Development

```bash
npm install
npm run dev
```

Create `.env.local` with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Build

```bash
npm run build
```
