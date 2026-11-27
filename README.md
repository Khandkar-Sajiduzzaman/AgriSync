# AgriSync

**A web marketplace that connects farmers directly with buyers, cutting out middlemen and making every product traceable from farm to table.**

Farmers list and manage their produce, buyers browse, negotiate, order and track deliveries, and delivery partners fulfil orders across cities. Admins moderate products, reviews and promotions, and watch the platform through dashboards and sales reports.

> CSE470 project. Built with React + Vite on the frontend, Express + Prisma on the backend, and PostgreSQL (Supabase) for data and image storage.

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Database](#database)
- [API overview](#api-overview)
- [Roles](#roles)
- [Scripts](#scripts)
- [Deployment notes](#deployment-notes)
- [Known limitations](#known-limitations)
- [Contributing](#contributing)

---

## Features

### For farmers
- Create, edit and remove product listings with images, categories and nutrition details.
- Manage stock through inventory change requests that admins approve, with a full stock log.
- Receive and respond to price offers and negotiations (accept, reject or counter).
- Assign delivery partners to orders and move them through the fulfilment flow.
- Track sales through a sales report.

### For buyers
- Browse, search and filter products; compare products side by side.
- Save products to a wishlist and follow farmers.
- Add to cart, check out, and pay through bKash.
- Check whether a farmer delivers to your location before ordering.
- Make offers and counter-offers on products.
- Track orders through a timeline, with live delivery tracking.
- Leave verified reviews on products.
- Message farmers and delivery partners in-app.

### For delivery partners
- Set availability, and accept **instant** or **normal** (batched, same-city) deliveries.
- Share location while out on a delivery.
- See requests and active deliveries on a dashboard with a live map.

### For admins
- Approve or reject products, inventory changes and promotions.
- Moderate reviews, including flagged-review detection.
- Manage users, delivery zones and categories.
- View platform-wide stats and generate sales reports.
- Audit trail of admin actions.

### Platform
- Role-based access control (buyer, farmer, delivery man, admin).
- Delivery zones with coverage checks and per-city delivery capacity.
- Market price tracking and product views.
- Spam and abuse checks on messaging and reviews.
- In-app notifications.

---

## Architecture

```
┌──────────────────────┐        HTTPS / JSON         ┌────────────────────────────┐
│  frontend-app        │ ──────────────────────────▶ │  backend (Express)         │
│  React 19 + Vite     │  Bearer JWT                 │  routes → controllers      │
│  Tailwind + shadcn   │ ◀────────────────────────── │  Prisma ORM                │
└──────────────────────┘                             └──────────┬─────────────────┘
                                                                │
                                   ┌────────────────────────────┴───────────────┐
                                   │  Supabase                                   │
                                   │  • PostgreSQL (data)                        │
                                   │  • Storage (product images)                 │
                                   └─────────────────────────────────────────────┘
                                   bKash (payments) ◀── backend payment controller
```

- The **frontend** is a single-page app. It talks to the backend only through `frontend-app/src/api/*.js`.
- The **backend** is a stateless Express API. Auth is a JWT in the `Authorization` header, with a short in-memory user cache.
- **Prisma** owns the schema and migrations in `backend/prisma/`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS, shadcn/ui, Leaflet (maps), Sonner (toasts) |
| Backend | Node.js, Express, Prisma ORM, JSON Web Tokens, bcryptjs |
| Database | PostgreSQL via Supabase |
| File storage | Supabase Storage (product images) |
| Payments | bKash tokenized checkout |

---

## Project structure

```
AgriSync/
├── backend/
│   ├── server.js              # Express app, CORS, route mounting, error handler
│   ├── config/                # Prisma client, Supabase storage client
│   ├── controllers/           # Request handlers, one file per domain
│   ├── middleware/            # JWT auth, image upload
│   ├── routes/                # Route definitions, one file per domain
│   ├── prisma/
│   │   ├── schema.prisma      # Data model
│   │   ├── migrations/        # SQL migrations
│   │   └── seed.js            # Demo data
│   └── scripts/               # Maintenance scripts (e.g. resetRatings.js)
└── frontend-app/
    ├── src/
    │   ├── api/               # One client module per backend domain
    │   ├── components/        # Reusable UI (product, delivery, user, ui/)
    │   ├── context/           # Cart and comparison state
    │   ├── layouts/           # Main layout with navbar
    │   ├── lib/               # Utilities
    │   └── pages/             # Route-level pages, one per screen
    ├── index.html
    └── vite.config.js
```

---

## Getting started

### Prerequisites

- **Node.js** (a current LTS release) and npm
- A **Supabase** project (for PostgreSQL and file storage)
- A **bKash** merchant sandbox account, if you want to test payments

### 1. Clone

```bash
git clone https://github.com/Khandkar-Sajiduzzaman/AgriSync.git
cd AgriSync
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # then fill in the values (see Configuration)
npx prisma generate
npx prisma migrate deploy   # apply migrations to your database
npm run db:seed             # optional: demo users, products and orders
npm run dev                 # starts on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend-app
npm install
```

Create `frontend-app/.env.local` with the backend URL:

```bash
VITE_API_URL=http://localhost:5000
```

Then start the dev server:

```bash
npm run dev                 # starts on http://localhost:5173
```

Open <http://localhost:5173>. Demo accounts are created by `backend/prisma/seed.js`.

---

## Configuration

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API port. Defaults to `5000`. |
| `NODE_ENV` | No | Set to `development` to include stack traces in error responses. Use `production` when deployed. |
| `DATABASE_URL` | Yes | Supabase pooled connection string (used at runtime). |
| `DIRECT_URL` | Yes | Supabase direct connection string (used for migrations). |
| `JWT_SECRET` | Yes | Secret for signing tokens. Use at least 64 random characters. |
| `FRONTEND_URL` | Yes | Allowed CORS origin, e.g. `http://localhost:5173`. |
| `BKASH_BASE_URL`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD` | For payments | bKash sandbox or production credentials. |
| `SUPABASE_PROJECT_REF`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET_NAME` | For uploads | Used by `backend/config/storage.js` for product images. |

### Frontend (`frontend-app/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Base URL of the backend, without a trailing slash. |

> **Never commit `.env` files.** `.env.example` contains placeholders only.

---

## Database

The schema lives in `backend/prisma/schema.prisma`. Main groups of models:

| Area | Models |
|---|---|
| Users | `User`, `FarmerProfile`, `BuyerProfile`, `DeliveryManProfile` |
| Catalogue | `Product`, `Category`, `ProductVote`, `ProductView`, `MarketPrice` |
| Shopping | `CartItem`, `Wishlist`, `Follow`, `ProductComparison`, `ComparisonItem` |
| Orders | `Order`, `OrderItem`, `OrderStatusHistory`, `DeliveryTracking` |
| Negotiation | `Negotiation`, `NegotiationHistory` |
| Delivery | `DeliveryZone`, `DeliveryRequest` |
| Trust and moderation | `Review`, `AdminActionLog` |
| Messaging | `Message`, `Notification` |
| Inventory and promotions | `InventoryChangeRequest`, `InventoryLog`, `Promotion`, `ProductPromotion` |
| Reporting | `SalesReport` |

Common commands:

```bash
npm run db:generate     # regenerate the Prisma client
npm run db:migrate      # create and apply a new migration (development)
npm run db:push         # sync schema without a migration (prototyping only)
npm run db:studio       # browse data in Prisma Studio
npm run db:reset        # wipe the database and re-seed (destructive)
```

---

## API overview

All routes are prefixed with `/api`. Protected routes expect `Authorization: Bearer <token>`.

| Prefix | Purpose |
|---|---|
| `/api/users` | Register, login, profile |
| `/api/products` | Catalogue, product CRUD, approval, voting |
| `/api/cart` | Cart items and quantities |
| `/api/orders` | Checkout, order status, tracking |
| `/api/payment` | bKash payment initiation and callback |
| `/api/offers` | Price offers on products |
| `/api/negotiations` | Counter-offer negotiations |
| `/api/delivery` | Delivery requests, availability, batches |
| `/api/delivery-zones` | Zone management and coverage checks |
| `/api/inventory` | Stock change requests and logs |
| `/api/reviews` | Reviews, moderation, review stats |
| `/api/messages` | In-app messaging |
| `/api/comparisons` | Product comparison sets |
| `/api/admin` | Admin dashboard, user management, reports |

Responses are JSON. Errors use `{ "message": "..." }`.

---

## Roles

| Role | Can do |
|---|---|
| **buyer** | Browse, cart, checkout, offers, negotiations, reviews, messages, track orders |
| **farmer** | Manage own products and stock, handle offers and orders, assign delivery |
| **delivery man** | Set availability, accept and complete deliveries, share location |
| **admin** | Approve products, inventory and promotions, moderate reviews, manage users, reports |

Access is enforced on the backend by `middleware/authMiddleware.js`. The frontend route guards only control what is shown.

---

## Scripts

**Backend (`backend/`)**

| Command | What it does |
|---|---|
| `npm start` | Run the API in production mode |
| `npm run dev` | Run the API with nodemon |
| `npm run db:seed` | Load demo data |

**Frontend (`frontend-app/`)**

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

---

## Deployment notes

- Set `NODE_ENV=production` on the backend. This hides stack traces and internal error messages.
- Set `FRONTEND_URL` to your deployed frontend origin. CORS only allows origins listed there.
- Set `VITE_API_URL` to the deployed backend URL **before** running `npm run build`. Vite inlines it at build time.
- Run `npx prisma migrate deploy` against the production database, not `migrate dev`.
- Rotate `JWT_SECRET` and every bKash credential before going live.

---

## Known limitations

These are open issues from the latest code review. They are tracked in the repository history and are not yet fixed:

- Stock is updated with absolute values in some order and inventory paths, so concurrent requests can lose updates.
- Some product image URLs point to `localhost:5000` in the frontend, so images break in deployed builds.
- Delivery-partner and admin account suspension is not fully enforced on every request.
- Order and product lists lack pagination in some views.
- Automated tests are minimal. `backend/test-api.js` and `backend/test-all.js` are manual scripts.

---

## Contributing

1. Create a branch from `main`.
2. Keep changes focused, and match the style of the surrounding code.
3. Run `npm run build` in `frontend-app/` and `node --check` on changed backend files before opening a pull request.
4. Describe what changed and why in the pull request.

---

## Team

Built by the AgriSync team for CSE470.

- Khandkar Sajiduzzaman ([@Khandkar-Sajiduzzaman](https://github.com/Khandkar-Sajiduzzaman))
- MahirSinthia007 ([@MahirSinthia007](https://github.com/MahirSinthia007))

---

## License

No license has been specified yet. Until one is added, all rights are reserved by the authors.
