# agent-inventory

An inventory of the AI systems and agents in an organisation, classified against the EU AI Act, scored for agentic risk, plus a static reviewer for MCP client configurations. Zero runtime dependencies. Nothing is uploaded.

**Live demo:** https://jvch0512.github.io/agent-inventory/

## Why

Two questions keep coming up in client meetings: "which of our AI uses does the AI Act touch?" and "what can our agents actually do if someone misleads them?". The first is a classification problem, the second is an access problem. This tool answers both from one inventory file.

## What it does

**Inventory (`inventory`)**
- Tier per system: prohibited (Art. 5), high-risk (Art. 6(2) and Annex III areas), transparency duties (Art. 50) or minimal.
- Obligations by role (provider, deployer, both), the Art. 6(3) exemption handling (ignored when the system profiles people), general-purpose model notes and the relevant dates.
- Open points: no owner, high-risk without logging, unknown area or practice codes.
- Agent risk score from visible weights: autonomy, execute/write/network tools, data sensitivity, missing human approval, missing logging, missing owner. Each point is listed as a driver, with advice.

**MCP configuration (`mcp`)**
- Reads `mcpServers` (or `servers`) from Claude Desktop, Claude Code and similar configs. Never starts a server.
- Flags plain-HTTP remote servers, credentials in URLs, unpinned npx/uvx packages, unpinned container images, `--privileged`, a mounted Docker socket, inline secrets in `env` (redacted in the output), shell-style servers and filesystem servers rooted at `/` or the home directory.
- Infers what the tool set can do and feeds it to the same agent risk score.

```
npm install && npm run build
node dist/src/cli.js inventory examples/inventory.json --fail-on-prohibited
node dist/src/cli.js mcp examples/mcp-config.json --fail-on high
npm start      # browser UI on http://127.0.0.1:8787
```

Sample outputs live in `docs/` and CI fails if they drift. The gates exit with 1 so you can use them in a pipeline.

## Dates encoded

Prohibitions and AI literacy: 2 February 2025. General-purpose model duties: 2 August 2025. Transparency (Art. 50): 2 August 2026. High-risk systems under Annex III: 2 December 2027 and Annex I products: 2 August 2028, as moved by the Digital Omnibus on AI. They were checked against public sources in November 2026. Verify them against the Official Journal before you rely on them.

## Limits

- The classification is only as good as the answers in the inventory, and it is indicative. Borderline cases need a legal assessment.
- Tool access inferred from MCP server names is a heuristic. Replace it with the real scopes when you know them.
- The static MCP review does not replace a runtime test. Pair it with [mcp-red-team](https://github.com/jvch0512/mcp-red-team).

MIT licence.
