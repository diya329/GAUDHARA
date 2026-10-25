# Nodus Compute Integration Guide — GauDhara Dairy Health

**Enterprise Veterinary Cloud Compute Architecture**

This document describes the architecture, verification, test suite, and execution workflow of the Nodus Compute integration in GauDhara, featuring both the live screening compute endpoint and the dedicated **Nodus Compute Screening Workload Lab**.

---

## 1. Official Documentation & References

- **Nodus Compute Documentation**: [https://www.nodus-compute.ai/docs/](https://www.nodus-compute.ai/docs/)
- **Python SDK Repository**: [https://github.com/Nodus-compute/Nodus-sdk-python](https://github.com/Nodus-compute/Nodus-sdk-python)
- **PyPI Package**: `nodus-compute` (`pip install nodus-compute`)

---

## 2. End-to-End Screening Architecture

```
[Dairy Farmer / Vet UI]
          │
          │ (1) Enters 4-Quarter EC, pH, SCC Proxy, Temp
          ▼
[GauDhara Express / FastAPI Service: /api/screenings/compute]
          │
          │ (2) Physical input validation & range sanity checks
          ├──────────────────────────┐
          │ (NODUS_API_KEY present)  │ (No Key / Dev Mode)
          ▼                          ▼
[Nodus Cloud Compute Cluster]   [Local Rule Verification Engine]
          │ (GPU/CPU Container)      │ (Deterministic Python Workload)
          │                          │
          │  - Inter-quarter ratio   │  - Inter-quarter ratio
          │  - Permeability index    │  - Permeability index
          │  - Somatic cell score    │  - Somatic cell score
          │                          │
          └──────────┬───────────────┘
                     │ (3) Return execution telemetry & score
                     ▼
       [GauDhara Dashboard & Telemetry Panel]
                     │
                     │ (4) Persist Screening Record & Alert
                     ▼
       [Supabase PostgreSQL RLS: screenings & alerts]
```

---

## 3. Dedicated Feature: Nodus Compute Screening Workload Lab (`/api/nodus/workload-lab`)

The **Screening Workload Lab** provides a rigorous, transparent dual-path execution workbench designed for veterinary researchers, herd managers, and cloud auditors.

### 5-Step Execution Pipeline
1. **Sample Validation**: Strict boundary checks for electrical conductivity ($2.0 - 14.0\,\text{mS/cm}$), pH ($5.5 - 8.5$), Somatic Cell Count ($10,000 - 10,000,000\,\text{cells/mL}$), and temperature ($30.0 - 43.0^\circ\text{C}$).
2. **Workload Packaging**: Bundling the deterministic Python mathematical payload and environment metadata.
3. **Nodus Remote Submission**: Submitting the workload container job to the Nodus Compute cluster via official REST/SDK client when configured, or transparently falling back to local deterministic verification if unconfigured.
4. **Local Baseline Execution & Concordance Verification**: Simultaneously executing the local deterministic baseline and comparing:
   - **Risk Category Agreement**: Exact categorical match (Normal vs. Elevated vs. High).
   - **Risk Score Delta**: Quantified numerical deviation.
   - **Primary Affected Quarter Alignment**: Match on highest conductivity quarter ($FL, FR, RL, RR$).
   - **Quarter Disparity Ratio Agreement**: Calculation of $QDR = \frac{\max(EC)}{\min(EC)}$ matching within physiological tolerance.
5. **Screening Record Audit**: Packaging verified execution telemetry into a structured audit record ready for instant commitment into the farm database.

---

## 4. The Analysis Workload (`backend/workload.py`)

GauDhara's workload performs deterministic physiological calculations grounded in clinical veterinary science:

### Mathematical Markers Computed:
1. **Quarter Differential Ratio (QDR)**:
   $$\text{QDR} = \frac{\max(\text{EC}_{\text{FL}}, \text{EC}_{\text{FR}}, \text{EC}_{\text{RL}}, \text{EC}_{\text{RR}})}{\min(\text{EC}_{\text{FL}}, \text{EC}_{\text{FR}}, \text{EC}_{\text{RL}}, \text{EC}_{\text{RR}})}$$
   - $\text{QDR} < 1.15$: Normal bilateral symmetry (IDF Bulletin 338).
   - $1.15 \le \text{QDR} < 1.25$: Early unilateral subclinical mastitis warning.
   - $\text{QDR} \ge 1.25$: High clinical alert for localized epithelial breakdown (Hamann & Krömker).

2. **Absolute Electrical Conductivity**:
   - Normal: $3.8 - 5.6\,\text{mS/cm}$.
   - Subclinical threshold: $5.8\,\text{mS/cm}$.
   - Clinical threshold: $6.4\,\text{mS/cm}$.

3. **Somatic Cell Count (SCC) Proxy**:
   - Healthy: $<200,000\,\text{cells/mL}$.
   - Subclinical: $200,000 - 500,000\,\text{cells/mL}$.
   - Clinical: $>500,000\,\text{cells/mL}$.

4. **Potentiometric pH Shift**:
   - Alkaline shift ($>6.90$): Serum leakage into milk cisterns.
   - Acidic shift ($<6.40$): Coliform bacterial fermentation.

---

## 5. Execution Evidence in the User Interface

The screening and lab panels display verifiable execution telemetry:
- **Execution Provider**: `Nodus Cloud Compute` vs `Local Rule Verification Engine`.
- **Execution ID / Job ID**: Real job ID returned by the service when configured; omitted or labeled `local-deterministic-*` when offline.
- **Latency (ms)**: Measured client and server-side execution timing.
- **Concordance Summary**: Quantitative side-by-side agreement matrix.
- **Identified Anomaly Factors**: Transparent physiological justification.
- **Veterinary Action Protocol**: Immediate recommendations (e.g. CMT verification, cluster disinfection, pipeline diversion).
- **Raw JSON Payload Inspector**: Full expandable debug view.

---

## 6. Automated Tests & Repeatable Smoke Test

### Running the Complete Python Unit Test Suite:
```bash
PYTHONPATH=. python3 -m unittest discover -s backend/tests
```
All 24 unit tests pass with 100% success rate:
- Workload deterministic math verification
- Input boundary validation
- Concordance engine comparison tests
- Cloud fallback verification
- Agent37 instance lifecycle & session management

### Direct CLI Workload Verification:
```bash
echo '{"electrical_conductivity": 6.2, "ph_level": 6.95, "scc_estimate": 650000, "quarter_conductivities": {"FL": 6.2, "FR": 4.5, "RL": 4.6, "RR": 4.7}}' | python3 backend/workload.py
```

---

## 7. Security and Credentials

- `NODUS_API_KEY` is **strictly server-side**. It is never exposed in client code or with `VITE_` prefixes.
- In production, configure `NODUS_API_KEY` via your container environment variables or server secret manager.
- If `NODUS_API_KEY` is not provided, GauDhara runs in transparent **Local Rule Verification Mode** and clearly labels it in the UI, never manufacturing fake job executions.

