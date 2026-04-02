# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Dev Wallet Connector — a full-stack Web3 app for connecting wallets (Tezos/Ethereum testnets) and interacting with simulated test tokens.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI
- **Routing**: Wouter
- **State**: TanStack React Query + React Context
- **Theme**: Dark mode first (next-themes)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (all routes)
│   └── dev-wallet/         # React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## App Features

- **Wallet Connection**: MetaMask (Ethereum) and Temple Wallet (Tezos ghostnet) — no seed phrases or private keys ever
- **Simulated Tokens**: USDtz-SIM (Tezos FA2) and USDT-SIM (EVM mock)
- **Faucet**: Daily claim limits, enforced per-wallet per-network
- **Token Transfer**: Send simulated tokens between registered wallets
- **Transaction History**: Full ledger of faucet claims, incoming/outgoing transfers
- **Admin Panel**: Stats dashboard, wallet freeze/unfreeze, faucet limit configuration
- **Dark Mode**: Default dark theme with electric blue + emerald green accents

## Database Schema

- `wallets` — registered wallets with simulated token balances + freeze status
- `transactions` — full transaction ledger (faucet, transfer_in, transfer_out)
- `faucet_claims` — per-wallet daily claim tracking
- `faucet_config` — admin-controlled daily limits per token type

## API Routes (all at /api prefix)

- `GET /api/healthz` — health check
- `POST /api/faucet/claim` — claim simulated tokens
- `GET /api/faucet/status` — check daily limit status for a wallet
- `POST /api/transfer` — transfer tokens between wallets
- `GET /api/transactions` — transaction history
- `GET /api/transactions/summary` — balance/summary stats for a wallet
- `POST /api/wallets/register` — register/update a connected wallet
- `GET /api/wallets/:address` — get wallet info + balances
- `GET /api/admin/stats` — admin stats
- `GET /api/admin/wallets` — all wallets (admin)
- `POST /api/admin/wallets/:address/freeze` — freeze/unfreeze wallet
- `GET /api/admin/faucet-limits` — current limits
- `PUT /api/admin/faucet-limits` — update limits

## Pages

- `/` — Home / wallet connection
- `/dashboard` — Connected wallet dashboard
- `/faucet` — Claim test tokens
- `/transfer` — Send tokens
- `/transactions` — Transaction history
- `/admin` — Admin panel

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. Always typecheck from the root:
- `pnpm run typecheck` — full check across all packages

## Codegen

After OpenAPI spec changes:
```bash
pnpm --filter @workspace/api-spec run codegen
```

## Database

Run migrations in dev:
```bash
pnpm --filter @workspace/db run push
```
