# ⚡ PermanentLink

**PermanentLink** is a simple, ultra-fast dynamic URL redirection service built with **Next.js (App Router)** and **PostgreSQL (Neon / Vercel Postgres)**.

It provides permanent public URLs that you can point to any destination and update at any time without ever breaking the public link.

---

## 🎯 Purpose & Use Case

Imagine you print your LinkedIn or portfolio URL on resumes, business cards, NFC tags, or social bios:
```
domain.com/siddu/linkedin
```
If you later change your LinkedIn username or custom vanity URL, simply update the destination in your PermanentLink dashboard. The public link `domain.com/siddu/linkedin` remains completely unchanged, and all future visitors will be redirected to the new destination instantly.

### Example Records

| Public Permanent URL | Destination URL | HTTP Code |
| :--- | :--- | :--- |
| `domain.com/siddu/linkedin` | `https://linkedin.com/in/currentusername` | `307` |
| `domain.com/siddu/github` | `https://github.com/currentusername` | `307` |
| `domain.com/siddu/lifeagent` | `https://lifeagent.ai` | `307` |

---

## 🚀 Key Features

* **⚡ Ultra-Low Latency**: The redirect endpoint executes a single indexed database lookup (`username` + `webname`) and returns an immediate server-side HTTP `307` redirect.
* **🛡️ HTTP 307 Redirects by Default**: Prevents aggressive browser caching so changes to destination URLs take effect immediately.
* **📊 Decoupled Analytics**: Click counts are updated asynchronously without blocking or delaying the redirect response.
* **🔒 Password-Protected Admin Dashboard**: Clean, responsive UI with:
  * Fast search and filtering
  * Live URL preview
  * One-click copy public link
  * One-click test redirect (opens in new tab)
  * Inline destination URL updates
  * Redirect deletion
* **☁️ Vercel & Neon Ready**: Optimized for serverless and edge environments with zero connection overhead.

---

## 📦 Tech Stack

* **Framework**: Next.js 15+ (App Router, React 19, TypeScript)
* **Styling**: Tailwind CSS & Lucide Icons
* **Database**: PostgreSQL (Neon / Vercel Postgres / Supabase)
* **ORM & Migrations**: Drizzle ORM & Drizzle Kit
* **Authentication**: Signed HTTP-only session cookies (`jose`)

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root of your project:

```env
# PostgreSQL connection string (Neon / Vercel Postgres / Supabase / Local)
DATABASE_URL="postgresql://user:password@ep-sample-12345.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Password used to log into the /admin dashboard
ADMIN_PASSWORD="your_secure_password"

# Secret key for signing admin session tokens (min 32 characters)
ADMIN_JWT_SECRET="your_random_secret_string_minimum_32_characters_long"

# Public URL of your deployed application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 🛠️ Local Setup & Running Migrations

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and set your `DATABASE_URL` and `ADMIN_PASSWORD`:
```bash
cp .env.example .env.local
```

### 3. Push Database Schema
Apply the database schema and composite index directly to your database:
```bash
npm run db:push
```
*(Or run `npm run db:migrate` if using migration files)*

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
Visit [http://localhost:3000/admin](http://localhost:3000/admin) to log in and manage your links.

---

## 🚀 Deployment to Vercel

### Step 1: Push Code to GitHub / Git Provider
```bash
git init
git add .
git commit -m "Initial commit for PermanentLink"
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Import Project on Vercel
1. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
2. Under **Storage**, create or attach a **Neon** or **Vercel Postgres** database.
3. Vercel will automatically populate `DATABASE_URL` / `POSTGRES_URL`.

### Step 3: Add Admin Environment Variables in Vercel
In your Vercel Project Settings → **Environment Variables**, add:
* `ADMIN_PASSWORD`: Your secret admin password
* `ADMIN_JWT_SECRET`: A random 32+ character string
* `NEXT_PUBLIC_APP_URL`: Your custom domain or Vercel URL (e.g. `https://permanentlink.vercel.app`)

### Step 4: Apply Database Schema to Production
Run the push command targeting your production database URL:
```bash
npx drizzle-kit push --url="<YOUR_PRODUCTION_DATABASE_URL>"
```

### Step 5: Deploy!
Vercel will build and deploy your application. You can now use your custom domain (e.g., `links.yourname.com/{username}/{webname}`) with instant redirection!

---

## ⚡ Redirect Architecture & Caching Strategy

The redirect handler is implemented in `src/app/[username]/[webname]/route.ts`:
1. **Direct Indexed Query**: Single B-tree index lookup on `(username, webname)`.
2. **Immediate HTTP 307 Response**:
   ```typescript
   NextResponse.redirect(destinationUrl, {
     status: 307,
     headers: {
       "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
       "Pragma": "no-cache",
     },
   });
   ```
3. **Decoupled Analytics**: Next.js `after()` schedules the click count update after the HTTP response has been sent to the visitor, ensuring analytics overhead is 0ms.
