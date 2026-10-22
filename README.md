# Real-Time Fraud Detection & Analytics Platform

A real-time fraud detection and analytics platform built with the MERN stack (MongoDB, Express, React, Node.js), Socket.io, Vite, and Tailwind CSS. Featuring a modern, clean light-mode SaaS interface inspired by Stripe and Datadog.

---

## Features

- **Real-Time Fraud Heuristics Engine**: Evaluates transactions instantly using fraud detection algorithms:
  - **Velocity Rule**: Flags rapid-fire transaction bursts (>3 transactions per card within a 1-minute window).
  - **Location Jump Rule**: flags a card used from a different location within 5 minutes of its previous transaction.
- **Live WebSocket Pipeline**: Instantly streams transactions, fraud alerts, and threat updates to the browser using Socket.io without polling.
- **Dashboard**:
  - Clean light-mode design tokens with high-contrast text hierarchy and subtle elevation.
  - Live cumulative throughput and anomaly counters (`GET /api/transactions/stats`).
  - 10-second rolling trend line chart tracking total vs. flagged transaction velocity.
  - Interactive tabbed feeds: **Overview**, **Transactions Feed**, and **Security Alerts**.
  - Web Audio API synthesized oscillator audio warnings for immediate threat awareness.
- **Realistic Anomaly Simulator**:
  - Simulates 20 distinct cardholder profiles with regional home coordinates.
  - Least-Recently-Used (LRU) round-robin scheduling ensuring normal transactions stay within threshold limits.
  - Injects realistic velocity spikes and overseas location anomalies targeting an optimal 5–15% fraud rate.
  - Built-in benchmark mode: `node simulate.js --duration 180`.

---

## Project Structure

```
Real-Time-Fraud-Detection-Analytics-Platform/
├── client/                     # Frontend React application (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # AlertToast, Navbar, ProtectedRoute
│   │   ├── context/            # AuthContext (JWT auth & audio alert state)
│   │   ├── hooks/              # useSocket.js (Socket.io event listeners)
│   │   ├── pages/              # Dashboard.jsx, Login.jsx
│   │   ├── App.jsx             # Router configuration
│   │   ├── main.jsx            # React root mount
│   │   └── index.css           # Inter typography & Tailwind styles
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend Node.js / Express / Socket.io / MongoDB
│   ├── middleware/             # JWT auth & error handler middlewares
│   ├── models/                 # Transaction, AlertLog, User (Mongoose schemas)
│   ├── routes/                 # auth.js, transactions.js (/stats), alerts.js
│   ├── index.js                # HTTP server & Socket.io server entrypoint
│   ├── simulate.js             # Realistic 20-card fraud anomaly simulator
│   ├── start-mongo.js          # Standalone MongoDB runner
│   ├── check-db.js             # MongoDB inspection utility
│   ├── verify-e2e.js           # End-to-end verification script
│   ├── package.json
│   └── .env.example
│
├── .gitignore
├── LICENSE                     # MIT License
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) running locally on port 27017, or a remote MongoDB connection string

---

### 1. Server Setup

```bash
cd server
npm install
```

Create a `.env` file in `/server` based on `.env.example`:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/fraud_db
JWT_SECRET=supersecret123
```

Start MongoDB and the backend API server:
```bash
# If using the included standalone MongoDB runner:
node start-mongo.js

# In a new terminal, start the backend server:
npm run dev
```

---

### 2. Client Setup

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### 3. Running the Fraud Simulation

With the server and client running:
```bash
cd server

# Run continuously:
node simulate.js

# Or run a 3-minute benchmark:
node simulate.js --duration 180
```

---

## License

This project is licensed under the [MIT License](LICENSE).
