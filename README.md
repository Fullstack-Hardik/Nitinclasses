# Nitin Sir Classes Management Software

Comprehensive full-stack management application for **Nitin Sir Classes** administration. Built with **Node.js, Express, MongoDB (Mongoose), React 18, TypeScript, Tailwind CSS (Modern Neumorphism), and PDFKit/ExcelJS**.

---

## 🏗️ Architecture

```
nitinclases/
├── server/       # Express REST API (Deployable to Render)
│   ├── src/
│   │   ├── config/       # MongoDB Connection
│   │   ├── controllers/  # Auth, Student, Fee, Library, Dashboard, Settings
│   │   ├── middleware/   # JWT Protect & Brute-force Rate Limiters
│   │   ├── models/       # Admin, Student, FeeDue, Payment, Seat, Settings, AuditLog
│   │   ├── routes/       # Protected API Endpoints
│   │   ├── services/     # Idempotent Anniversary Billing & PDFKit Receipt Engine
│   │   └── server.js     # Express App Entry & Security Headers
│   ├── .env.example
│   └── package.json
│
└── client/       # React 18 + TypeScript + Vite (Deployable to Vercel)
    ├── src/
    │   ├── components/   # Neumorphic Dashboard, Students, Fees, Library & Settings
    │   ├── services/     # Axios client with JWT interceptors
    │   ├── types/        # Full domain TypeScript models
    │   ├── App.tsx
    │   └── main.tsx
    ├── .env.example
    └── package.json
```

---

## 🚀 Deployment Instructions

### 1. Backend (Deploy to Render)
1. In Render, create a new **Web Service**.
2. Connect this repository and set **Root Directory** to `server`.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Configure Environment Variables in Render:
   - `PORT`: `5000` (or leave default assigned by Render)
   - `MONGODB_URI`: `your_mongodb_atlas_connection_string`
   - `JWT_SECRET`: `your_random_strong_secret`
   - `ADMIN_EMAIL`: `admin@nitinsirclasses.com`
   - `ADMIN_PASSWORD`: `YourSecurePassword123!`
   - `CLIENT_URL`: `https://your-frontend-app.vercel.app`
   - `NODE_ENV`: `production`

### 2. Frontend (Deploy to Vercel)
1. In Vercel, import this repository.
2. Set **Root Directory** to `client`.
3. Framework Preset: **Vite**.
4. Configure Environment Variable in Vercel:
   - `VITE_API_URL`: `https://your-render-backend-service.onrender.com/api`
5. Deploy.

---

## 🔐 Default Admin Credentials (Seed)
- **Email:** `admin@nitinsirclasses.com`
- **Password:** `Admin@12345`
*(Can be changed anytime inside the Settings screen).*
