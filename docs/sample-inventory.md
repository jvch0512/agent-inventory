# AI inventory: Costa Pay Services S.L. (fictional fintech)

7 systems: **1 prohibited**, **2 high-risk**, 2 with transparency duties, 2 minimal.

Key dates: prohibitions and AI literacy since 2025-02-02; general-purpose model duties since 2025-08-02; transparency (Art. 50) from 2026-08-02; high-risk Annex III from 2027-12-02; Annex I products from 2028-08-02.

| System | Owner | Tier | Agent risk | Open points |
|---|---|---|---|---|
| Call-centre mood monitor | Operations | prohibited | low (2) | - |
| Consumer credit scoring model | Risk | high-risk | low (3) | - |
| CV screening assistant | HR | high-risk | low (3) | - |
| Customer support chatbot | Support | transparency | medium (5) | - |
| Marketing copy and image generator | Marketing | transparency | low (0) | - |
| DevOps remediation agent | none | minimal | high (17) | no accountable owner |
| Email spam filter | IT | minimal | low (4) | - |

## Call-centre mood monitor

Tier: **prohibited**. Agent risk: **low** (2).

Why:

- Inferring emotions of people in the workplace or in education, except for medical or safety reasons (Art. 5(1)(f))

Obligations:

- AI literacy for staff who operate or use the system (Art. 4)
- Stop or redesign before use: prohibited practices carry the highest fines (Art. 99)

Risk drivers: +2 handles personal data.

Reduce the risk:

- Scope the agent's data access to what the task needs and record the lawful basis.

## Consumer credit scoring model

Tier: **high-risk**. Agent risk: **low** (3).

Why:

- Annex III (5) Access to essential services: public benefits, credit scoring, life and health insurance pricing, emergency triage

Obligations:

- AI literacy for staff who operate or use the system (Art. 4)
- Provider: risk management system, data governance, technical documentation, logging, transparency, human oversight, accuracy and robustness, quality management, conformity assessment, CE marking and registration (Arts. 8 to 17, 43, 47, 49)
- Deployer: use per instructions, assign competent human oversight, monitor, keep logs for at least six months, inform workers and affected people, run a fundamental rights impact assessment where required (Arts. 26, 27)

Risk drivers: +1 acts under supervision, +2 handles personal data.

Reduce the risk:

- Scope the agent's data access to what the task needs and record the lawful basis.

## CV screening assistant

Tier: **high-risk**. Agent risk: **low** (3).

Why:

- Annex III (4) Employment and workers management: recruitment, selection, promotion, termination, monitoring

Obligations:

- AI literacy for staff who operate or use the system (Art. 4)
- Deployer: use per instructions, assign competent human oversight, monitor, keep logs for at least six months, inform workers and affected people, run a fundamental rights impact assessment where required (Arts. 26, 27)
- Built on a general-purpose model: the model provider carries the Art. 53 and 55 duties (in force since 2025-08-02); you carry yours as provider or deployer of the system, and a substantial modification of the model can make you its provider

Risk drivers: +1 acts under supervision, +2 handles personal data.

Reduce the risk:

- Scope the agent's data access to what the task needs and record the lawful basis.

## Customer support chatbot

Tier: **transparency**. Agent risk: **medium** (5).

Obligations:

- AI literacy for staff who operate or use the system (Art. 4)
- Tell people they are interacting with an AI system unless it is obvious (Art. 50(1))
- Built on a general-purpose model: the model provider carries the Art. 53 and 55 duties (in force since 2025-08-02); you carry yours as provider or deployer of the system, and a substantial modification of the model can make you its provider

Risk drivers: +1 acts under supervision, +2 can write or change data, +2 handles personal data.

Reduce the risk:

- Scope the agent's data access to what the task needs and record the lawful basis.

## Marketing copy and image generator

Tier: **transparency**. Agent risk: **low** (0).

Obligations:

- AI literacy for staff who operate or use the system (Art. 4)
- Deployer: disclose deepfakes and AI-generated text published to inform the public (Art. 50(4))
- Built on a general-purpose model: the model provider carries the Art. 53 and 55 duties (in force since 2025-08-02); you carry yours as provider or deployer of the system, and a substantial modification of the model can make you its provider

## DevOps remediation agent

Tier: **minimal**. Agent risk: **high** (17).

Obligations:

- AI literacy for staff who operate or use the system (Art. 4)
- Built on a general-purpose model: the model provider carries the Art. 53 and 55 duties (in force since 2025-08-02); you carry yours as provider or deployer of the system, and a substantial modification of the model can make you its provider

Risk drivers: +3 acts autonomously, +3 can execute code or commands, +2 can write or change data, +1 can reach the network, +1 handles confidential data, +3 writes or executes without human approval, +2 no action logging, +2 no accountable owner.

Reduce the risk:

- Require human approval for write and execute actions, or limit them to a sandbox.
- Log every tool call with its arguments and the user who triggered it.
- Assign an owner who answers for what the agent does.
- Run execution in an isolated environment with no inherited credentials.

_Indicative classification from the answers in the inventory. A legal assessment is still needed for borderline cases._
