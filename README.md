# Nnneva

**Your maternal-care agent.** An AI agent that manages the work around your
pregnancy, so you can focus on what truly matters.

This repository holds the Nnneva landing experience: a full-bleed hero built
around a real photograph, with the product's tools surfaced as live, openable
panels rather than screenshots.

## Running it

```bash
cd web
npm install
npm run dev      # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |

## What's in it

The page renders three purpose-built hero layouts — desktop, tablet and mobile —
each composed for its own width rather than reflowed from one another, and five
panels the header and hero open:

| Panel | Opens from |
| --- | --- |
| Week tracker — week 32 growth, milestones and tips | *My Journey*, and the week card |
| Hospital bag — packing checklist by category | *Resources*, and the hospital-bag card |
| Tool drawer — reminders, checklists, family, expenses | *Tasks*, *Health*, *Family*, and the quick-tool row |
| Get started | The header and hero calls to action |
| Notifications | The header bell |

## Stack

Vite 6 · React 19 · TypeScript · Tailwind CSS v4 · lucide-react

Type faces are Plus Jakarta Sans for interface text, DM Serif Display for the
headline, and Caveat for the handwritten note, loaded from Google Fonts in
`index.html`.

## Assets

The three photographs in `src/assets/images/` are bundled and served from the
build. The profile and social-proof avatars are hot-linked from Unsplash, so
they need outbound network access to render.

## Licence

MIT. See [LICENSE](LICENSE).
