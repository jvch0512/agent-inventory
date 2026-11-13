# MCP configuration review

6 servers: docs, filesystem, github, postgres, remote-crm, shell.

| Severity | Server | Finding |
|---|---|---|
| high | github | GITHUB_PERSONAL_ACCESS_TOKEN holds an inline value (ghp***). Reference an environment variable or a secret manager instead. |
| high | remote-crm | Remote server over plain HTTP: http://crm.partner.example/mcp?*** |
| high | remote-crm | Credential in the URL query string, which ends up in logs |
| high | shell | Server exposes command execution to the model |
| medium | filesystem | Package "@modelcontextprotocol/server-filesystem" is fetched without a pinned version, so every start can run different code |
| medium | postgres | Image "mcp/postgres" is not pinned to a version or digest |
| medium | shell | Package "mcp-shell-runner" is fetched without a pinned version, so every start can run different code |
| low | filesystem | -y installs and runs the package without a prompt |
| low | github | -y installs and runs the package without a prompt |

Agent risk of this tool set: **high** (12).

- Log every tool call with its arguments and the user who triggered it.
- Assign an owner who answers for what the agent does.
- Run execution in an isolated environment with no inherited credentials.

_Static review only: no server was started. Pair with a runtime test such as mcp-red-team._
