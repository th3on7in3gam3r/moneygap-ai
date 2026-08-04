# Commands

## `moneygap init [--force] [--name <name>]`

Creates `moneygap.config.ts` and `.moneygapignore`.

## `moneygap scan [--cwd <path>]`

Runs all analyzers, prints MoneyGap Score™ TUI, writes `.moneygap/last-scan.json`.

Exit `0` / `1` (threshold findings) / `2` (error).

## `moneygap doctor`

Reports Node version (≥22), CLI version, config validity, framework detection, plugin load (v1: none).

## `moneygap report [-f json,md,html] [--rescan]`

Renders last scan (or rescans) into `.moneygap/reports/`. PDF format throws (not in v1).

## `moneygap fix [--apply] [--yes]`

Prints top recommendations and writes `.moneygap/fixes/*.md`.  
`--apply` without `--yes` is refused. With both flags, still **no** source overwrite in v1.

## `moneygap auth`

Documents future login; stores nothing.

## `moneygap version`

Prints `@moneygap/cli` version.

## `moneygap update`

Fetches npm `latest` for `@moneygap/cli`; soft-fails offline.

## `moneygap config [--validate] [--path]`

Shows resolved config JSON, validates schema, or prints config file path.

## `moneygap generate llms [--force] [--out <path>]`

Writes an AI guidance `llms.txt` (default `public/llms.txt`). Refuses overwrite without `--force`.

## `moneygap validate llms [--path <file>]`

Validates llms.txt structure/quality (AI Readiness ruleset). Exit `1` when errors exist.

## Future (documented no-ops)

`login`, `upload`, `dashboard`, `sync` — not implemented in v1.
