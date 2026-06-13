#!/usr/bin/env node

/**
 * Trendyol Integration Developer Tool — Cursor Production Safety Guard
 *
 * Cursor hook (beforeShellExecution + beforeMCPExecution) that guards against
 * accidental calls to the Trendyol production API.
 *
 * Stage URL (allowed freely):              https://stageapigw.trendyol.com
 * Production URL (requires user approval): https://apigw.trendyol.com
 *
 * Behavior:
 * - Stage / non-Trendyol calls         → { "permission": "allow" }
 * - Production-targeting calls         → { "permission": "ask" } — the user
 *   must explicitly approve in the Cursor client before execution.
 * - Malformed input                    → { "permission": "ask" } (fail safe)
 *
 * Input schemas (per https://cursor.com/docs/hooks):
 *   beforeShellExecution: { "command": "<full terminal command>", "cwd": "...", ... }
 *   beforeMCPExecution:   { "tool_name": "...", "tool_input": <json or string>, ... }
 *
 * Output schema:
 *   { "permission": "allow" | "deny" | "ask",
 *     "user_message": "...", "agent_message": "..." }
 *
 * Security notes:
 * - URL detection: scheme URLs parsed with userinfo skipped; after URLs are
 *   stripped, remainder scanned for bare prod host (mixed commands, headers).
 *   Path segments inside a single URL are not matched as separate hosts.
 * - Shell comments (# at word start) are stripped before scanning commands
 * - The stage host (stageapigw.trendyol.com) contains the production host as a
 *   substring; a negative lookbehind prevents false positives on stage
 * - MCP response content is never trusted as a source of approval
 */

const PRODUCTION_HOST = "apigw.trendyol.com";
const PRODUCTION_HOST_REGEX = /(?<!\w)apigw\.trendyol\.com/i;
// userinfo optional; hostname group skips user:pass@ prefix
const SCHEME_URL_RE =
    /https?:\/\/(?:[^\s/@"']*@)?([a-zA-Z0-9._-]+)[^\s"']*/gi;
const STAGE_URL = "https://stageapigw.trendyol.com";
const PRODUCTION_URL = "https://apigw.trendyol.com";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
    try {
        const payload = JSON.parse(input);

        if (targetsProduction(payload)) {
            respond({
                permission: "ask",
                user_message:
                    `⚠️ This action targets the Trendyol PRODUCTION API (${PRODUCTION_URL}). ` +
                    `Approve only if this is intentional. Always test on stage first: ${STAGE_URL}`,
                agent_message:
                    `Production API call detected (${PRODUCTION_URL}). ` +
                    `Execution requires explicit user approval. ` +
                    `Prefer the stage environment (${STAGE_URL}) and ask the user before targeting production.`,
            });
            return;
        }

        respond({ permission: "allow" });
    } catch {
        // Fail safe: if we cannot parse the input, ask the user instead of
        // silently allowing (malformed hook output fails open in Cursor, so
        // we always emit clean, minimal JSON).
        respond({
            permission: "ask",
            user_message:
                "Trendyol production guard could not inspect this action. Approve to continue.",
            agent_message:
                "Production guard hook received unparseable input; user approval requested.",
        });
    }
});

function targetsProduction(payload) {
    // beforeShellExecution → { command: "<full terminal command>" }
    if (typeof payload.command === "string" && payload.command.length > 0) {
        if (containsProductionHost(stripShellComments(payload.command))) return true;
    }

    // beforeMCPExecution → { tool_name, tool_input } (+ url or command)
    const toolName = String(payload.tool_name || "").toLowerCase();

    let toolInput = payload.tool_input;
    if (typeof toolInput === "string") {
        try {
            toolInput = JSON.parse(toolInput);
        } catch {
            // keep as string; still scanned below
        }
    }

    // generateCurl with environment=production
    if (/generatecurl|generate.curl/.test(toolName)) {
        const env = String(
            (toolInput && toolInput.environment) || "stage"
        ).toLowerCase();
        if (env === "production") return true;
    }

    // Generic scan over the tool INPUT only — deliberately NOT the whole
    // payload: beforeMCPExecution payloads include the MCP server's own URL,
    // and this plugin's MCP server is itself hosted on apigw.trendyol.com.
    // Scanning the full payload would flag every single MCP call.
    if (toolInput !== undefined && toolInput !== null) {
        if (containsProductionHost(JSON.stringify(toolInput))) return true;
    }

    return false;
}

function stripShellComments(command) {
    let out = "";
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < command.length; i++) {
        const ch = command[i];
        if (ch === "'" && !inDouble) inSingle = !inSingle;
        else if (ch === '"' && !inSingle) inDouble = !inDouble;

        if (ch === "#" && !inSingle && !inDouble) {
            // Bash semantics: '#' starts a comment only at the start of a
            // word (string start or preceded by whitespace). A mid-word '#'
            // (e.g. `a=#;curl ...`) is NOT a comment and the rest of the
            // command still executes — so it must still be scanned.
            const prev = i === 0 ? " " : command[i - 1];
            if (/\s/.test(prev)) break;
        }
        out += ch;
    }

    return out;
}

function normalizeUnicode(str) {
    try {
        return str.replace(/\\u[\da-fA-F]{4}/g, (m) =>
            String.fromCharCode(parseInt(m.slice(2), 16))
        );
    } catch {
        return str;
    }
}

function decodePercentEncoding(str) {
    let result = str;
    for (let i = 0; i < 3; i++) {
        try {
            const decoded = decodeURIComponent(result.replace(/\+/g, " "));
            if (decoded === result) break;
            result = decoded;
        } catch {
            break;
        }
    }
    return result;
}

function normalizeForScan(str) {
    return decodePercentEncoding(normalizeUnicode(str));
}

// Scheme URL hostnames (userinfo skipped) + bare-host scan on remainder so a
// stage scheme URL does not suppress a separate bare prod host in the same command.
function scanForProductionHost(text) {
    for (const m of text.matchAll(SCHEME_URL_RE)) {
        if (m[1].toLowerCase() === PRODUCTION_HOST) return true;
    }
    const remainder = text.replace(SCHEME_URL_RE, " ");
    return PRODUCTION_HOST_REGEX.test(remainder);
}

function containsProductionHost(str) {
    return scanForProductionHost(normalizeForScan(str));
}

function respond(obj) {
    process.stdout.write(JSON.stringify(obj));
    process.exit(0);
}