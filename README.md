# Welder Certification Platform — Backend

ISO 9606-1:2012 기반 용접사 자격 인증서 발행 플랫폼의 백엔드.

## Requirements

- Node.js 20+
- PostgreSQL 14+

## Quick Start

```bash
# 1) install dependencies
npm install

# 2) prepare env
cp .env.example .env
# edit DATABASE_URL if needed

# 3) apply migrations + generate client
npm run db:migrate

# 4) load ISO 9606-1 reference data + rule tables
npm run db:seed

# 5) run dev server
npm run dev
# → http://localhost:3000/health
```

## Scripts

| script              | purpose                                            |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | hot-reload Express server (ts-node-dev)            |
| `npm run build`     | TypeScript build → `dist/`                         |
| `npm run start`     | run built app                                      |
| `npm run db:migrate`| Prisma migrate dev                                 |
| `npm run db:seed`   | Insert ref_* tables + ISO 9606-1 rule_tables       |
| `npm test`          | Jest                                               |

## Layout

```
prisma/
  schema.prisma        # single source of truth for DB
  seed.ts              # seed entrypoint
  seeds/               # reference + rule data
src/
  index.ts             # Express entrypoint
  app.ts               # Express app factory
  config/env.ts
  db/prisma.ts         # PrismaClient singleton
docs/
  01-database-schema.md
  02-approval-range-logic.md
```

Stage 1 provides only `GET /health`. Stage 2 will implement the approval-range calculation engine that reads from `rule_tables`.
