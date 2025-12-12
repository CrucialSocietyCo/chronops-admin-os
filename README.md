# ChronOps-Nuxt

ChronOps is a realtime web application utilizing Nuxt to power a single retro-style chatroom with a focused Moderation + Analytics admin dashboard.

![ChronOps Screenshot](docs/screenshot.png)

## Quickstart

### Using npm

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Run development server
npm run dev
```

### Using pnpm

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env

# Run development server
pnpm dev
```

## Environment Variables

| Variable | Description | Required |
|:---|:---|:---:|
| `SUPABASE_URL` | API URL for your Supabase project | Yes |
| `SUPABASE_KEY` | Anon public key for client-side usage | Yes |
| `SUPABASE_SERVICE_KEY` | Service role key (SERVER ONLY) | No* |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API Key for AI Rewrite features | No |

*> Note: `SUPABASE_SERVICE_KEY` is required for advanced moderation features that bypass Row Level Security. Never expose this key to the client.*

### `.env.example`

```ini
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-role-key"
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-key"
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Locally preview the production build

## What ChronOps Does

- **Realtime Messaging**: Instant message delivery via Supabase Realtime.
- **Typing Indicators**: Visual feedback when other users are typing.
- **Message Reactions**: Interactive emoji reactions on messages.
- **Join/Leave System**: Banners with queue management and cooldowns.
- **Rate Limiting**: Automated protection against spam and flood attacks.
- **AI Persona Rewrite**: Optional moderation tool that rewrites blocked words into "Corporate" or "Polite" speak (toggleable).

### Intentionally Out of Scope (for now)
- Multiple chatrooms or channels.
- Private direct messaging (DM).
- Persistent user accounts/profiles (beyond session).
- File/Image uploads.

## Moderation Dashboard

All administrative tools are centralized under the **Moderation** section. This is not a generic CMS but a specialized control center for the live event key.

- **Controls**: Toggle chat, enable/disable AI rewrite, adjust rate limits.
- **Logs**: View rejected or flagged messages.
- **Analytics**: Realtime visibility into user activity and engagement.

## Analytics & Telemetry

ChronOps treats observability as a core feature. Events are tracked to provide a realtime pulse of the room.

**Tracked Events:**
- `user_joined`
- `message_sent`
- `message_blocked`
- `reaction_added`
- `subliminal_message_triggered`
- `typing_started`
- `user_rate_limited`
- `user_muted`
- `ai_persona_rewrite_triggered`

*Privacy Note: Analytics are used solely for room health and moderation monitoring. No personal tracking or cross-site fingerprinting is employed.*

## Architecture Snapshot

The client connects directly to Supabase for realtime data. When a user sends a message, it is written to the Postgres database. This triggers a Supabase Realtime broadcast, which updates the UI for all connected clients instantly. Moderation logic sits as an interceptor (or via Edge Functions) to validate content before it is distributed.

## Project Structure

```
chronops-nuxt/
├── app/
│   ├── components/      # Vue components (Chat, Admin, UI)
│   ├── pages/           # Nuxt file-based routing
│   ├── assets/          # SCSS and static assets
│   └── layouts/         # App layouts
├── server/
│   ├── api/             # API endpoints (Messages, Admin)
│   └── utils/           # Shared server-side logic (Moderation, AI)
├── supabase/
│   └── migrations/      # SQL migrations
├── public/              # Static public files
└── nuxt.config.ts       # Main configuration
```

## Package Manager Policy

This project supports **npm** OR **pnpm**.

- Do **not** commit both `package-lock.json` and `pnpm-lock.yaml`.
- Ensure you are using the lockfile consistent with the current repository state.

## Roadmap

1.  **Strict Mode**: Enhanced rate limiting for "Crowd Surge" events.
2.  **Dashboard Polish**: Improving the data visualization in the Admin UI.
3.  **Resilience**: Better handling of connection drops and reconnections.
4.  **Admin Auth**: Moving from basic checks to robust role-based access.
5.  **Export**: Ability to export chat logs for archival.
6.  **Theming**: More retro themes (Windows 98, Cyberpunk).

## Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

Please open an Issue for any major feature requests or bug reports to discuss them first.

## License

MIT (See `LICENSE` file)
