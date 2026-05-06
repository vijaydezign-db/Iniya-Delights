# Iniya Delights — Product Costing Tool

A lightweight internal tool for calculating product costs, managing ingredients, and tracking margins.

Built with **React + Vite + TypeScript + Tailwind CSS + shadcn/ui**.

---

## Run Locally

```bash
# 1. Clone the repo
git clone <YOUR_REPO_URL>
cd <PROJECT_FOLDER>

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The app will be available at `http://localhost:8080`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production (output in `dist/`) |
| `npm start` | Preview the production build on port 3000 |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |

## Deploy on Vercel (Free Tier)

### Step 1 — Push to GitHub

1. Create a new repository on [github.com](https://github.com/new)
2. Push your code:

```bash
git remote add origin https://github.com/<YOUR_USERNAME>/<REPO_NAME>.git
git branch -M main
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New… → Project"**
3. Import your GitHub repository
4. Vercel auto-detects Vite — default settings work out of the box:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**

Your app will be live in ~30 seconds at `https://<project>.vercel.app`.

### Automatic Deployments

Every push to `main` will trigger a new deployment automatically.

## Project Structure

```
├── public/             # Static assets (favicon, robots.txt)
├── src/
│   ├── components/     # Reusable UI components
│   │   └── ui/         # shadcn/ui primitives
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and data store
│   ├── pages/          # Route pages (Dashboard, Ingredients, Products, Calculator)
│   └── types/          # TypeScript type definitions
├── index.html          # Entry HTML
├── vercel.json         # Vercel SPA routing config
├── tailwind.config.ts  # Tailwind configuration
└── vite.config.ts      # Vite configuration
```

## Environment Variables

No secrets or API keys are required. All data is stored in the browser's localStorage.

If you add environment variables in the future, create a `.env` file locally (it's git-ignored) and add them in Vercel under **Project Settings → Environment Variables**.

## License

Private project — internal use only.
