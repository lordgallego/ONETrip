# 1TRIP

**T**racking & **R**outing for **I**ntelligent **P**lanning.

*Every trip tracked. Every decision smarter.*

1TRIP is a vehicle dispatch and parcel ("Padala") logistics system for DOST Western Visayas. It turns the regional fleet from disconnected solo trips into a shared logistics network — every approved trip becomes a potential courier route, cutting fuel and emissions by eliminating dispatches that didn't have to happen.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- React Router
- Supabase (Auth + Postgres) — Google Sign-In
- TanStack Query, react-hook-form + zod, sonner

## Roles

- **Member** — submit travel and padala requests
- **Recommender** — endorses pending requests
- **Approver** — final approval / rejection (only after a recommendation)
- **Admin** — manages users, assigns vehicles, and can delete requests

## Approval flow

```
Pending → Recommended → Approved
              │
              └→ Rejected (drops off the timeline)
```

Approve is gated to status = Recommended. Pending requests cannot be approved directly.

## Development

```bash
npm install
npm run dev
```

Create `.env.local`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Run `supabase/schema.sql` in your Supabase SQL Editor (idempotent — safe to re-run).

## Build

```bash
npm run build
```
