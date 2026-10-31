# PanelForge AI

A public-facing manhwa creation studio prototype. The featured original series is **The God Beneath My Shadow**.

## Current features

- Series overview, story bible, character profiles, and an eight-arc roadmap
- Chapter 1 storyboard with twelve detailed visual scene prompts
- Panel Studio sends each scene description and its dialogue context to the image generator
- Reader preview with dialogue and narration overlays
- Character reference images and drawing notes
- Responsive layout for desktop and mobile

## Image generation

The server-side image route uses Cloudflare Workers AI with **FLUX.2 Klein 4B**. It accepts a scene prompt and up to four reference images. The Cloudflare credentials must be configured as Render environment variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The API token must have permission to run Workers AI models. Never put the token in client-side code or share it publicly.

## Important current limitations

- Generated panel images are currently stored in the creator's browser `localStorage`, not in shared cloud storage. They are therefore not automatically visible to other visitors or devices, and browser storage limits can prevent large chapters from persisting.
- Character uploads and custom character drawing notes are currently stored locally in the creator's browser (IndexedDB/local storage), not shared across accounts.
- The chapter roadmap contains outlines for later chapters; only Chapter 1 currently has a complete twelve-panel storyboard and dialogue.
- Authentication, multi-user workspaces, database-backed project storage, and public chapter publishing are not yet implemented.
- The image-generation endpoint currently uses an in-memory per-IP request limit. It still needs durable global rate limiting and authenticated creator access before being opened for unrestricted public use.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build

```bash
npm run build
npm start
```

## Stack

Next.js 15, React 19, TypeScript, Cloudflare Workers AI, Sharp, and custom CSS.
