# AGENTS.md

Instructions for AI coding agents working on Ritmo (Cadence): a multi-tenant CRM and intelligence platform for dance schools and independent teachers. Next.js 16, React 19, TypeScript, BetterAuth, Drizzle, PostgreSQL, next-intl, shadcn/ui + Tailwind.

## Setup commands

- Install deps: `pnpm install`
- Start dev server: `pnpm dev`
- Run lint: `pnpm lint`

## Before you finish: format, test, build

Always run these before committing or considering the task done:

1. **Format:** `pnpm format` — applies Biome formatting. Fix any format issues.
2. **Test:** `pnpm test` — runs the test suite. Fix failing tests; add or update tests for changed code.
3. **Build:** `pnpm build` — ensures the app builds. Resolve any build errors.

Run them in that order. Do not mark the task complete until format, test, and build all pass.

## UI: use shadcn components and the shadcn MCP

- **Prefer shadcn/ui:** For buttons, forms, dialogs, tables, inputs, selects, etc., use components from `components/ui/` (shadcn). Do not introduce one-off styled divs or custom primitives when a shadcn component exists.
- **Use the shadcn MCP for shadcn work:** When adding, changing, or choosing shadcn components:
  - Use the **user-shadcn** MCP server and its tools to search registries, get add commands, and fetch examples.
  - Prefer MCP over guessing API or copying from external docs.
  - Check the tool schemas in the MCP file system before calling tools.

Existing shadcn components live under `components/ui/`. Add new ones via the CLI add command (or the MCP `get_add_command_for_items` when available).

## Code style

- TypeScript strict mode; path alias `@/*` for project-root imports
- Tabs for indentation, double quotes — per biome.json
- File/folder names: kebab-case. Components: PascalCase
- Prefer Server Components; use Client Components only when needed (hooks, interactivity, browser APIs)

## Architecture (critical)

- **Tenant isolation:** All DB access must filter by `organization_id`. Use helpers in `lib/tenant-context.ts` and `lib/tenant-resolver.ts`. Never hardcode org IDs.
- **i18n:** All user-facing strings go through next-intl; use `messages/en.json` and `messages/es.json`. No hardcoded UI copy.
- **Data access:** Use query helpers from `db/queries/`; do not put raw queries in routes or components.

## Testing

- Unit tests: `pnpm test:unit` — `tests/unit/`
- Integration tests: `pnpm test:integration` — `tests/integration/`
- Use factories from `tests/factories/` for test data.

## PR / commit hygiene

- Run `pnpm format`, `pnpm test`, and `pnpm build` before pushing.
- Add or update tests for any behavior you change.
