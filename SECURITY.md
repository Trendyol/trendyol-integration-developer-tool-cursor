# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x | ✅ Active |

---

## Reporting a Vulnerability

If you discover a security vulnerability in this plugin, **do not open a public GitHub issue.**

Please report it privately:

**Email:** appsec@trendyol.com
**Subject:** `[SECURITY] trendyol-integration-developer-tool-cursor — <brief description>`

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

We will acknowledge receipt within **48 hours** and provide a resolution timeline within **7 business days**.

---

## Scope

This security policy covers the Cursor plugin itself:

- `hooks/pretool-guard-cursor.mjs` — production-safety hook script
- `hooks/hooks.json` — hook registration
- `skills/` — SKILL.md and reference files
- `rules/` — agent rules
- `mcp.json` — MCP server connection configuration
- `.cursor-plugin/plugin.json` — plugin manifest

**Out of scope:**
- The Trendyol Developer Tools MCP server (separate repository)
- The Trendyol Marketplace APIs themselves
- Vulnerabilities in Cursor or the Cursor platform

For API security issues, contact [Trendyol Developer Support](https://developers.trendyol.com/docs/support-request).

---

## Security Design

### Production-Safety Hook

The `hooks/pretool-guard-cursor.mjs` script runs on Cursor's `beforeShellExecution` and `beforeMCPExecution` hooks. It inspects each shell command and MCP tool call for the Trendyol production API host (`apigw.trendyol.com`) and returns one of:

- `allow` — for stage and non-production actions
- `ask` — for any action targeting production, requiring explicit user approval before execution

Detection normalizes Unicode and percent-encoding and parses URL hosts to resist evasion. The hook is registered with `failClosed: true`, so if the hook itself cannot run (missing Node.js, crash, or timeout), the action is blocked rather than silently allowed. The hook never auto-approves anything beyond Cursor's normal permission flow; it only escalates production-targeting actions to an explicit user decision. This is a best-effort safety mechanism and does not replace proper access control, credential management, or deployment review processes.

### Credential Handling

This plugin does not handle, store, or transmit API credentials. Generated curl commands use placeholder values (e.g. `<BASE64_API_KEY_SECRET>`, `<SUPPLIER_ID>`). Credentials are the sole responsibility of the integrating party.

### MCP Connection

The plugin connects to the Trendyol Developer Tools MCP server over HTTPS. The connection is used for planning, validation, and code generation only. The plugin does not write to or modify any Trendyol API data directly.

---

## Disclosure Policy

We follow responsible disclosure. After a fix is released, we will:

1. Publish a security advisory on GitHub
2. Credit the reporter (unless they prefer to remain anonymous)
3. Update this document if the scope or policy changes