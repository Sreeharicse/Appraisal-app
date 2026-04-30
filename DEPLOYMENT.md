# Hosting & Deployment Guide

This guide explains how to host your React application on popular platforms. Because this is a **Single Page Application (SPA)** built with Vite, all routing is handled by the browser. 

I have automatically added the necessary platform configuration files (`vercel.json`, `netlify.toml`, `render.yaml`, `Dockerfile`, `nginx.conf`) to the repository to handle route rewrites smoothly.

---

## Required Environment Variables
No matter which platform you choose, you **must** supply these Environment Variables in your hosting provider's dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_ENCRYPTION_KEY`
- `VITE_MSAL_CLIENT_ID` (If using Azure AD)
- `VITE_MSAL_TENANT_ID` (If using Azure AD)

---

## 🚀 Option 1: Vercel (Recommended & Easiest)
Vercel is optimized for React and Vite applications. The `vercel.json` file is already set up in the root directory.

1. Create a free account at [Vercel.com](https://vercel.com).
2. Install the Vercel GitHub App and **Import your repository**.
3. In the "Configure Project" screen, leave the Build Command (`npm run build`) and Output Directory (`dist`) as the defaults.
4. Expand the **Environment Variables** section and paste your keys.
5. Click **Deploy**. Vercel will automatically read `vercel.json` and serve your app!

---

## ⚡ Option 2: Netlify
Netlify is another extremely fast zero-config platform. The `netlify.toml` file is already provided.

1. Go to [Netlify.com](https://netlify.com) and log in with GitHub.
2. Click **Add new site** -> **Import an existing project**.
3. Select this repository.
4. Netlify will auto-detect the settings from the `netlify.toml` file.
5. Click **Show advanced** to add your Environment Variables.
6. Click **Deploy site**.

---

## ☁️ Option 3: Render.com
Render is fantastic if you want to host both the Frontend and the Backend Node.js server under the same roof. The `render.yaml` Blueprint is already provided.

1. Go to [Render.com](https://render.com) and log in.
2. Go to **Blueprints** -> **New Blueprint Instance**.
3. Connect your repository.
4. Render will automatically read the `render.yaml` file and prompt you to fill in the missing Environment Variables (both for the static site and the SMTP node server).
5. Click **Apply** to launch both services instantly.

---

## 🐳 Option 4: Docker & VPS (Self-Hosted)
If you are deploying to a private server (like DigitalOcean, AWS EC2, or a local server), the repository includes a hardened `Dockerfile` and `nginx.conf` designed explicitly for this Vite app.

**1. Using Docker Compose:**
```bash
docker-compose up -d --build
```
This simply builds the image using the provided `docker-compose.yml` config, which mounts the port `10000` to your host machine.

**2. Manual Docker Build:**
You can build the image manually and pass the build arguments:
```bash
docker build \
  --build-arg VITE_SUPABASE_URL="your-url" \
  --build-arg VITE_SUPABASE_ANON_KEY="your-key" \
  -t appraisal-app .

docker run -d -p 8080:10000 appraisal-app
```
*(The Nginx configuration handles routing `/*` back to `index.html` to prevent 404s when navigating directly to a URL route).*
