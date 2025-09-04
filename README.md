# Memealert

Memealert is a Next.js application for monitoring Solana tokens and creating threshold-based alerts. Users connect a Phantom or Solflare wallet, find tokens through DexScreener, configure alert conditions, and manage notification preferences from a browser dashboard.

[Live application](https://meme-alert.vercel.app)

## Features

- Phantom and Solflare wallet connections on Solana mainnet
- Solana token search and live market data from DexScreener
- Market-cap, 24-hour price-change, and volume thresholds
- Global and per-alert notification channel settings
- SMS phone verification through Twilio
- SMS and voice-call alert delivery
- Supabase-backed users, alerts, metrics, and notification settings
- Command-line token monitoring for a specific wallet

## Technology

- Next.js 14 with the App Router
- React 18 and TypeScript
- Tailwind CSS, Radix UI, and Framer Motion
- Solana Wallet Adapter and `@solana/web3.js`
- Supabase PostgreSQL
- DexScreener API
- Twilio Programmable Messaging and Voice

## Architecture

The browser application is responsible for wallet connection, token discovery, alert configuration, and dashboard updates. Supabase is accessed through the client in `lib/supabase.ts`, while Next.js route handlers provide server-side Twilio and alert-processing operations.

```text
Browser
├── Landing page and dashboard
├── Solana Wallet Adapter
├── DexScreener token search and market data
└── Supabase client
    ├── users
    ├── alerts
    ├── alert_metrics
    ├── notification_settings
    └── notification_history

Next.js route handlers
├── Phone verification
├── Test notifications
└── Alert evaluation
    ├── DexScreener
    ├── Supabase
    └── Twilio SMS and voice

Monitoring utilities
├── Wallet-specific terminal dashboard
└── Background alert polling service
```

### Application flow

1. The wallet provider connects to Solana mainnet and uses the public key to create or load a Supabase user.
2. The dashboard queries DexScreener for Solana pairs and selects the most liquid matching pair.
3. Alert definitions and channel preferences are written to Supabase.
4. The alert engine loads enabled alerts, refreshes token data, evaluates thresholds, and applies an in-memory 15-minute cooldown.
5. Enabled channels are passed to the notification service. Twilio sends SMS and voice calls; push delivery currently logs a payload only.

### Repository structure

```text
app/
  api/                    Next.js route handlers
  dashboard/              Alert management dashboard
  page.tsx                Public landing page
components/               Application and reusable UI components
contexts/WalletContext.tsx
                          Wallet state and user-data coordination
lib/
  database.types.ts       Supabase schema types
  supabase.ts             Database client and persistence helpers
services/
  alertEngine.ts          Threshold evaluation and alert processing
  notificationService.ts  Notification routing and message formatting
  twilioService.ts        Verification, SMS, and voice integration
scripts/                  Monitoring and maintenance utilities
styles/                   Global styles
public/                   Web application manifest
```

## Local development

### Prerequisites

- Node.js 18 or newer
- npm
- A Supabase project with the expected tables and row-level security policies
- A Twilio account and phone number for verification, SMS, and voice features
- Phantom or Solflare for wallet connection

### Installation

```bash
git clone https://github.com/aayusha59/memealert.git
cd memealert
npm install
```

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Alert processing

The dashboard refreshes displayed token data while it is open, but background notification delivery is a separate operation. The alert engine can be invoked through:

```text
POST /api/alerts/process
```

In production, call this endpoint from an authenticated scheduler after adding appropriate access controls. The endpoint is not protected in the current implementation.

The repository also includes `scripts/alert-monitor.js`, which polls Supabase and DexScreener and forwards triggered notifications to a Next.js server at `http://localhost:3000`.

To view live token data for the active alerts associated with one wallet:

```bash
npm run monitor -- <wallet-address>
```

The monitor reads the Supabase variables from its process environment.

## API routes

- `POST /api/send-verification` sends a six-digit SMS verification code.
- `POST /api/verify-code` verifies the code and updates the user's phone status.
- `GET /api/alerts/process` returns alert-engine health information.
- `POST /api/alerts/process` evaluates alerts or dispatches a supplied notification.
- `GET /api/alerts/user?userId=<id>` returns alerts for a user.
- `POST /api/notifications/send-test` sends test notifications through selected channels.

## Available commands

- `npm run dev` starts the development server.
- `npm run build` creates a production build.
- `npm run start` starts the production server.
- `npm run lint` runs the Next.js lint command.
- `npm run monitor -- <wallet-address>` starts the wallet-specific terminal monitor.
