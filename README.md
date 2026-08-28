# ⚡ domainyourlink

**domainyourlink** ([domainyourlink.vercel.app](https://domainyourlink.vercel.app)) is an ultra-fast dynamic URL redirection and link management service built with **Next.js (App Router)**, **Turso (LibSQL)**, and **PostgreSQL**.

It provides permanent, username-independent short links (`/u/[code]`), group hubs (`/g/[code]`), and bio pages (`/b/[code]`) that you can point to any destination and update at any time without ever breaking the link.

---

## 🎯 Purpose & Use Case

Imagine you print your portfolio, resume link, or product on business cards, resumes, NFC tags, billboards, or social bios:
```
domainyourlink.vercel.app/u/k9f2w1
```
Whenever you update your LinkedIn, GitHub, YouTube, or business website, simply change where the link points in your **domainyourlink Dashboard**. The public short link `domainyourlink.vercel.app/u/k9f2w1` remains completely unchanged, and all future visitors are redirected to the new destination instantly.

---

## 🚀 Key Features

* **⚡ Sub-Millisecond Latency**: Single indexed lookups with immediate HTTP `307` server-side redirection.
* **🛡️ Used Codes Registry**: Any shortcode issued to a link, bio, or group is recorded forever and never recycled or reassigned upon deletion.
* **📦 Link Groups Hubs (`/g/[code]`)**: Bundle related links into interactive shareable boxes with customizable visibility and expiration.
* **👤 Permanent Bio Pages (`/b/[code]`)**: Clean personal link-in-bio profiles that stay permanently yours even if you change your username.
* **📊 Asynchronous Decoupled Analytics**: Click events and referrer analytics update asynchronously without delaying redirection response times.
* **🔒 Password & OTP Sign-In**: Creators can log in with 6-digit email OTPs or password.
* **👑 CEO Command Center (`/ceo`)**: Real-time worldwide link stats, user management, and employee authorization.
* **💼 Employee Portal (`/employee`)**: Privacy-first operational insights with zero creator PII exposure.

---

## 📦 Tech Stack

* **Framework**: Next.js 16+ (App Router, React 19, TypeScript)
* **Styling**: Tailwind CSS & Lucide Icons
* **Database**: Turso (LibSQL / SQLite edge) + PostgreSQL (Neon / Supabase)
* **ORM**: Drizzle ORM & Drizzle Kit
* **Authentication**: Signed HTTP-only session cookies (`jose` / HMAC-SHA256)
* **Email**: Nodemailer (Gmail SMTP) for 6-digit OTP verification and analytics recaps

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root of your project:

```env
# Turso Database URL & Auth Token (Primary fast edge database)
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your_turso_auth_token"

# Master password for /ceo executive portal
CEO_PASSWORD="your_secure_ceo_password"

# Secret key for signing session tokens (min 32 characters)
JWT_SECRET="your_random_secret_string_minimum_32_characters_long"

# Gmail SMTP for sending 6-digit verification codes & analytics recaps
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

### 2. Run Test Suite
```bash
npm test
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
git remote add origin https://github.com/siddupatel-00/domainyourlink.git
git branch -M main
git push -u origin main
```
Configure custom domain `domainyourlink.vercel.app` in your Vercel Project Settings under **Domains**.
