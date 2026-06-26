# TODO: Translate documentation (RU -> EN)

## Plan (proposed)
- Detect all Markdown files under `docs/docs/ru/**/*.md`.
- Create corresponding English files under `docs/docs/en/**`.
- Translate frontmatter (`title`, `description`) and all Markdown body text from Russian to English.
- Keep code blocks, command names, paths, and links intact (adjust `/ru/...` links to `/...` English equivalents).
- Ensure navigation/paths in `docs/docs/en/navigation.json` match the generated English docs.
- Run formatting/lint checks if available (at least ensure Markdown is valid UTF-8).
- After completion, verify no Russian text remains in `docs/docs/en/**/*.md`.

## Steps
- [ ] Gather list of all Russian markdown files under `docs/docs/ru`.
- [ ] Inspect existing English docs (if any) to avoid overwriting.
- [ ] Create EN counterparts for each RU markdown file.
- [ ] Translate content file-by-file.
- [ ] Update internal links to point to EN routes.
- [ ] Verification: grep for Cyrillic in `docs/docs/en/**/*.md`.

