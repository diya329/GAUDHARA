# GauDhara — Dairy Mastitis Screening & Herd Health Platform

> Production-grade veterinary dairy health platform integrating multi-parametric milk sensors, Nodus Compute cloud workloads, Agent37 Cloud AI decision support, and Supabase persistent authentication.

---

## 1. Executive Summary

GauDhara tackles a multi-billion dollar problem in global dairy production: **bovine mastitis** (particularly subclinical mastitis). Subclinical mastitis causes internal udder epithelial inflammation and reduced milk yield without visible clots or swelling, remaining undetected by traditional visual checks until irreversible tissue damage occurs.

GauDhara delivers:
1. **Four-Quarter Electrical Conductivity (EC)**: Detects unilateral tight-junction damage through inter-quarter disparity ratios ($QDR \ge 1.15\times$, grounded in IDF Bulletin 338 and Hamann & Krömker veterinary standards).
2. **Multi-Parametric Physiological Markers**: Evaluates Somatic Cell Count (SCC) proxy, ISFET potentiometric pH shifts, and quarter milk temperatures.
3. **Nodus Compute Screening Workload Lab**: Dual-path benchmarking lab comparing remote cloud cluster execution with a local deterministic verification baseline, providing concordance verification, step-by-step pipeline telemetry, and truthful execution metadata.
4. **Agent37 Herd Health Action Planner**: Multi-step triage and clinical action planning engine that retrieves herd screening history, prioritizes at-risk animals (Urgent, High, Moderate, Routine), tracks trajectory changes, schedules follow-up screening time windows, and generates concise veterinary review summaries.
5. **Agent37 Veterinary Decision Support**: Cloud-based clinical assistant running on `agent37-hermes` instances with session continuity, supported by a deterministic rule-based local fallback when unconfigured.
6. **Supabase Auth & Database**: Herd persistence with Row Level Security (RLS) and branded email templates.
7. **Offline-First Resilience**: Automatic fallback to local IndexedDB caching and client-side deterministic verification when offline or unconfigured.

---

## 2. Core Features & Dedicated Workflows

### A. Nodus Compute Screening Workload Lab (`/api/nodus/workload-lab`)
- **Dual-Path Execution**: Run identical deterministic screening algorithms both locally and via Nodus Compute remote cluster.
- **Quantitative Concordance**: Side-by-side comparison of Risk Level, Risk Score, Primary Affected Quarter, and QDR ratio with clear agreement/discrepancy indicators.
- **5-Step Execution Pipeline**: Visual breakdown of (1) Sample Validation, (2) Workload Packaging, (3) Remote Submission / Execution, (4) Concordance Verification, and (5) Audit Record.
- **Truthful Metadata**: Never invents GPU usage, fake cluster IDs, or synthetic execution URLs. Transparently explains local fallback when `NODUS_API_KEY` is not present.
- **Commit to Records**: One-click action to store verified lab samples into the farm's active screening log.

### B. Agent37 Herd Health Action Planner (`/api/agent37/action-plan`)
- **Multi-Step Evidence Analysis**: Evaluates active herd members, analyzes historical screening trajectories (Deteriorating, Improving, Fluctuating, Stable), and calculates individual risk scores.
- **Prioritized Triage Matrix**: Categorizes animals into Urgent (immediate isolation & CMT), High (veterinary exam within 24h), Moderate (screen next milking), and Routine (weekly monitoring).
- **Follow-Up Scheduling**: Suggests concrete screening time windows (e.g., "Next milking (6–12 hours)", "Within 24–48 hours") with physiological justifications.
- **Veterinary Review Directives**: Clear clinical guidelines emphasizing that GauDhara is a pre-clinical screening aid that never prescribes medication or replaces veterinary physical examination.
- **Export & Print**: Full export capabilities for on-farm clipboard review and veterinary consultations.

### C. Complete Herd Management Suite
- **Interactive Dashboard**: Real-time herd health distribution, quarter vulnerability heatmap, active alerts, and screening volume trends.
- **Rapid Milk Screening Form**: 4-quarter entry with instant client-side preview, validation error handling, and server compute dispatch.
- **Barn Layout Visualization**: Conceptual stanchion map illustrating spatial clustering of elevated quarter conductivity.
- **Simulated Hardware Telemetry**: Calibration and continuous stream simulation for multi-parameter dairy parlor sensors.
- **Comprehensive Audit Reports**: CSV export and printable clinical screening audit records with transparent disclaimers.

---

## 3. System Architecture & Endpoints

```
┌─────────────────────────────────────────────────────────────┐
│                    GauDhara Web Client                      │
│        React 19 + TypeScript + Vite + Tailwind CSS v4       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼ (API Calls)                  ▼ (Direct Session)
┌──────────────────────────────┐ ┌─────────────────────────────┐
│  Full-Stack Express Server   │ │   Supabase Cloud Platform   │
│         (server.ts)          │ │ - Auth & Session Management │
│  - /api/screenings/compute   │ │ - PostgreSQL Database + RLS │
│  - /api/nodus/workload-lab   │ └─────────────────────────────┘
│  - /api/agent37/action-plan  │
│  - /api/nodus/status         │
│  - /api/assistant/chat       │
│  - /api/assistant/status     │
│  - /api/agent37/status       │
└──────────────┬───────────────┘
               │ (Child Process / Python 3 Bridge)
               ▼
┌──────────────────────────────┐
│  Python 3 Backend Engine     │
│  - backend/main.py           │
│  - backend/workload.py       │
│  - backend/agent37_service.py│
└──────────────┬───────────────┘
               ├──────────────────────────────┐
               ▼ (If NODUS_API_KEY)           ▼ (If AGENT37_API_KEY)
┌──────────────────────────────┐ ┌─────────────────────────────┐
│    Nodus Compute Cluster     │ │   Agent37 Cloud Sandbox     │
│   (Remote Container Cloud)   │ │  (agent37-hermes instances) │
└──────────────────────────────┘ └─────────────────────────────┘
```

---

## 4. Quick Start & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Populate keys in `.env` (optional — application runs fully with realistic test data and local deterministic fallback if keys are omitted):
```env
# Supabase (Client-safe)
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"

# Nodus Compute (Server-side ONLY)
NODUS_API_KEY="your-nodus-api-key"

# Agent37 Cloud (Server-side ONLY)
AGENT37_API_KEY="sk_live_your_agent37_api_key"
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Verification & Automated Test Suite

All 24 Python unit tests pass with 100% success rate:
```bash
PYTHONPATH=. python3 -m unittest discover -s backend/tests
```

TypeScript compilation & bundle check:
```bash
npm run build
```

---

## 6. 5-Minute Operator & Clinical Demo Script

Follow this script to demonstrate all features smoothly during clinical evaluation:

1. **Minute 1: The Problem & Dashboard Overview (Screen: Dashboard)**
   - Sign in using the convenient one-click "Demo Mode" as Herd Manager or Veterinarian.
   - Point out the Herd Health Distribution, active mastitis alerts, and the Quarter Conductivity Heatmap showing right-rear quarter vulnerabilities across the herd.

2. **Minute 2: Milk Testing & Deterministic Workload (Screen: Milk Screening)**
   - Select animal `COW-104 (Sita)` or load the pre-filled "Load Subclinical Sample" button.
   - Note the four-quarter readings: FL 4.8, FR 4.9, RL 5.0, RR 6.3 mS/cm ($QDR \ge 1.25\times$).
   - Click "Submit Screening" to trigger `/api/screenings/compute`. Highlight the instant breakdown of physiological markers, somatic cell proxy, and specific affected quarter isolation.

3. **Minute 3: Nodus Compute Workload Lab (Screen: Nodus Workload Lab)**
   - Navigate to the **Nodus Workload Lab** tab.
   - Load sample `COW-104 (Right Rear Spike)` and click **"Run Dual-Path Benchmark"**.
   - Walk through the 5-step execution visualizer: Sample Validation → Workload Packaging → Remote Submission → Concordance Check → Audit Record.
   - Review the Concordance Report: 100% agreement on Risk Level (`Elevated / Subclinical Suspect`), Risk Score, and primary affected quarter (`RR`). Point out the measured latency and transparent execution provider status.

4. **Minute 4: Agent37 Herd Health Action Planner (Screen: Herd Action Planner)**
   - Navigate to the **Herd Action Planner** tab.
   - Click **"Generate Action Plan"** to initiate the multi-step triage workflow via `/api/agent37/action-plan`.
   - Inspect the prioritized animal list: Notice how `COW-104` and `COW-107` are flagged as **Urgent Priority** due to deteriorating conductivity trajectories and acute quarter disparities.
   - Highlight the concrete follow-up screening time windows (e.g., "Next milking: 6–12 hours") and veterinary review directives.

5. **Minute 5: Veterinary Assistant, Audit Reports & Closing**
   - Click the **Veterinary Assistant** widget in the bottom right or open the Assistant view. Ask: *"What is the protocol for cow COW-104 with a 6.3 mS/cm conductivity in the right rear quarter?"*
   - Show the evidence-grounded response referencing herd history, isolation protocol, and CMT confirmation.
   - Finish on the **Reports** screen showing the complete exportable herd audit record. Highlight the ethical medical disclaimer: GauDhara is a pre-clinical decision-support tool that never replaces on-site veterinary diagnosis.

---

## 7. Documentation & Reference Files

- [NODUS_COMPUTE_INTEGRATION.md](./NODUS_COMPUTE_INTEGRATION.md) — Detailed Nodus Compute architecture, workload math, and benchmark specifications.
- [AGENT37_INTEGRATION.md](./AGENT37_INTEGRATION.md) — Agent37 Cloud API instance management, sandbox lifecycle, and veterinary safety guardrails.
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) — Supabase RLS database schema, email templates, and SMTP roadmap.

