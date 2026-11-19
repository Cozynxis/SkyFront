# SKYFRONT — Web Edition

A lightweight, original Fortnite-inspired game lobby built with Vite and plain JavaScript/CSS.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

## Deploy with GitHub Pages

1. Go to **Settings → Pages** in the repository.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Push to `main` or run **Actions → Deploy SKYFRONT to Pages → Run workflow**.
4. Your site will be available at https://cozynxis.github.io/SkyFront/ once the deployment succeeds.

## Structure

- `src/main.js`: pages, navigation, placeholder mascot markup.
- `src/style.css`: animated gradients, game lobby layout, and responsive styling.
- `vite.config.js`: GitHub Pages base path.
- `.github/workflows/pages.yml`: automatic deployment.

The Play button is deliberately disabled until game modes are implemented. No 3D models or external game assets required.
