# LexiGen

AI-powered bilingual flashcard application with spaced repetition, community sharing, and analytics.

## Features

- **Bilingual Decks** — Create flashcard decks with any two languages (words and sentences)
- **Spaced Repetition (SM-2)** — Optimally timed reviews for maximum retention
- **Swipe Study Mode** — Tinder-style card swiping + 1–4 rating buttons
- **AI Sentence Generation** — Select words, generate contextual sentences via Groq API
- **Community** — Share decks publicly, browse/rate/comment/clone other users' decks
- **Dashboard & Analytics** — Daily/monthly stats, streak tracking, interactive charts
- **Import** — Import cards from tab-separated files (.txt, .tsv, .csv)
- **Dark/Light Mode** — Glassmorphism pink theme with full theme toggle
- **Auth** — Secure email/password registration with NextAuth.js

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Docker) + Prisma ORM |
| Auth | NextAuth.js (Credentials) |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| Animations | Framer Motion |
| Charts | Recharts |
| AI | Groq SDK (Llama 3.1) |
| Validation | Zod |
| Unit Tests | Vitest |
| E2E Tests | Playwright |

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- (Optional) Groq API key for AI features

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your NEXTAUTH_SECRET and optionally GROQ_API_KEY

# 3. Start PostgreSQL
docker compose up -d

# 4. Push database schema
npm run db:push

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Secret for session encryption |
| `NEXTAUTH_URL` | App URL (default: `http://localhost:3000`) |
| `GROQ_API_KEY` | (Optional) Groq API key for AI sentence generation |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run Playwright with UI |

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes (decks, cards, study, AI, community, etc.)
│   ├── community/        # Community decks page
│   ├── dashboard/        # Analytics dashboard page
│   ├── decks/            # Decks list & detail pages
│   │   └── [deckId]/
│   │       └── study/    # Study mode with swipe
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── settings/         # Profile settings page
│   ├── globals.css       # Tailwind + glassmorphism theme
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── navbar.tsx         # Navigation bar
│   └── providers.tsx      # NextAuth + Theme providers
├── hooks/
│   └── use-toast.ts      # Toast notification hook
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client singleton
│   ├── srs.ts            # SM-2 spaced repetition algorithm
│   ├── utils.ts          # Utility functions
│   └── validations.ts    # Zod validation schemas
├── middleware.ts          # Route protection middleware
├── types/
│   └── next-auth.d.ts    # NextAuth type augmentation
└── __tests__/            # Vitest unit tests
e2e/                       # Playwright E2E tests
prisma/
└── schema.prisma          # Database schema
```
