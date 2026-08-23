# ⚡ domainyourlink

**domainyourlink** is an ultra-fast dynamic URL redirection service built with **Next.js (App Router)** and **PostgreSQL (Neon / Vercel Postgres)**.

It provides permanent public URLs that you can point to any destination and update at any time without ever breaking the public link.

---

## 🎯 Purpose & Use Case

Imagine you print your LinkedIn or portfolio URL on resumes, business cards, NFC tags, or social bios:
```
domainyourlink.vercel.app/siddu/linkedin
```
If you later change your LinkedIn username or custom vanity URL, simply update the destination in your domainyourlink dashboard. The public link `domainyourlink.vercel.app/siddu/linkedin` remains completely unchanged, and all future visitors will be redirected to the new destination instantly.

---

## 🚀 Key Features

* **⚡ Ultra-Low Latency**: The redirect endpoint executes a single indexed database lookup (`username` + `webname`) and returns an immediate server-side HTTP `307` redirect.
* **🛡️ HTTP 307 Redirects by Default**: Prevents aggressive browser caching so changes to destination URLs take effect immediately.
* **📊 Decoupled Analytics**: Click counts are updated asynchronously without blocking or delaying the redirect response.
* **🔒 Password & OTP Sign-In**: Creators can log in with 6-digit email OTPs or password.
* **👑 CEO Command Center (`/ceo`)**: Real-time worldwide link stats, user management, and employee authorization.
* **💼 Employee Portal (`/employee`)**: Clean, privacy-first view of platform metrics and destination platforms with zero user PII.
* **☁️ Vercel & Neon Ready**: Optimized for serverless and edge environments with zero connection overhead.

---

## 📦 Tech Stack

* **Framework**: Next.js 16+ (App Router, React 19, TypeScript)
* **Styling**: Tailwind CSS & Lucide Icons
* **Database**: PostgreSQL (Neon / Vercel Postgres / Supabase)
* **ORM & Migrations**: Drizzle ORM & Drizzle Kit
* **Authentication**: Signed HTTP-only session cookies (`jose` / HMAC-SHA256)

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root of your project:

```env
# PostgreSQL connection string (Neon / Vercel Postgres / Supabase / Local)
DATABASE_URL="postgresql://user:password@ep-sample-12345.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Master password for /ceo portal
CEO_PASSWORD="your_secure_ceo_password"

# Default password for creator admin login
ADMIN_PASSWORD="your_secure_password"

# Secret key for signing session tokens (min 32 characters)
JWT_SECRET="your_random_secret_string_minimum_32_characters_long"

# Gmail SMTP for sending 6-digit verification codes
GMAIL_USER="yourname@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"

# Public URL of your deployed application
NEXT_PUBLIC_APP_URL="https://domainyourlink.vercel.app"
```

---

## 🛠️ Local Setup & Running Migrations

### 1. Install Dependencies
```bash
npm install
```

### 2. Push Database Schema
```bash
npm run db:push
```

### 3. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
Visit [http://localhost:3000/ceo](http://localhost:3000/ceo) for the CEO Command Center.
Visit [http://localhost:3000/employee](http://localhost:3000/employee) for Employee Insights.

---

## 🚀 Deployment to Vercel

```bash
git remote add origin https://github.com/siddupatel-00/domainyour.link.git
git branch -M main
git push -u origin main
```
