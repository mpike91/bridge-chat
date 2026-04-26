# BridgeChat

A messaging app that bridges app users and SMS contacts in the same group chat.

The problem: you want a group chat with five family members, but two of them won't install your app. BridgeChat gives the group a phone number — app users send messages through the web UI, and SMS-only members receive and reply via plain texts. Everyone ends up in the same conversation.

## How it works

```
App User ──┐
App User ──┼─► Group ─► Twilio number ─► SMS Member
           │      ▲                       (replies as text)
           └──────┘
       (realtime via Supabase)
```

- Each group gets its own Twilio phone number.
- App users send a message → it's saved to Postgres, fanned out via Supabase Realtime to other app users, and pushed as SMS to every SMS-only member of the group.
- An SMS member replies → Twilio webhook lands in a Supabase Edge Function → message is matched back to the right group → saved → pushed to all app users in real time.
- Messages track their origin (app vs. SMS), so the UI can render them differently and surface SMS delivery/error states.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS |
| Backend | Supabase (Postgres + Auth + Realtime) |
| SMS gateway | Twilio (number-per-group), via Supabase Edge Functions |
| Webhooks | Supabase Edge Functions (`twilio-webhook`, `twilio-status`, `send-sms`) |

## Architecture

The repo follows a Clean Architecture / DDD layout — dependencies point inward, domain logic doesn't know about React or Supabase:

```
src/
  domain/         # types, validators — pure, framework-free
  application/    # actions, hooks — use cases / orchestration
  presentation/   # components, providers — React UI
  data/           # mappers, repositories, supabase clients
  app/            # Next.js routes (auth, app, api)
supabase/
  functions/      # send-sms, twilio-webhook, twilio-status
  migrations/     # 001_initial_schema
docs/
  architecture.html, architecture-simple.html
```

`docs/architecture-simple.html` is a self-contained explainer with Mermaid diagrams — open it locally for a tour of the message-flow logic.

## Running locally

```bash
npm install
cp .env.example .env.local        # fill in Supabase + Twilio creds
npm run dev
```

You'll need:
- A Supabase project (apply migrations from `supabase/migrations/`, deploy edge functions from `supabase/functions/`).
- A Twilio account with at least one purchased number, and the Twilio webhook configured to point at your `twilio-webhook` edge function URL.
- For local SMS testing, expose your edge function via ngrok or similar so Twilio can reach it.

```bash
npm run type-check
npm run lint
npm run supabase:gen-types        # regenerate Supabase types
```

## Status

Working prototype. Single-Twilio-number-per-group flow is implemented end-to-end (outgoing app→SMS, incoming SMS→app, delivery status). The repo is a personal exploration of the architecture pattern as much as the product idea.
