# 💍 Development Guide — InstaWedding T&P

This document consolidates all technical definitions, system architecture, database schema, API flows, and step-by-step setup to build the **InstaWedding T&P** web app from scratch.

---

## 1. Project Overview

**InstaWedding T&P** is a PWA (Progressive Web App) designed for guests at Thiago & Priscila's wedding to share real-time photos/videos, participate in a "Photo Scavenger Hunt" (Challenges), and stream a live photo feed onto the venue projector/display screen.

### Core Pillars:

- **Mobile-First & PWA:** No app store download needed. Fast access via QR Code.
- **Frictionless Identity:** Simple guest identification by name/nickname (no password wall).
- **Direct Media Upload:** In-browser image compression + direct upload to Cloudflare R2 via Presigned URLs.
- **Realtime Projector Screen:** Instant wall feed updates via Supabase Realtime (WebSockets/SSE).
- **100% Free Stack:** Designed within the _Free Tier_ limits of Vercel, Supabase, and Cloudflare R2.

---

## 2. Architecture & Tech Stack

```
                     ┌──────────────────────────────────────────────┐
                     │            GUESTS (Mobile PWA)               │
                     │  - React + Tailwind CSS                      │
                     │  - In-browser WebP compression               │
                     └──────────────────────┬───────────────────────┘
                                            │
                                 HTTP / Presigned Upload
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │                 API GATEWAY                  │
                     │  - Node.js / Vercel Serverless Functions     │
                     │  - Cloudflare R2 Presigned URL Generator     │
                     └──────────────┬────────────────┬──────────────┘
                                    │                │
               ┌────────────────────┘                └────────────────────┐
               ▼                                                          ▼
┌───────────────────────────┐                              ┌───────────────────────────┐
│         DATABASE          │                              │       MEDIA STORAGE       │
│   Supabase (PostgreSQL)   │                              │       Cloudflare R2       │
│                           │                              │                           │
│ - Table: challenges       │                              │ - 10 GB Free Storage      │
│ - Table: posts            │                              │ - $0 Egress fees          │
│ - Table: likes            │                              │ - Compressed images       │
└─────────────┬─────────────┘                              └───────────────────────────┘
              │
      Realtime Pub/Sub
              │
              ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            PROJECTOR / LIVE WALL SCREEN                          │
│  - React PWA in display mode                                                     │
│  - Supabase Realtime listener to push new photos instantly                       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Stack Selection:

- **Frontend:** React (TypeScript) + Vite + Tailwind CSS + Lucide React + `browser-image-compression`.
- **Backend:** Vercel Serverless Functions (Node.js) or Node.js Express API.
- **Database & Realtime:** Supabase (PostgreSQL + Realtime Engine).
- **Object Storage:** Cloudflare R2 (S3-compatible API).
- **Hosting & CI/CD:** Vercel.

---

## 3. Database Schema (Supabase / PostgreSQL)

Execute the following SQL script in your Supabase **SQL Editor**:

```sql
-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Scavenger Hunt Challenges Table
CREATE TABLE public.challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Feed Posts Table
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_name VARCHAR(100) NOT NULL,
    media_url TEXT NOT NULL,
    caption TEXT,
    challenge_id INT REFERENCES public.challenges(id) ON DELETE SET NULL,
    likes_count INT DEFAULT 0,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Likes Table (prevents duplicate likes per session)
CREATE TABLE public.likes (
    id SERIAL PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    client_session_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_post_client_like UNIQUE (post_id, client_session_id)
);

-- 5. Enable Realtime for posts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- Seed initial challenges
INSERT INTO public.challenges (title, description, icon) VALUES
('Perfect Toast', 'Take a photo raising glasses with your table!', '🥂'),
('Dance Floor', 'Capture the best or funniest dance move!', '🕺'),
('Tender Glance', 'Snap a candid moment of the newlyweds.', '💍'),
('Dessert Bar', 'Show off your favorite dessert or cake slice!', '🍰'),
('New Friends', 'A group photo with guests met today from other tables.', '🤝');
```

---

## 4. API Endpoints

### `POST /api/upload-url`

Generates a Cloudflare R2 presigned URL for secure browser uploads.

- **Request Body:** `{ "fileName": "photo.webp", "fileType": "image/webp" }`
- **Response (200):** `{ "uploadUrl": "https://...", "publicUrl": "https://pub-xxx.r2.dev/uuid.webp" }`

### `POST /api/posts`

Persists the post metadata into Supabase.

- **Request Body:**
  ```json
  {
    "authorName": "Camila & Family",
    "mediaUrl": "https://pub-xxx.r2.dev/uuid.webp",
    "caption": "Unforgettable night!",
    "challengeId": 1
  }
  ```

### `GET /api/posts`

Fetches feed posts in descending chronological order.

- **Response (200):** Array of posts including associated challenge object.

### `POST /api/posts/:id/like`

Registers or removes a like tied to the browser session ID.

### `GET /api/challenges`

Returns active photo challenges.

---

## 5. Development Steps (Local -> Production)

### STEP 1: Local Setup

1. **Create Vite React Project:**

   ```bash
   npm create vite@latest instawedding-tp -- --template react-ts
   cd instawedding-tp
   ```

2. **Install Dependencies:**

   ```bash
   npm install lucide-react react-router-dom @supabase/supabase-js browser-image-compression @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. **Configure Tailwind Palette (`tailwind.config.js`):**

   ```javascript
   /** @type {import('tailwindcss').Config} */
   export default {
     content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
     theme: {
       extend: {
         colors: {
           sage: {
             50: '#F2F7F3',
             100: '#E5EFE8',
             200: '#D5E4D8',
             800: '#2F4F38',
             900: '#233A2A',
           },
           gold: {
             400: '#C5A880',
             500: '#8C704B',
           },
         },
         fontFamily: {
           serif: ['Playfair Display', 'serif'],
           sans: ['Plus Jakarta Sans', 'sans-serif'],
         },
       },
     },
     plugins: [],
   }
   ```

4. **Setup Local Environment (`.env.local`):**
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key

   # Cloudflare R2 Credentials (Serverless Side)
   R2_ACCOUNT_ID=your-account-id
   R2_ACCESS_KEY_ID=your-access-key
   R2_SECRET_ACCESS_KEY=your-secret-key
   R2_BUCKET_NAME=instawedding-bucket
   R2_PUBLIC_DOMAIN=https://pub-xxx.r2.dev
   ```

---

### STEP 2: Client Implementation

1. **Supabase Client (`src/lib/supabase.ts`):**

   ```typescript
   import { createClient } from '@supabase/supabase-js'

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

   export const supabase = createClient(supabaseUrl, supabaseAnonKey)
   ```

2. **Image Compressor (`src/utils/compressor.ts`):**

   ```typescript
   import imageCompression from 'browser-image-compression'

   export async function compressPhoto(file: File): Promise<File> {
     const options = {
       maxSizeMB: 0.8,
       maxWidthOrHeight: 1280,
       useWebWorker: true,
       fileType: 'image/webp',
     }
     return await imageCompression(file, options)
   }
   ```

3. **Application Routes (`App.tsx`):**
   - `/` -> `FeedPage`
   - `/capture` -> `CapturePage`
   - `/challenges` -> `ChallengesPage`
   - `/projector` -> `ProjectorPage`

---

### STEP 3: Testing

1. **Run Dev Server:**
   ```bash
   npm run dev
   ```
2. **Mobile Device Testing (Same Wi-Fi):**
   ```bash
   npm run dev -- --host
   ```
   _Access via local IP (e.g., `http://192.168.1.50:5173`) to test native camera access._

---

### STEP 4: Cloud Infrastructure

1. **Supabase:** Run SQL script & copy API credentials.
2. **Cloudflare R2:** Create bucket `instawedding-bucket`, enable public access, generate R2 API Tokens.
3. **Vercel Deploy:** Connect Git repository, set environment variables, deploy.

---

## 6. Event Day Checklist 🥂

- [ ] Print table sign acrylics/cards containing QR Code + challenge instructions.
- [ ] Test photo upload using 4G/cellular data at venue location.
- [ ] Connect venue PC to projector and open `/projector` route in full-screen mode (F11).
- [ ] Clear test posts from Supabase database before party starts.
- [ ] Enjoy the wedding! 🎉
