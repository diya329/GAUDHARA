# Agent37 Cloud API Integration — GauDhara Dairy Health

This document describes the production-grade integration of **Agent37 Cloud API** (https://www.agent37.com/docs) into GauDhara for bovine mastitis screening interpretation, herd-health auditing, clinical decision support, and the dedicated **Herd Health Action Planner**.

---

## 1. Architectural Overview

Agent37 Cloud provides persistent cloud sandboxes and agents. In GauDhara, Agent37 runs on the official `agent37-hermes` template serving an agentic chat and workflow API over HTTPS (`https://{instanceId}.agent37.app/v1/responses`).

```
┌────────────────────────────────────────────────────────┐
│               GauDhara React Frontend                  │
│  - Herd Health Action Planner View                     │
│  - Veterinary Assistant View & Compact Chat Widget     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP (Bearer Session / Cookie)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Full-Stack Server & Engine                │
│            (Express / FastAPI / Python 3)              │
│  - Input Validation & Rate Limiter Gate                │
│  - Authorized Herd Context & Screening History Filter  │
│  - /api/agent37/action-plan Workflow Engine            │
│  - /api/assistant/chat Multi-Turn Router               │
│  - In-Memory Instance Cache & Health Monitor           │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS (X-Agent37-Key / Authorization: Bearer)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Agent37 Cloud API                     │
│               https://api.agent37.com/v1               │
│  - POST /v1/instances (create sandbox)                 │
│  - GET  /v1/health (readiness check)                   │
│  - POST /v1/responses (turn execution)                 │
│  - Session ID multi-turn context reuse                 │
└────────────────────────────────────────────────────────┘
```

---

## 2. Dedicated Feature: Herd Health Action Planner (`/api/agent37/action-plan`)

The **Herd Health Action Planner** performs a structured, multi-step veterinary workflow:

### Multi-Step Execution Flow
1. **Evidence Retrieval**: Gathers authorized herd profiles and the latest 3 screening records per animal.
2. **Deterministic Triage & Trajectory Analysis**:
   - Compares previous vs. latest electrical conductivity, SCC proxy, and potentiometric pH.
   - Calculates trajectory: `Deteriorating`, `Improving`, `Fluctuating`, or `Stable`.
   - Prioritizes into 4 clinical urgency tiers:
     - **Urgent Priority**: Immediate isolation, physical palpation, and California Mastitis Test (CMT).
     - **High Priority**: Examination within 24 hours, pre-dip protocol audit.
     - **Moderate Priority**: Rescreening at next scheduled milking (6–12 hours).
     - **Routine**: Weekly herd monitoring.
3. **Agent37 Evidence Synthesis**: Submits the sanitized clinical evidence dossier to the Agent37 instance for nuanced narrative synthesis, veterinary review points, and operational guidance.
4. **Follow-Up Scheduling**: Formulates specific time windows with concrete physiological rationales.
5. **Transparent Fallback**: When unconfigured or offline, immediately generates an evidence-grounded, deterministic local clinical report with clear provider labeling (`local_fallback`).

---

## 3. Security & Credential Protection

- **Backend-Only Secret**: `AGENT37_API_KEY` is strictly managed in backend server environment variables.
- **Zero Frontend Leakage**: The key is never prefixed with `VITE_`, never bundled into client scripts, never exposed in browser requests, and never committed to source control.
- **Client Status Transparency**: The frontend calls `/api/agent37/status` and `/api/assistant/status` which report boolean status (`configured: true/false`, `is_connected: true/false`), instance ID, and active template without disclosing any secret token.

---

## 4. Instance Reuse Strategy

Creating a new instance for every single request incurs unnecessary charges and startup latency. GauDhara implements instance caching:
1. **Pre-Configured Instance**: If `AGENT37_INSTANCE_URL` or `AGENT37_INSTANCE_ID` is set in `.env`, it is verified via `GET /v1/health` and reused.
2. **Automatic Instance Discovery**: Before provisioning, the backend checks `GET /v1/instances` for existing running `agent37-hermes` instances in the workspace.
3. **Provisioning on Demand**: If no active instance exists, a single instance is created via `POST /v1/instances` with a safety budget (`"budget": {"credit_micros": 1000000}`) and cached.
4. **Session Continuity**: Multi-turn conversations track `session_id` on the client and pass it to `/v1/responses`, ensuring the agent retains context across queries without re-sending full history.

---

## 5. Clinical Safety & Veterinary Guardrails

Per veterinary standards, the system prompt and fallback engine strictly enforce:
1. **Grounded Context**: Only authorized herd screening records and sensor readings belonging to the authenticated user are passed to the agent.
2. **Pre-Clinical Distinction**: Explicitly identifies GauDhara as an early screening aid, never a definitive on-site physical veterinary diagnosis.
3. **No Unvalidated Forecasts**: Prohibits inventing 7–14-day predictions or claiming validated predictive models without empirical backing.
4. **No Unauthorized Prescriptions**: The agent cannot prescribe prescription drugs, modify medical records, or delete farm data.
5. **Emergency Triage**: Automatically flags acute clinical mastitis markers (fever >39.5°C, hard hot quarters, blood/clots in milk, anorexia, recumbency) and issues urgent alerts to contact a licensed veterinarian.

---

## 6. Verification & Testing Suite

All 24 Python unit tests pass with 100% success rate:
```bash
PYTHONPATH=. python3 -m unittest discover -s backend/tests
```
Covering:
- Missing credential detection and transparent offline fallback
- Invalid credential rejection (HTTP 401 handling)
- Instance reuse verification
- Timeout and network error resiliency
- Grounded animal context resolution
- 1.15x electrical conductivity ratio and sampling SOP validation
- Emergency clinical triage detection
- Herd Action Plan triage categorization and trajectory tracking

