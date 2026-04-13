# Firestore → Railway Postgres Migration Plan

## Overview

This document describes how to migrate WashPivot Hub from Firebase Firestore to a Railway-hosted Postgres database. Firebase Auth is **retained** as the identity provider — only the data layer changes.

---

## Deliverables Added

| File | Purpose |
|---|---|
| `db/schema.sql` | Full Postgres DDL — tables, enums, indexes, triggers |
| `db/migrate.js` | One-shot Node.js migration script (Firestore → Postgres) |
| `src/db.ts` | Server-side Postgres pool + typed query helpers |
| `docs/postgres-migration-plan.md` | This document |

---

## Step 1 — Provision the Railway Postgres Database

1. In the Railway dashboard, add a **Postgres** plugin to the `washpivot-hub` service.
2. Railway automatically injects `DATABASE_URL` into the service environment.
3. Run the schema against the new database:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

---

## Step 2 — Run the Migration Script

The script reads every Firestore collection and inserts the data into Postgres. It is idempotent (`ON CONFLICT DO NOTHING`) and can be re-run safely.

```bash
# Install the two extra dependencies the script needs
npm install pg firebase-admin

# Point at your service account key (or use Application Default Credentials)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export FIREBASE_PROJECT_ID=gen-lang-client-0122288239
export FIRESTORE_DATABASE_ID=ai-studio-cdcaebce-ce91-4986-975d-5e6567691dd4
export DATABASE_URL=<your Railway DATABASE_URL>

node db/migrate.js
```

The script migrates collections in dependency order:

1. `users` (no FK dependencies)
2. `products`
3. `projects` (FK → `users.uid`)
4. `reviews` (FK → `products.id`, `users.uid`)
5. `orders` (FK → `users.uid`)
6. `service_providers`
7. `solar_kits` (FK → `users.uid`)
8. `public_profiles` (FK → `users.uid`)

---

## Step 3 — Add `pg` to the Project

```bash
npm install pg
npm install --save-dev @types/pg
```

`src/db.ts` is already written and exports the pool and all typed helpers.

---

## Step 4 — Update Source Files

The table below lists every file that currently imports from `firebase/firestore` and the Postgres equivalent using `src/db.ts`.

### Files to Update

| File | Firestore operations | Postgres replacement |
|---|---|---|
| `src/context/AuthContext.tsx` | `getDoc`, `setDoc`, `updateDoc` on `users` | `getUserByUid`, `upsertUser` |
| `src/pages/AdminDashboard.tsx` | `getDocs` on all collections; `updateDoc`, `deleteDoc` | `query(…)` helpers + direct SQL |
| `src/pages/Marketplace.tsx` | `getDocs` on `products`, `service_providers` | `getProducts`, `getServiceProviders` |
| `src/pages/MicroFunding.tsx` | `getDocs`, `addDoc`, `updateDoc` on `projects` | `getProjects`, INSERT, UPDATE |
| `src/pages/ProductDetail.tsx` | `getDoc` on `products`; `onSnapshot` on `reviews`; `addDoc` on `reviews` | `getProductById`, `getReviewsByProduct`, INSERT |
| `src/pages/Profile.tsx` | `getDocs` on `orders`; `updateDoc`, `getDoc` on `users` / `public_profiles` | `getOrdersByUser`, `upsertUser`, `getPublicProfileByUid` |
| `src/pages/Checkout.tsx` | `addDoc` on `orders` | POST `/api/orders` → server inserts via `src/db.ts` |
| `src/pages/Recruitment.tsx` | `getDocs` on `public_profiles`; `deleteDoc` | `getApprovedExperts`, DELETE |
| `src/components/AddProductModal.tsx` | `addDoc` on `products` | POST `/api/products` |
| `src/components/EditProductModal.tsx` | `updateDoc` on `products` | PATCH `/api/products/:id` |
| `src/components/AddServiceModal.tsx` | `addDoc` on `service_providers` | POST `/api/service-providers` |
| `src/components/EditServiceModal.tsx` | `updateDoc` on `service_providers` | PATCH `/api/service-providers/:id` |
| `src/components/AddProjectModal.tsx` | `addDoc` on `projects` | POST `/api/projects` |
| `src/components/ExpertOnboardingModal.tsx` | `updateDoc` on `users`; `setDoc` on `public_profiles` | PATCH `/api/users/:uid`, POST `/api/public-profiles` |
| `src/components/SolarKitBuilder.tsx` | `getDocs` on `products`; `addDoc` on `solar_kits` | `getProducts`, POST `/api/solar-kits` |

> **Pattern:** All writes that currently go directly from the browser to Firestore should be moved to Express API routes in `server.ts` (or a new `routes/` file) that use `src/db.ts`. Reads that are safe to expose can also go through API routes, keeping `src/db.ts` server-side only.

---

## Example Query Translations

### getUser (AuthContext)

**Before (Firestore)**
```ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const docRef = doc(db, 'users', user.uid);
const docSnap = await getDoc(docRef);
const profile = docSnap.exists() ? docSnap.data() : null;
```

**After (Postgres)**
```ts
// In an Express route (server.ts / routes/users.ts)
import { getUserByUid } from './db';

app.get('/api/users/:uid', async (req, res) => {
  const profile = await getUserByUid(req.params.uid);
  if (!profile) return res.status(404).json({ error: 'Not found' });
  res.json(profile);
});

// In AuthContext — replace getDoc with a fetch call
const response = await fetch(`/api/users/${user.uid}`);
const profile = response.ok ? await response.json() : null;
```

---

### getProducts (Marketplace)

**Before (Firestore)**
```ts
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const q = query(collection(db, 'products'), where('category', '==', filter));
const snap = await getDocs(q);
const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
```

**After (Postgres)**
```ts
// Express route
import { getProducts } from './db';

app.get('/api/products', async (req, res) => {
  const { category, subCategory } = req.query as Record<string, string>;
  const products = await getProducts({ category, subCategory });
  res.json(products);
});

// React component
const response = await fetch(`/api/products?category=${filter}`);
const products = await response.json();
```

---

### createOrder (Checkout)

**Before (Firestore)**
```ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const orderRef = await addDoc(collection(db, 'orders'), {
  userId: user?.uid,
  userEmail: user?.email,
  items: cart,
  totalAmount: cartTotal,
  status: 'pending',
  paymentMethod,
  shippingInfo: formData,
  createdAt: serverTimestamp(),
});
const orderId = orderRef.id;
```

**After (Postgres)**
```ts
// Express route (server.ts)
import { query } from './db';

app.post('/api/orders', async (req, res) => {
  const { userId, userEmail, items, totalAmount, paymentMethod, shippingInfo } = req.body;
  const [order] = await query(
    `INSERT INTO orders ("userId", "userEmail", items, "totalAmount", status, "paymentMethod", "shippingInfo")
     VALUES ($1, $2, $3, $4, 'pending', $5, $6)
     RETURNING id`,
    [userId, userEmail, JSON.stringify(items), totalAmount, paymentMethod, JSON.stringify(shippingInfo)]
  );
  res.json({ id: order.id });
});

// React component (Checkout.tsx)
const response = await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: user?.uid, userEmail: user?.email, items: cart,
                         totalAmount: cartTotal, paymentMethod, shippingInfo: formData }),
});
const { id: orderId } = await response.json();
```

---

### getReviews with real-time updates (ProductDetail)

Firestore's `onSnapshot` has no direct Postgres equivalent. Replace it with:

1. **Polling** — `setInterval(() => fetchReviews(), 30_000)` (simplest)
2. **Server-Sent Events** — stream new reviews from an Express SSE endpoint
3. **WebSockets** — use `ws` or `socket.io` for true real-time

For most use cases, polling every 30 seconds is sufficient.

---

### updateUserRole (AdminDashboard)

**Before (Firestore)**
```ts
await updateDoc(doc(db, 'users', userId), { role: newRole });
```

**After (Postgres)**
```ts
// Express route
app.patch('/api/admin/users/:uid/role', requireAdmin, async (req, res) => {
  const { role } = req.body;
  await query('UPDATE users SET role = $1 WHERE uid = $2', [role, req.params.uid]);
  res.json({ success: true });
});
```

---

### upsertPublicProfile (ExpertOnboardingModal)

**Before (Firestore)**
```ts
await setDoc(doc(db, 'public_profiles', user.uid), { uid: user.uid, ...expertData });
```

**After (Postgres)**
```ts
// Express route
app.post('/api/public-profiles', requireAuth, async (req, res) => {
  const { uid, displayName, expertise, academics, bio, expertJoinedAt, ...rest } = req.body;
  await query(
    `INSERT INTO public_profiles (uid, "displayName", expertise, academics, bio, "expertJoinedAt", …)
     VALUES ($1,$2,$3,$4,$5,$6,…)
     ON CONFLICT (uid) DO UPDATE SET expertise = EXCLUDED.expertise, …`,
    [uid, displayName, expertise, academics, bio, expertJoinedAt, …]
  );
  res.json({ success: true });
});
```

---

## Firestore Rules → Postgres Security

Firestore security rules (`firestore.rules`) enforced access control at the database level. With Postgres, access control moves to the Express API layer:

- Add an `requireAuth` middleware that verifies the Firebase ID token via `firebase-admin`.
- Add a `requireAdmin` middleware that additionally checks `profile.role === 'admin'`.
- Never expose `src/db.ts` to the browser — it is server-side only.

---

## Environment Variables Required

| Variable | Where to set | Description |
|---|---|---|
| `DATABASE_URL` | Railway service | Auto-injected by Railway Postgres plugin |
| `GOOGLE_APPLICATION_CREDENTIALS` | Migration only | Path to Firebase service-account JSON |
| `FIREBASE_PROJECT_ID` | Migration only | Firebase project ID |
| `FIRESTORE_DATABASE_ID` | Migration only | Named Firestore database ID |

---

## Rollback Plan

1. The migration script does not delete any Firestore data.
2. Keep the existing `src/firebase.ts` and Firestore imports in place until all API routes are tested and verified in production.
3. Use a feature flag (e.g. `USE_POSTGRES=true` env var) to switch data sources per-route during the transition period.
4. Once all routes are verified, remove Firestore imports and the `firebase` client-side SDK dependency.
