# Extending Guides with a new framework

Adding a framework is registry + overlay files only. No route code changes required.

## Steps

1. **Registry** — Confirm the framework exists in `src/lib/guides/frameworks.ts` (all 12 v1 frameworks are already registered). If adding a *new* id beyond the list, extend `FrameworkId` in `types.ts` and the `FRAMEWORKS` array.

2. **Overlays** — Create `content/guides/overlays/{framework-id}/{topic}.md` for each topic you want published. Concept files under `content/guides/concepts/` must already exist for those topics.

3. **Verify** — Visit `/guides/{framework}` and a topic URL. Confirm sitemap and `/guides/search` include the new guides after rebuild.

## Example

For Vue coverage of metadata:

```
content/guides/overlays/vue/metadata.md
```

Reuse the shared concept at `content/guides/concepts/metadata.md`. Title the overlay for Vue-specific Metadata API / head management.

## Related topics graph

Edges live in `src/lib/guides/graph.ts`. Related guides prefer same-framework neighbors, then other frameworks for the same topic — only among published combos.
