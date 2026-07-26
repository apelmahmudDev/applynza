# Applynza Agent Rules

These rules apply to all AI-agent work in this repository.

## Project

- This is a WXT + React + TypeScript browser extension for privacy-first job application tracking.
- Follow existing WXT conventions, folder structure, naming, and nearby code patterns.
- Keep changes narrowly scoped. Do not introduce new frameworks, state libraries, build tools, styling systems, backends, analytics, AI services, or external APIs unless explicitly requested.
- Keep the product local-first. Prefer WXT storage helpers or `chrome.storage.local` for core data.

## Architecture

- Keep WXT `entrypoints/` thin. They should mount the app, wire top-level state, and compose feature modules.
- Put feature-specific code in `modules/<feature>` and organize it by responsibility, such as `components/`, hooks, helpers, schemas, and `types.ts`.
- Put genuinely shared primitives and utilities in existing shared folders such as `components/`, `hooks/`, `lib/`, or `utils/`.
- Preserve boundaries between popup, side panel, dashboard, content scripts, and background/service-worker logic.
- Do not edit generated WXT output files or add custom build hacks when WXT configuration can handle the change.

## Component and File Size

- Do not create monolithic components or place an entire feature in one file.
- Keep each handwritten source file focused on one clear responsibility.
- Treat 200 lines as a refactoring checkpoint. React components and feature files over 300 lines must normally be split.
- Never generate thousands of lines of handwritten application code in one file.
- Extract UI sections into components, stateful behavior into hooks, business logic into helpers/services, and shared types/constants into dedicated files.
- Do not create meaningless tiny files only to satisfy the limit.
- Generated code, static data, schemas, or configuration may exceed 300 lines when splitting would reduce clarity. Explain any handwritten exception in the final summary.

## UI and shadcn/ui

- Check `components/ui` before creating any UI primitive.
- Use existing shadcn/ui components for buttons, inputs, forms, dialogs, sheets, dropdowns, cards, tables, tabs, tooltips, and similar UI whenever available.
- Do not duplicate an existing shadcn/ui primitive in another folder.
- Import UI primitives through the project alias, for example `@/components/ui/button`.
- Customize with props, variants, composition, and Tailwind classes before modifying files in `components/ui`.
- Keep `components/ui` limited to reusable primitives. Put feature-specific components in the relevant feature module.
- When no suitable primitive exists, prefer adding the official shadcn/ui component. Do not add another UI library without approval.
- Preserve accessibility, responsive behavior, dark mode, and the existing visual language.
- Keep popup and side-panel interfaces lightweight; place large tables, analytics, bulk actions, and complex management flows in the dashboard.

## Browser Extension, Security, and Privacy

- Keep permissions minimal. Do not add new permissions, broad host permissions, or `<all_urls>` without explicit approval and a clear need.
- Do not use `eval`, remote code, unsafe inline scripts, or unnecessary external scripts.
- Content scripts may extract only the minimum job-related information required from visible page content or metadata.
- Do not collect unrelated page text, private messages, cookies, auth tokens, hidden personal data, or unnecessary profile data.
- Do not hardcode or log secrets, credentials, resumes, cover letters, personal notes, job application data, or authentication tokens.
- Preserve existing stored data. When changing a storage schema, provide backward-compatible handling and never delete user data automatically.
- Do not claim data remains local when a feature sends it outside the browser.

## Product Behavior

- Manual editing must remain available when job detection fails.
- Job records should maintain `createdAt` and `updatedAt` values.
- Detect duplicates by job URL first, then by company and title.
- Keep the experience simple, fast, and focused on saving, editing, organizing, searching, filtering, and exporting job applications.

## Code Quality

- Prefer TypeScript types over `any` and simple maintainable code over clever abstractions.
- Reuse existing components, hooks, helpers, and patterns before creating new abstractions.
- Keep business logic separate from presentation when it improves clarity.
- Handle missing, malformed, duplicated, and older stored data safely.
- Do not leave dead code, unused imports, debug logs, commented-out experiments, or silently ignored TypeScript/lint errors.

## Command Safety and Dependencies

- Confirm the repository root and run `git status --short` before broad edits.
- Do not overwrite user changes or run destructive commands such as `git reset --hard`, `git clean`, force overwrites, or recursive deletes unless explicitly requested.
- Do not create commits, branches, tags, or pull requests unless explicitly requested.
- Use `pnpm`. Check `package.json` and `pnpm-lock.yaml` before dependency changes, and never edit the lockfile manually.
- Ask before adding dependencies, permissions, backend services, external APIs, analytics, telemetry, or AI features.

## Job Detection

- Keep website-specific detectors separate from the generic fallback.
- Prefer JSON-LD, metadata, semantic HTML, and stable attributes over generated CSS class names.
- Do not guess missing job information.
- Manual creation and editing must remain available when detection fails.
- Do not collect or store unrelated page content.

## Verification and Completion

- Inspect relevant files and available scripts before editing.
- Run the relevant typecheck, tests, and build when practical. Never claim a check passed unless it was actually run successfully.
- Before finishing, review modified files for oversized or mixed-responsibility code and inspect `git diff --stat`.
- The final summary must state what changed, which files changed, what verification ran, what was skipped, and any manual browser step or remaining risk.
