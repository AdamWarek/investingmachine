# 🚀 Deployment Guide: Free Continuous Trading Bot

Your trading bot is ready! Follow these steps to put it online 24/7 for FREE.

## Step 1: Get Your Database (Supabase)
1.  Go to [Supabase.com](https://supabase.com) and Sign Up (Free).
2.  **Create a New Project**. Give it a name like "ThinkingTrader" and a password.
3.  Wait for it to setup (takes ~1 min).
4.  **Create The Table** (Important!):
    - Go to **SQL Editor** (icon on let sidebar).
    - Paste this code and run it:
      ```sql
      create table portfolios (
        id bigint primary key,
        data jsonb
      );
      alter table portfolios disable row level security; -- Allows access without policies
      ```
5.  **Get Keys**:
    - Go to **Project Settings** (Cog icon) -> **API**.
    - Copy these two values:
      - `Project URL` (e.g., https://xyz.supabase.co)
      - `anon` / `public` Key

## Step 2: Get Your Host (Render)
1.  Go to [Render.com](https://render.com) and Sign Up (Free).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub account and select this repository `investingmachine`.
4.  **Settings**:
    - **Name**: `my-trading-bot`
    - **Region**: Frankfurt (closest to PL)
    - **Branch**: `main`
    - **Root Directory**: `.` (leave empty)
    - **Runtime**: `Node`
    - **Build Command**: `npm install`
    - **Start Command**: `node server.js`
    - **Instance Type**: `Free`
5.  **Environment Variables** (Scroll down to "Advanced" or "Environment"):
    - Click **Add Environment Variable** for each:
        - `SUPABASE_URL`: (Paste from Step 1)
        - `SUPABASE_KEY`: (Paste from Step 1)
        - `AV_API_KEY`: (Your Alpha Vantage Key, or leave blank to use mock data)
6.  Click **Create Web Service**.

## Step 3: Keep It Alive (Cron-Job)
*Render's free tier sleeps after 15 mins of no activity. We need to wake it up.*

1.  Wait for Render to deploy. You will get a URL like `https://my-trading-bot.onrender.com`.
2.  Go to [cron-job.org](https://cron-job.org) (Free).
3.  **Create Cronjob**:
    - **Title**: Wake Up Bot
    - **URL**: `https://YOUR-APP-URL.onrender.com/ping`  <-- IMPORTANT: Add `/ping` at the end!
    - **Schedule**: Every 10 minutes.
4.  Save.

---

## 🎉 Done!
Your bot is now running in the cloud.
- Open `https://YOUR-APP-URL.onrender.com` on your phone to check the dashboard.
- The `server.js` is running in the background, checking prices and trading automatically.
