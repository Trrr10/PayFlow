# PAYFLOW — Distributed Payment Processing System

[![Stack](https://img.shields.io/badge/Node.js-Express-green.svg)](https://nodejs.org)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-emerald.svg)](https://www.mongodb.com/atlas)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20Tailwind-blue.svg)](https://vitejs.dev)

A fault-tolerant distributed payment processing application built with **Node.js, Express, MongoDB (as database & persistent queue storage), standalone Payment Worker process, and React**.

Designed for demonstration of producer-consumer queue pattern, atomic database transactions, idempotency key validation, exponential backoff retries, stale-job recovery, and explainable payment execution timeline (**PayFlow Trace**).

---

## 🏛️ System Architecture

```
React Frontend (Vite + Tailwind CSS + Socket.IO Client)
       |
       v
Express API Server (Producer, Port 5000)
       |
       | Validates input & idempotency key
       | Inserts Payment (QUEUED) & PaymentJob (QUEUED) -> Returns HTTP 202 Accepted
       v
MongoDB Atlas Database (`payflow`)
       |
       | `payment_jobs` collection (Persistent Queue)
       v
Standalone Payment Worker Process (Consumer, `npm run worker`)
       |
       | Claims job atomically with `findOneAndUpdate`
       | Executes MongoDB session & transaction for wallet debit & credit
       v
MongoDB Wallets + Payments + Transactions + Audit Logs
       |
       | Socket.IO & Polling Real-Time Updates
       v
PayFlow Trace Timeline & User Dashboard
```

---

## 🚀 Quick Setup & Running Instructions

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas Connection String (configured in `server/.env`)

### 2. Environment Setup
Create `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/payflow?retryWrites=true&w=majority
JWT_SECRET=payflow_secure_jwt_secret_key_2026_demo
CLIENT_URL=http://localhost:5173
WORKER_POLL_INTERVAL=1000
JOB_LOCK_TIMEOUT=30000
MAX_JOB_ATTEMPTS=3
SIMULATE_WORKER_FAILURE=false
```

### 3. Install Dependencies
```bash
npm run install:all
```

### 4. Seed Demo Data
```bash
npm run seed
```
Creates demo accounts:
- **Admin**: `admin@payflow.com` / `Admin@123`
- **Alice**: `alice@payflow.com` / `User@123` *(Initial Balance: $1,000 via logged admin adjustment)*
- **Bob**: `bob@payflow.com` / `User@123` *(Initial Balance: $0)*

### 5. Running the Application
In separate terminal windows:
```bash
# Terminal 1: Start API Server (Port 5000)
npm run server

# Terminal 2: Start Standalone Payment Worker Process
npm run worker

# Terminal 3: Start React Client (Port 5173)
npm run client
```

Or run all concurrently:
```bash
npm run dev
```

---

## 🔑 Key Distributed System Features

### 1. Persistent MongoDB Producer-Consumer Queue
- **Producer**: Express API receives `POST /api/payments`, validates input, inserts `PaymentJob` record with status `QUEUED`, and returns `HTTP 202 Accepted` immediately.
- **Consumer**: Separate Node.js process worker queries MongoDB atomically using `findOneAndUpdate`:
  ```js
  PaymentJob.findOneAndUpdate(
    { status: 'QUEUED', availableAt: { $lte: new Date() } },
    { $set: { status: 'PROCESSING', lockedAt: new Date(), lockedBy: workerId }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  );
  ```

### 2. Mandatory Atomic MongoDB Transactions
- Wallet debit ($A$), wallet credit ($B$), transaction records (`DEBIT` & `CREDIT`), and Payment status (`SUCCESS`) execute inside a single MongoDB session transaction.
- Prevents partial wallet updates or duplicate debits.

### 3. Strict Idempotency Protection
- Compound unique index on `(senderId, idempotencyKey)`.
- Re-submitting an identical idempotency key returns the existing payment record without creating a duplicate job or double-debiting.

### 4. Exponential Backoff Retry & Stale Job Recovery
- **Retries**: Retries up to `maxAttempts` (3) with backoff delays ($2^n$ seconds: 2s, 4s...).
- **Stale Job Recovery**: Jobs stuck in `PROCESSING` longer than `JOB_LOCK_TIMEOUT` (30s) are automatically reset to `QUEUED` and claimed by available workers.

### 5. PayFlow Trace
Interactive visual timeline mapping payment execution steps:
`REQUESTED` $\rightarrow$ `QUEUED` $\rightarrow$ `PROCESSING` $\rightarrow$ (`WORKER_FAILED` / `RETRY`) $\rightarrow$ `SUCCESS`. Includes automated Integrity Report verification checklist.

---

## 📑 API Reference

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | POST | Public | Register user & auto-create $0 balance wallet |
| `/api/auth/login` | POST | Public | Authenticate user & return JWT |
| `/api/auth/me` | GET | User | Get current user & wallet profile |
| `/api/wallet` | GET | User | Get current wallet balance |
| `/api/wallet/transactions` | GET | User | Get wallet debit/credit ledger history |
| `/api/payments` | POST | User | Enqueue payment job (Returns HTTP 202) |
| `/api/payments` | GET | User | List payment history |
| `/api/payments/:id/trace` | GET | User | Get visual execution timeline & integrity metrics |
| `/api/admin/stats` | GET | Admin | System telemetry & counters |
| `/api/admin/queue-health` | GET | Admin | Persistent queue health & active workers |
| `/api/admin/toggle-fault` | POST | Admin | Toggle controlled worker fault simulation |
| `/api/admin/wallet-adjustment` | POST | Admin | Controlled logged wallet balance adjustment |
| `/api/admin/audit-logs` | GET | Admin | Immutable audit log feed |
