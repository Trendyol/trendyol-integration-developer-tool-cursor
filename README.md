# Trendyol Integration Developer Tool — Cursor Plugin

A Cursor plugin that turns the agent into a specialist for Trendyol Marketplace

## Components

| Component | Path | Purpose |
|---|---|---|
| MCP server | `mcp.json` | Live API contracts, planning, validation, and generation tools (`TrendyolDeveloperToolsMcpServer`) |
| Skill | `skills/trendyol-integration-developer-tool/` | Operating discipline: MCP-first, plan-before-code, validate-before-mutate |
| Rules | `rules/*.mdc` | Core mandates, security, module map, validation reference, workflow, code patterns |
| Hooks | `hooks/` | `beforeShellExecution` + `beforeMCPExecution` guard that requires explicit user approval for any action targeting the production API (`apigw.trendyol.com`); stage is unrestricted |

## API Scope (Phase 1)

- Trendyol Marketplace — Product Integration API (TR)
- Trendyol Marketplace — Product Integration V2 API (TR)
- Trendyol International Marketplace — Product Integration API

Orders, Shipments, Finance, and Claims domains are planned for future phases.

## Local testing

Copy this directory to `~/.cursor/plugins/local/trendyol-integration-developer-tool`,
then restart Cursor (or run `Developer: Reload Window`). Verify:

1. The MCP server appears connected in Settings → MCP.
2. The six rules are listed under Settings → Rules.
3. Ask the agent to run `curl -I https://apigw.trendyol.com` — Cursor should
   pause and ask for your approval. `curl -I https://stageapigw.trendyol.com`
   should run without interruption.

## Safety

- All generated curl commands and code target stage by default; production
  URLs appear as comments only.
- The hook never auto-approves anything beyond Cursor's normal flow; it only
  escalates production-targeting actions to an explicit user decision.
- Credentials are never read, stored, or transmitted; generated examples use
  placeholder values.

## License

Apache-2.0 — © Trendyol Group