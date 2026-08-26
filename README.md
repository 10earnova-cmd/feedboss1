# DeshiX — Bangladeshi adult video tube

React + Vite সাইট। ইউজার সাইট + `/admin` প্যানেল। ডেটা **Firebase Firestore**, ভিডিও/থাম্ব **Cloudflare R2**, অ্যাড **Monetag direct link / script**।

> শুধুমাত্র ১৮+ কনটেন্ট। নাবালক / CSAM / অসম্মতিমূলক ভিডিও আপলোড করা যাবে না।

## লোকাল চালু (এখনই)

```bash
npm install
npm run dev
```

ব্রাউজারে `http://localhost:5173`

- ইউজার সাইট: `/` (আগে ১৮+ age gate)
- অ্যাডমিন: `/admin/login`
- Firebase ছাড়া ডেমো লগইন: `admin@deshix.com` / `admin123`
- ডেমো ভিডিও localStorage এ সেভ হয়। আসল আপলোডের জন্য নিচের স্টেপগুলো করুন।

## ১) Firebase (ডেটা স্টোর + অ্যাডমিন লগইন)

1. [Firebase Console](https://console.firebase.google.com/) এ প্রজেক্ট বানান।
2. Authentication → Email/Password চালু করুন।
3. Firestore Database তৈরি করুন।
4. `firestore.rules` ডিপ্লয় করুন। ফাইলের ভিতরে `you@example.com` বদলে **নিজের অ্যাডমিন ইমেইল** দিন।
5. Authentication এ সেই ইমেইল দিয়ে ইউজার তৈরি করুন।
6. প্রজেক্ট রুটে `.env` বানান (`.env.example` কপি করে):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_EMAIL=you@example.com
```

7. `/admin/login` থেকে সেই ইমেইল/পাসওয়ার্ড দিয়ে ঢুকুন।
8. Admin → Settings → **ডিফল্ট ডেটা লোড** (ক্যাটাগরি/ট্যাগ)। তারপর নিজের ভিডিও আপলোড করুন।

## ২) Cloudflare R2 (ভিডিও স্টোরেজ)

1. Cloudflare → R2 → bucket `deshix-media` তৈরি করুন।
2. Public access: Custom domain (যেমন `cdn.yourdomain.com`) অথবা worker `/file/` প্রক্সি।
3. `worker/` ফোল্ডারে:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put UPLOAD_SECRET
npx wrangler secret put FIREBASE_WEB_API_KEY
npx wrangler secret put ADMIN_EMAILS
npx wrangler secret put PUBLIC_BASE_URL
npx wrangler deploy
```

`wrangler.toml` এ `bucket_name` মিলিয়ে নিন।

4. Admin → Settings → Storage:

- Worker URL: `https://deshix-media.YOUR_SUBDOMAIN.workers.dev`
- Public base: `https://cdn.yourdomain.com` (যদি কাস্টম ডোমেইন থাকে)
- Upload secret: worker এর `UPLOAD_SECRET`

আপলোড ফ্লো: Admin ভিডিও ফাইল সিলেক্ট → worker R2 তে রাখে → URL Firestore এ সেভ।

CORS: worker নিজেই CORS দেয়। R2 কাস্টম ডোমেইনে ভিডিও প্লে করতে bucket public/custom domain লাগবে।

## ৩) Monetag অ্যাডস

Admin → **Ads / Monetag**

| স্লট | কি পেস্ট করবেন |
|---|---|
| Watch CTA | Monetag **Direct link** (`https://otieu.com/4/ZONE_ID`) — ফুল ভিডিও বাটন |
| Download CTA | আরেকটা direct link |
| Mobile sticky | মোবাইলে নিচের বার |
| Popunder | Monetag popunder `<script>` |
| Header / sidebar / grid / footer | Banner HTML বা script |

স্লট **চালু** করলেই ইউজার সাইটে দেখাবে। Direct link নতুন ট্যাবে খুলবে (`rel=sponsored`)।

## অ্যাডমিন প্যানেল কী কী করে

- ভিডিও আপলোড (R2) + URL পেস্ট
- বাংলা/ইংরেজি টাইটেল ও ক্যাপশন
- অটো duration, ভিডিও থেকে থাম্বনেইল ক্যাপচার
- ক্যাটাগরি, ট্যাগ, মডেল
- Featured / Trending / draft-publish-hidden
- ভিউ/লাইক
- সাইট নাম, লোগো, ১৮+ টেক্সট, Terms / Privacy / DMCA / 2257

## প্রোডাকশন ডিপ্লয় (Cloudflare)

এটা **Vite React সাইট + `/api` Worker** — Hono Node server নয়। Root এ `wrangler.jsonc` আছে।

1. GitHub repo `devabhai-1/feedboss` Cloudflare Workers/Pages এ কানেক্ট করুন।
2. Worker name: `feedboss1`
3. Build command: `npm run build`
4. Root directory: `/` (repo root)
5. Build environment variables (Vite):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_R2_WORKER_URL=/api
```

R2 bucket `feedboss` wrangler.jsonc তে bind আছে। Auto-detect Hono **Ignore** করুন — config ফাইলই কাফী।

লোকাল: `npm run dev`  
প্রোডাকশন: `npm run deploy`

## স্ট্রাকচার

```
src/pages            ইউজার পেজ
src/pages/admin      /admin
src/lib/db.ts        Firestore অথবা localStorage
src/lib/storage.ts   R2 worker আপলোড
worker/              Cloudflare Worker + R2
```
