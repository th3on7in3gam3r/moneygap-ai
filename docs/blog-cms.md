# Blog CMS (Growth Academy™)

## Purpose

Internal editorial CMS at `/dashboard/academy/cms` for creating and managing Growth Academy content. The learner home (gap-closing playbooks) lives at `/dashboard/academy`.

## Capabilities (Phase 1)

- Create / edit articles
- Draft, preview (`/academy/[slug]?preview=1` when signed in), publish, schedule, archive, delete
- Slug editor, featured image URL, categories, tags, authors
- SEO preview (title, URL, description)
- Version history with restore-to-draft
- Content gap idea queue → one-click draft
- Internal link suggestions (related articles + product destinations)

## APIs

- `GET/POST /api/growth-academy/articles`
- `GET/PUT/DELETE /api/growth-academy/articles/[id]`
- `POST /api/growth-academy/generate`
- `GET/POST /api/growth-academy/ideas`
- `POST /api/growth-academy/events` (public share/view signals)

## Never auto-publish

AI and idea-queue actions only create `status: draft` until an editor publishes.
