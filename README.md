# Dual-Universe Portfolio - GitHub Pages Deployment

One developer, two worlds. The site opens on a **"Choose Your Universe"** gateway and lets visitors enter either:

| World | File | What it is |
|---|---|---|
| **The Dark Knight** | `batman.html` | The Batman-themed portfolio: same content, sections and links as before, restyled (Gotham skyline hero, glass cards, WebP images). The previous look is kept as `batman-classic.html`. |
| **The Lost World** | `pirate.html` | An animated pirate treasure-map portfolio: *The Lost Developer's World*. |

Everything is plain static HTML/CSS/JS - no framework, no build step, no dependencies - and every path is relative, so it works
under the GitHub Pages project path (`/Portfolio-Website/`) and on any other base.

## Files Structure
- `index.html` - **Gateway** ("Choose Your Universe"). Randomly features one world per browser session; never auto-redirects.
- `batman.html` - The Batman portfolio (this was `index.html` before the gateway existed; same content, same relative paths).
- `batman/polish.css`, `batman/polish.js` - Styles and behaviour of the polished `batman.html` (see below).
- `batman/img/*.webp` - Optimised copies of the project / certificate / blog images used by `batman.html` (generated, see below).
- `batman-classic.html` - The Batman page exactly as it was before the polish. Not linked from anywhere; open it directly to compare.
- `styles.css`, `script.js` - Styles and behaviour of `batman-classic.html` (untouched originals; the polished page does not use them).
- `pirate.html` - The pirate world: ocean backdrop, animated treasure map, navigation list, chapter container.
- `pirate/pirate.css`, `pirate/pirate.js` - Pirate styling and application logic (router, chapters, intro, audio).
- `pirate/pirate-data.js` - Reads `batman.html` at runtime and turns every section into data for the pirate world.
- `pirate/batman-snapshot.js` - `batman.html` as a script (generated, see below). Only used when the pirate world is opened straight from disk.
- `pirate/thumbs/*.webp` - Small thumbnails for the pirate cards (generated, see below). Originals are never modified.
- `universe/universe.js` - Shared session logic (50/50 featured pick, remembered world, legacy `#anchor` forwarding, switcher).
- `universe/gateway.css`, `universe/gateway.js` - Gateway page.
- `universe/switcher.css` - Floating "Switch universe" button injected into the Batman pages.
- `universe/og-gateway.png` - Social preview image of the gateway; `og-image.png` - social preview of the Batman page.
- `tools/make-thumbs.py` - Regenerates `pirate/thumbs/`, `batman/img/` and `pirate/batman-snapshot.js` (needs `pip install pillow`).
- `tools/auto-projects.py`, `tools/auto-projects-state.json`, `images/projects/` - Weekly auto-added project cards (see below).
- `pbl.html`, `case422.html` - Research write-ups linked from both worlds.
- `test.html` - Test page to verify CSS/JS loading (legacy).
- Image files (`*.png`, `*.jpg`, etc.) - Portfolio images

## The polished Batman page
**What changed:** the look and feel only - a gold-on-black Gotham hero (animated skyline, rain, bat-signal), glass cards with a
gold spotlight, section numerals, SVG icons instead of emoji, light/dark themes, motion that respects `prefers-reduced-motion`,
and hover effects that only run on devices that can really hover (no "stuck" hover after a tap).
**What did not:** every section, text, link, project, certificate and behaviour (theme toggle, mobile menu, See More, preview
modal, contact form confirmation, Konami easter egg). A click or tap on a project card now opens its preview too - the hero tip
always said so, but originally only the Preview button or the keyboard did.

Fixes that came along: the failing external favicon, project previews whose image names did not exist, pinch-zoom that was
disabled, heading order and a few landmark / alt-text issues (axe-core reports 0 violations), images that weighed 15 MB
(now ~1 MB as WebP; first screen ~0.7 MB instead of ~2.8 MB).

**Hooks the pirate world relies on.** `pirate/pirate-data.js` reads `batman.html` with these selectors, so keep them when editing:
`.hero h2 strong`, `.brand p`, `.hero .stat`, `.hero .avatar`, `.hero .cta-row a`, `#skills .skill-category`,
`#problem-solving .platform-link / .stat-card a`, `#projects-grid .card` (with `h4`, `p`, `img`, `a.btn`, `.preview-btn`, `data-project`),
the `.cv-*` blocks and the `#connect` contact details.

**Images.** Cards use `<picture><source type="image/webp" srcset="batman/img/<slug>.webp"><img src="original.png" loading="lazy" ...></picture>`;
the original stays as the fallback. After adding a card with a new image run `python tools/make-thumbs.py` and commit
`batman/img/` and `pirate/thumbs/`.

**Go back to the previous look:** copy `batman-classic.html` over `batman.html` (it uses `styles.css` and `script.js`, which are still here).

## How the session logic works
Stored in `sessionStorage` (one tab session), keys prefixed `spsUniverse:`:
- `featured` - a fair coin flip (`crypto.getRandomValues`) made **once per session**, so refreshing never reshuffles it.
- `chosen` - the last world the visitor actually entered. Once set it becomes the featured card ("Where you left off").

A new tab/session starts fresh and randomises again. Batman's own light/dark toggle lives in `localStorage`
(`dark-knight-theme`) and is not affected. Old links such as `/#projects` are forwarded to the same section of the remembered
world (Batman by default).

On the Batman page a small floating **Switch universe** pill (bottom-left) lets visitors cross over at any time. It stays out of
the first screen - where the hero copy reaches the bottom edge on laptops and phones - and fades in once the visitor scrolls.

## Where the pirate world gets its content
`batman.html` is the single source of truth. `pirate/pirate-data.js` fetches it, parses it with `DOMParser` and reads every card -
including the ones the Batman page hides behind "See More". **Add a project to `batman.html` and it appears on the pirate map
automatically.** Technology chips only show technologies named in a card's own text; nothing is invented.

After adding a project, or any edit to `batman.html`, run the tool once (the cards fall back to the original image until you do):

    pip install pillow
    python tools/make-thumbs.py

It regenerates the optimised images **and** `pirate/batman-snapshot.js`. On GitHub Pages (or any http/https server) the pirate world
always reads the live `batman.html`, and the snapshot is never downloaded. The snapshot exists for one case only: a page
**opened straight from disk** (double-clicking `index.html` / `pirate.html`), where browsers refuse to `fetch()` other files and the
pirate chapters would otherwise be empty. If you edit `batman.html` and skip the tool, a disk-opened pirate world shows the old text.

## New GitHub projects are added automatically
Every Sunday a GitHub Action (`.github/workflows/auto-projects.yml`, kept on the `main` branch because GitHub only runs schedules
from the default branch) runs `tools/auto-projects.py` on this branch and pushes the result here. The script looks at every public
repo, decides whether it is a real project (live demo, description, README length and sections such as Features / Installation /
Usage, screenshots, topics - and against: notes, practice, lab work, "a collection of ..."), and adds the winners as cards with a
picture (the README's first screenshot, else a title card in the site's colours). The pirate world gets them automatically.

- The cards live between the `auto-projects` marker comments in `#projects-grid` (after the three featured cards) and are
  rewritten every run, newest first. Move the markers to move the block; move a card out of the block to hand-edit it.
- A repo already linked anywhere else on the page is never added twice (renamed repos and demo URLs are recognised).
- Repo topics override the score: `portfolio` = always add, `not-portfolio` = never show (also removes an existing card).
- Close calls are not added; they are listed in the run summary (Actions tab -> the run -> Summary).
- Try it without changing anything: `python tools/auto-projects.py --dry-run`, or Actions -> Run workflow -> tick "dry run".

## Run locally
Double-click `index.html` - everything works from disk. Or serve the folder, which also reads the live `batman.html`:

    python -m http.server 8000
    # open http://localhost:8000/

To test the real GitHub Pages sub-path, serve the *parent* of a folder named `Portfolio-Website`.

## Routes (all plain files + hash links, so refresh/back/forward/deep links work on any static host)
- `/` gateway - `/batman.html` Batman - `/pirate.html` pirate
- Pirate destinations: `pirate.html#captains-log`, `#arsenal`, `#arena`, `#treasure-islands`, `#game-seas`, `#hall-of-honors`,
  `#research-guild`, `#storytellers-cove`, `#broadcast`, `#dossier`, `#message`
- Pirate project records: `pirate.html#treasure-islands/<project-slug>` (also `#game-seas/...`, `#hall-of-honors/...`)

## GitHub Pages Setup
Before pushing: run `python tools/make-thumbs.py` if you changed `batman.html`, and make sure the new files are committed -
`batman/`, `pirate/` (including `thumbs/` and `batman-snapshot.js`), `universe/`, `tools/`, `pirate.html`, `batman-classic.html`, `og-image.png`.
Pages serves a single branch (currently `gh-pages`), so push to that one.

1. Push all files to your GitHub repository
2. Go to Settings -> Pages
3. Select "Deploy from a branch"
4. Choose the branch that serves the site (currently `gh-pages`) and the "/ (root)" folder
5. Wait for deployment (usually 5-10 minutes)

## Troubleshooting

If CSS or JS doesn't load:

1. Check the test page: `https://your-username.github.io/your-repo/test.html`
2. Ensure all files are in the root directory
3. Verify file names match exactly (case-sensitive)
4. Check browser console for errors
5. Clear browser cache and try again

## File Paths
All paths are relative (`batman/polish.css`, `universe/universe.js`, `pirate/pirate.js`, ...) for maximum compatibility.

## Features Included
- Gateway with randomised, remembered, never-forced universe choice
- Batman portfolio: responsive design, dark/light toggle, mobile navigation, animations, contact form, project previews
- Pirate portfolio: cinematic skippable intro, animated treasure map, keyboard-accessible islands, nautical navigation list for small screens,
  project "expedition records", optional procedural ocean sound (off by default), reduced-motion support
- GitHub Pages optimised, with fallback styles and error handling
