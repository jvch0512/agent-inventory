node dist/src/cli.js inventory examples/inventory.json > /tmp/inv.md
diff /tmp/inv.md docs/sample-inventory.md
node dist/src/cli.js mcp examples/mcp-config.json > /tmp/mcp.md
diff /tmp/mcp.md docs/sample-mcp.md
test "$(node dist/src/cli.js inventory examples/inventory.json --fail-on-prohibited >/dev/null; echo $?)" = "1"
test "$(node dist/src/cli.js mcp examples/mcp-config.json --fail-on high >/dev/null; echo $?)" = "1"
