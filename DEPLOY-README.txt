BIHARSE — DEPLOY INSTRUCTIONS (READ THIS FIRST)
================================================

Your last Vercel deploy built an OLD commit from your GitHub repo
(the build log showed the old build command without `ensure-db.mjs`).
Follow these steps EXACTLY to replace the repo contents with THIS code.

─ Option A — Replace your GitHub repo with this code (recommended) ─

1. Extract this tar.gz anywhere.
2. From the extracted folder:

     git init -b main
     git add -A
     git commit -m "BiharSe full deploy"
     git remote add origin https://github.com/Arsh0712/biharse.git
     git push --force origin main

3. Vercel redeploys automatically on push (or: vercel.com → your project
   → Deployments → Redeploy).

─ Option B — Vercel CLI directly ─

     vercel          # from the extracted folder
     vercel --prod

─ How you know the NEW code is deployed ─

The build log MUST show this build command (it includes ensure-db.mjs):

     Running "node scripts/prisma-generate.mjs && node scripts/ensure-db.mjs && next build"

If it still shows "node scripts/prisma-generate.mjs && next build",
the push did not replace the old files — redo Option A step 2.

─ No environment variables needed ─

Works with zero env vars on Vercel: the SQLite database, product images
and an embedded runtime seed ship inside the code itself.

Admin:  https://<your-deployment>/?v=admin
        admin@biharse.org / u3SgHyACRk0tYkensVkw0iiu
