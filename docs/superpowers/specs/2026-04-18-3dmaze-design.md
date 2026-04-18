# 3D Maze Art Visualizer — Design Spec

**Date:** 2026-04-18
**Author:** Sara Gottlieb (sarag@liminalgardens.com)
**Status:** Draft, pending review

## Goal

A browser-based art visualizer inspired by the Windows 3D Maze screensaver. Visitors to Sara's Squarespace art site land on a page showing a 3D maze that the camera autonomously wanders through. The maze's walls, floors, and ceilings are textured with Sara's artwork. A small overlay lets visitors curate which series of art appears on each surface, mute/unmute an ambient audio track, and enter fullscreen mode.

Not a game, not a screensaver in the OS sense — a wandering gallery.

## Core Experience

- **Autonomous drift.** Camera moves forward at constant slow speed, turns at junctions, bounces off dead-ends. No user navigation of the maze.
- **Dreamy atmosphere.** Soft ambient lighting, colored distance fog (purple/blue tint), walls fading into darkness a few cells ahead. Keeps the retro maze structure but replaces the 90s chunk with a gallery-like mood.
- **Curation, not exploration.** Visitors don't control the camera. They control what art is on the walls via a config overlay.
- **Ambient audio, opt-in.** Mute by default. A single looping drone/pad track that matches the mood, unmuted from the overlay.
- **Fullscreen available.** A button in the overlay triggers `requestFullscreen()` on the iframe. Default view is embedded inside the Squarespace page.

## Content Model

4 series; each series is a folder of images or WebM videos. Viewers pick one series per surface from a bottom-drawer overlay.

| Series   | Type            | Source files                                            |
| -------- | --------------- | ------------------------------------------------------- |
| Match    | 3 JPGs          | `Match_01.jpg`, `Match_07.jpg`, `Match_13.jpg`          |
| Me       | 3 JPGs          | `Me_01.jpg`, `Me_07.jpg`, `Me_12.jpg`                   |
| Mother   | 3 JPGs          | `Mother_01.jpg`, `Mother_04.jpg`, `Mother_10.jpg`       |
| Animated | 5 WebMs (GIFs)  | `Dreamstorm`, `Hello_World`, `May_Her_Memory_Be_a_Blessing`, `Pantheons_Playground`, `Peter_and_Wendy` |

**Per-surface image selection.** The overlay has three sections: `Walls`, `Floor`, `Ceiling`. For each surface, the viewer sees all 14 pieces as individual thumbnails, grouped visually by series (Match, Me, Mother, Animated), and ticks which pieces should appear on that surface. A piece can be selected for any combination of surfaces — the Dreamstorm GIF could appear on walls AND ceiling if the viewer wants.

**Texture assignment per surface.** Each face (individual wall panel, floor tile, ceiling tile) of a surface type gets one piece randomly picked from that surface's selected set, shuffled so consecutive faces rarely repeat. When fewer pieces are selected than there are faces, pieces are reused (shuffled). When more faces than pieces, unused pieces get more instances per face.

**Edge case — empty selection.** A surface must have at least 1 piece selected. The overlay disables the last checkbox in a surface's selection to prevent deselecting everything.

**Image fit.** `contain with letterbox` — each face shows the full image, with unused space filled in a dark neutral color that blends with the fog. Nothing is cropped.

## Maze & Scene

- **Size.** 16×16 cells, medium footprint.
- **Cell dimensions.** 10 world units wide, 10 tall (square corridor cross-section).
- **Generation.** Recursive backtracking, fresh random maze on each page load. Perimeter is always solid wall so the camera can't escape.
- **Camera.** First-person, eye at half-cell height (5 units), constant forward speed. At each junction, picks a random valid direction weighted slightly against immediate reversal. Turns are smooth rotations (~0.6 seconds), not snap-90°s. Hits a dead-end → 180° turn, continue.
- **Lighting.**
  - Low ambient baseline.
  - A subtle point light attached to the camera, giving near surfaces gentle illumination.
  - No harsh shadows; materials are flat-lit (`MeshBasicMaterial`, so textures read accurately regardless of scene lighting).
- **Fog.** Exponential distance fog, soft purple/blue. Walls fade to darkness roughly 3 cells ahead. Creates the "dreamy" feel and hides the maze bounds from the viewer.
- **Materials.**
  - JPG faces: `THREE.MeshBasicMaterial` with a `TextureLoader`-loaded texture.
  - WebM faces (Animated series): A hidden `<video>` element per texture, autoplay + muted + loop + playsinline, wrapped in `THREE.VideoTexture`.

## Config Overlay

**Layout: bottom drawer.**

Closed state: a small pill at the bottom-center of the viewport labeled "Configure" with a small chevron. Semi-transparent dark background.

Open state: the pill expands into a drawer at the bottom of the iframe. Height is roughly 260 px (taller than the single-select version because we need to show all 14 pieces per surface). Contents:

- A tab bar at the top of the drawer: `Walls` | `Floor` | `Ceiling`. One tab active at a time.
- Below the tabs, a grid of all 14 pieces, grouped by series with small series labels above each group (`Match`, `Me`, `Mother`, `Animated`). Each piece is a thumbnail (~40 px square for JPGs, 40 px square for the first frame of each WebM).
- Clicking a thumbnail toggles its selection for the active surface. Selected thumbnails show a bright border; deselected ones are dimmed.
- Each group label shows "X selected" counter.
- Bottom-right of the drawer: two icon buttons (mute/unmute, fullscreen).
- Close (×) button at the top-right.

**Responsive behavior.** On narrow iframes (viewport width under ~600 px), the thumbnail grid wraps to multiple rows per series. The drawer grows taller as needed, up to a max of 60% viewport height with internal scroll beyond that.

**Live retexturing.** Each checkbox toggle immediately updates the relevant surface's texture pool and reassigns any faces currently showing a deselected piece. No "apply" button.

**Defaults on page load.**

- Walls: 3 Animated pieces selected — Dreamstorm, May_Her_Memory_Be_a_Blessing, Peter_and_Wendy. (Hello_World and Pantheons_Playground are unselected by default, visible in the overlay for the viewer to toggle on.)
- Floor: all 3 Mother pieces selected
- Ceiling: all 3 Me pieces selected
- Audio: muted
- Fullscreen: off

**State.** All config state lives in memory only. No persistence — refreshing or revisiting resets to defaults. (If we later want to persist via localStorage, that's trivial to add.)

## Audio

- One ambient loop file (`audio/ambient.mp3`, ~1–3 min, seamlessly loopable).
- Starts muted. First unmute plays from the beginning; subsequent toggles just mute/unmute.
- No audio at all for the Animated videos — WebMs are stripped of audio tracks during conversion.
- Audio is optional for MVP. If Sara doesn't have a track ready, we ship with the mute toggle UI in place but no audio file loaded. The overlay hides the audio toggle when no track exists, so empty state is clean.

## Technology & Build

**Zero-build static site.** No bundler, no `npm install`, no build step. The files you edit are the files that deploy.

**Structure:**

```
/
├── index.html        (importmap + module imports + iframe-friendly viewport setup)
├── main.js           (entry point, boots the scene)
├── scene/
│   ├── maze.js       (recursive backtracking generator, returns cell grid)
│   ├── world.js      (builds Three.js geometry from cell grid)
│   ├── drift.js      (camera motion + turning logic)
│   └── textures.js   (series loading, per-face assignment, retexture-on-change)
├── ui/
│   └── config.js     (bottom drawer, series pickers, mute/fullscreen buttons)
├── audio/
│   └── ambient.mp3   (loop track, TBD)
├── art/
│   ├── match/         (3 JPGs, resized to max 1024px wide, ~80% quality)
│   ├── me/            (3 JPGs, same)
│   ├── mother/        (3 JPGs, same)
│   └── animated/      (5 WebMs, VP9, no audio, max 1024px wide)
└── README.md         (setup + deploy notes)
```

**Three.js import via importmap:**

```html
<script type="importmap">
{ "imports": { "three": "https://unpkg.com/three@0.170.0/build/three.module.js" } }
</script>
```

Pinned to Three.js r170. Bump deliberately if we need newer features.

**Local dev.** Any static file server. Python's `python3 -m http.server 8080` works fine, or `npx serve` if Node is installed.

**Asset preparation (one-time, Sara does not run these):**

1. Reorganize `/art/` into series subfolders (`match/`, `me/`, `mother/`, `animated/`).
2. Resize JPGs to max 1024px wide, re-encode at ~80% quality. Originals are preserved outside the repo.
3. Convert GIFs to WebM (VP9 codec via `ffmpeg`, no audio, CRF ~32 for a good size/quality balance). Original GIFs preserved outside the repo.
4. Only the optimized JPGs and WebMs are committed to git.

I (Claude) will do these conversions using local `ffmpeg` and an image tool (ImageMagick or `sips` on macOS) when we reach the implementation step. Sara does not need to install anything.

**Adding new art later.** Sara drops new JPGs into the appropriate series folder, commits, and pushes. For new animated pieces, runs a small shell script (provided in README) to convert a GIF to WebM.

## Deployment

1. Create a GitHub repo (public or private both work for Cloudflare Pages).
2. Push the project to `main`.
3. Cloudflare Pages project connected to the repo: build command `(none)`, build output directory `/`. Every push to `main` redeploys.
4. Cloudflare provides a URL like `https://3dmaze-abc.pages.dev`. Custom subdomain can be added later.
5. In Squarespace (Business plan), add a Code block on the target page and paste:

```html
<iframe
  src="https://<maze-url>.pages.dev"
  style="width: 100%; height: 80vh; border: 0;"
  allowfullscreen
  allow="autoplay; fullscreen">
</iframe>
```

The `allow="autoplay; fullscreen"` attribute is required for the video textures (WebMs) to autoplay and for fullscreen mode to work from inside the iframe.

## Testing

Manual verification before declaring shipped. No automated tests.

Desktop:
- Chrome, Safari, Firefox (current versions)
- Scene loads, camera drifts, walls show correct textures
- Switching series via overlay retextures live without reload
- Mute/unmute toggles audio as expected
- Fullscreen button enters/exits fullscreen

Mobile:
- Safari on iOS, Chrome on Android
- Scene renders at reasonable framerate (if a mobile user sees less than ~30 fps, consider reducing maze to 12×12 for small viewports — confirm with real device test first)
- Overlay is usable with touch (tap targets ≥ 32px)

Deployment:
- Cloudflare Pages deploys on push
- Iframe embeds in Squarespace preview page and renders correctly
- Fullscreen works from inside the iframe on both desktop and mobile

## Performance Targets

- Total asset bundle: under 5 MB (rough breakdown: ~1 MB JPGs total, ~3–4 MB WebMs total)
- Time to first paint: under 2 seconds on a broadband connection
- Sustained 30+ fps on modern desktop and mid-range mobile
- No memory leaks over extended idle (camera runs indefinitely, so texture/video references must not accumulate)

## Out of Scope (MVP)

- Visitor-uploaded images (Option B from brainstorming — rejected)
- Admin panel for Sara to curate remotely (Option C — not needed; she edits files and pushes)
- Persistent config via localStorage
- Multiple mazes / themed experiences
- The rat mascot from the original screensaver
- Sound effects on turns or at junctions
- A loading screen beyond a simple text indicator
- Analytics / visit tracking

## Open Questions / Decisions to Confirm at Implementation

- **Ambient audio track.** Does Sara have a track in mind, or do we ship with a placeholder loop and swap later?
- **Default per-surface selections.** Walls = Dreamstorm + May_Her_Memory_Be_a_Blessing + Peter_and_Wendy (3 GIFs). Floor = all 3 Mother. Ceiling = all 3 Me. Confirmed with Sara 2026-04-18.
- **Thumbnail thumbnails.** Each piece appears as a thumbnail in the overlay. For JPGs we'll auto-generate a small version at build time. For WebMs we'll extract the first frame (or a representative frame — could tune per-piece if needed).
- **Custom domain.** Use default `*.pages.dev` URL for MVP; Sara can add a custom subdomain later (e.g. `maze.liminalgardens.com`).
- **Fog color and exact camera speed.** Needs visual tuning during implementation. Will present options during dev.
