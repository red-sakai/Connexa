# Connexa

Connexa is a community event platform for creating, publishing, and managing events, complete with global feeds, ticketing/RSVPs, owner/admin controls, and media-rich posts (banner images). It focuses on a pragmatic, secure MVP that can evolve into production.

## Technologies

- Next.js (App Router), React 18, TypeScript
- Tailwind CSS for UI
- Supabase (Postgres + Storage + RLS)
- JWT auth (jose), server-side auth guards
- Icons: react-icons
- Deployment-ready API routes under src/app/api

## Architecture Overview

- UI (Next.js App Router): pages and client components under src/app
  - /main is the authenticated feed
  - /eventcreation is the event composer
  - /tickets/[id] is the ticket availing/RSVP page
  - /events/[id]/admin is the owner admin panel
- API (Next.js Route Handlers) under src/app/api
  - Auth: /api/auth/login, /api/auth/register (RPC-based)
  - Events: /api/events, /api/events/[id]
  - Uploads: /api/uploads/events/[id] for banner image uploads to Supabase Storage
  - Attendees: /api/events/[id]/attendees (RSVP create/list)
  - Delegated Admins: /api/events/[id]/admins (owner can grant access by email)
- Data (Supabase/Postgres)
  - public.events: event records with owner_id, host_name, location, event_at, image_url
  - public.attendees: RSVPs per event
  - public.event_admins: delegated admin emails per event
  - Storage bucket event-images for banners
- Security
  - JWT issued at login, verified in API routes
  - RLS on tables; server uses service-role key for storage and admin operations
  - Owner/admin checks for sensitive endpoints

## Getting Started

1) Prerequisites
- Node.js 18+
- pnpm or npm
- A Supabase project

2) Clone and install
``` bash
- git clone <repo>
- cd connexa
- pnpm install
  - or npm install
```

3) Environment variables (.env)
```
- SUPABASE_URL=your-supabase-url
- SUPABASE_API_KEY=your-supabase-anon-key
- SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
- JWT_SECRET=batang90slangnakakaalam
```

Notes:
- SUPABASE_SERVICE_ROLE_KEY must never be used in client code; the upload/admin APIs use it on the server.
- After editing .env, restart the dev server.

4) Run the app
``` bash
- pnpm dev
  - or npm run dev
- Open http://localhost:3000
- Sign up / sign in, then go to /main
```

## Usage Highlights

- Create events on /eventcreation. Host/Organizer and Location are optional; add an optional banner image.
- Global feed at /main shows all events for all users. “going” reflects real attendee counts.
- Non-owners click “Get tickets” to RSVP; owners don’t see this button.
- Owners see “Admin Panel” to view attendees and manage delegated admins by email.
- Owners can edit their events inline from the feed.

## API Endpoints (overview)

Auth
- POST /api/auth/register
- POST /api/auth/login

Events
- GET /api/events (global listing)
- POST /api/events (create; Bearer required)
- GET /api/events/[id] (returns attendees_count)
- PUT /api/events/[id] (owner/admin)
- DELETE /api/events/[id] (owner/admin)

Uploads
- POST /api/uploads/events/[id] (owner/admin; uploads banner to Storage and returns public URL)

Attendees (RSVP)
- GET /api/events/[id]/attendees (owner, delegated admin, or site admin)
- POST /api/events/[id]/attendees (public RSVP)

Delegated Admins
- GET /api/events/[id]/admins?me=1 (auth check if current user is allowed for that event)
- GET /api/events/[id]/admins (list; owner/admin only)
- POST /api/events/[id]/admins { email } (owner/admin only)
- DELETE /api/events/[id]/admins?email=... (owner/admin only)

Authorization
- Include Authorization: Bearer <token> for protected endpoints.

## API Documentation (Google Docs)

- API Docs: https://docs.google.com/document/d/1Uu1q-nudvIg4AILp83KUZfF01CQIxcz3fvq_C4pNO1k/edit?usp=sharing

## Development Notes

- JWT stored in localStorage on the client; APIs verify server-side.
- Storage uploads are performed in a server route using service-role to avoid RLS issues.
- Attendee counts are resolved per event in the feed via GET /api/events/[id] to avoid heavy joins in the list endpoint.
- Feed pagination loads 4 events at a time.

## Troubleshooting

- Image upload “row-level security” error
  - Ensure SUPABASE_SERVICE_ROLE_KEY is set server-side and you restarted dev
  - Verify bucket event-images exists
- Banner not visible
  - Ensure events.image_url is set after upload; create a new event to test
  - Feed fetch uses no-store + cache busting (?ts=), refresh /main
- Unauthorized on owner APIs
  - Verify the JWT is present in localStorage and passed as Bearer
  - Check that you are the event owner (or admin/delegated admin)

## Scripts

- pnpm dev / npm run dev
- pnpm build / npm run build
- pnpm start / npm start
