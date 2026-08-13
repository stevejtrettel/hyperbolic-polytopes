# GitHub Pages — outstanding work

This repo builds all its demos into one static site with a shared three.js chunk
(`npm run build:all` → `dist-pages/`), deployed by
`.github/workflows/pages.yml` on every push to `main`.

**Live:** https://stevejtrettel.github.io/hyperbolic-polytopes/ (12 demos)

## 1 demo is missing from the live site

- `demos/coxeterInput/`

This builds locally but is not committed, so CI never sees it. The
site shows fewer demos than a local `npm run build:all` for exactly this reason.

```bash
git add demos/coxeterInput
git commit -m "Add coxeterInput" && git push
```

---

Setup mirrored from `stevejtrettel/threejs-demos`. To re-sync the build script
and workflow after a change there:

```bash
node ../threejs-demos/scripts/add-pages.mjs ../hyperbolic-polytopes
```
