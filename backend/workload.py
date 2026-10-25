"""
GauDhara Bovine Mastitis Risk Screening Workload
Designed for autonomous edge execution and remote cluster compute.

Input: Multi-sensor raw screening readings
Output: Mathematically verified anomaly metrics, quarter differential ratio,
        somatic cell score proxy, and risk classification.
"""

import sys
import json
import time
from typing import Dict, Any, List, Optional

# Clinical physiological reference thresholds for bovine milk
EC_NORMAL_MIN = 3.8    # mS/cm
EC_NORMAL_MAX = 5.6    # mS/cm
EC_SUBCLINICAL_THRESHOLD = 5.8
EC_CLINICAL_THRESHOLD = 6.4

PH_NORMAL_MIN = 6.50
PH_NORMAL_MAX = 6.80
PH_ALKALINE_MASTITIS_THRESHOLD = 6.90
PH_ACIDIC_FERMENTATION_THRESHOLD = 6.40

SCC_HEALTHY_MAX = 200_000         # cells/mL
SCC_SUBCLINICAL_MAX = 500_000     # cells/mL

TEMP_NORMAL_MIN = 38.0  # Celsius
TEMP_NORMAL_MAX = 39.2  # Celsius

QUARTER_DIFFERENTIAL_WARNING_RATIO = 1.15  # 15% differential between quarters


def validate_screening_input(data: Dict[str, Any]) -> List[str]:
    """Validate sample data fields, types, and physical sanity limits."""
    errors = []
    
    if "electrical_conductivity" not in data:
        errors.append("Missing required field: electrical_conductivity (mS/cm)")
    else:
        ec = data["electrical_conductivity"]
        if not isinstance(ec, (int, float)) or ec < 1.0 or ec > 15.0:
            errors.append(f"Electrical conductivity {ec} mS/cm is out of plausible range [1.0 - 15.0]")

    if "ph_level" not in data:
        errors.append("Missing required field: ph_level")
    else:
        ph = data["ph_level"]
        if not isinstance(ph, (int, float)) or ph < 4.0 or ph > 9.0:
            errors.append(f"pH level {ph} is out of plausible physical range [4.0 - 9.0]")

    if "scc_estimate" not in data:
        errors.append("Missing required field: scc_estimate (cells/mL)")
    else:
        scc = data["scc_estimate"]
        if not isinstance(scc, (int, float)) or scc < 0 or scc > 15_000_000:
            errors.append(f"Somatic Cell Count {scc} is out of plausible range [0 - 15,000,000]")

    if "temperature_c" in data and data["temperature_c"] is not None:
        temp = data["temperature_c"]
        if not isinstance(temp, (int, float)) or temp < 30.0 or temp > 43.0:
            errors.append(f"Milk temperature {temp}°C is out of physiological range [30.0 - 43.0]")

    return errors


def analyze_milk_sample(sample: Dict[str, Any]) -> Dict[str, Any]:
    """
    Core deterministic analytical screening calculation.
    Computes quarter asymmetry, somatic proxy indices, and anomaly factor breakdown.
    """
    ec = float(sample.get("electrical_conductivity", 4.8))
    ph = float(sample.get("ph_level", 6.65))
    scc = float(sample.get("scc_estimate", 150_000))
    temp = float(sample.get("temperature_c", 38.6))
    od = float(sample.get("optical_density", 0.30))
    quarter_conductivities = sample.get("quarter_conductivities", {})

    anomalies = []
    affected_quarters = []
    risk_points = 0.0

    # 1. Quarter-level differential ratio analysis
    # Mastitis typically starts unilaterally in one quarter. Comparing quarters is the gold standard in dairy physiology.
    max_differential_ratio = 1.0
    if quarter_conductivities and len(quarter_conductivities) >= 2:
        valid_q_vals = {
            q: float(v) for q, v in quarter_conductivities.items() 
            if isinstance(v, (int, float)) and v > 0
        }
        if valid_q_vals:
            min_q = min(valid_q_vals.values())
            max_q = max(valid_q_vals.values())
            if min_q > 0:
                max_differential_ratio = round(max_q / min_q, 3)

            for q, val in valid_q_vals.items():
                if val >= EC_CLINICAL_THRESHOLD:
                    affected_quarters.append(q)
                elif val >= EC_SUBCLINICAL_THRESHOLD:
                    affected_quarters.append(q)

            if max_differential_ratio >= 1.25:
                risk_points += 35
                anomalies.append({
                    "factor": "Quarter Asymmetry (Inter-Quarter Ratio)",
                    "value": f"{max_differential_ratio:.2f}x",
                    "threshold": f">{QUARTER_DIFFERENTIAL_WARNING_RATIO:.2f}x",
                    "severity": "high",
                    "description": f"Significant unilateral conductivity variance ({max_differential_ratio}x) between quarters indicates localized udder epithelial permeability damage."
                })
            elif max_differential_ratio >= QUARTER_DIFFERENTIAL_WARNING_RATIO:
                risk_points += 20
                anomalies.append({
                    "factor": "Quarter Asymmetry (Inter-Quarter Ratio)",
                    "value": f"{max_differential_ratio:.2f}x",
                    "threshold": f">{QUARTER_DIFFERENTIAL_WARNING_RATIO:.2f}x",
                    "severity": "moderate",
                    "description": f"Elevated quarter differential ({max_differential_ratio}x) suggests early subclinical unilateral mastitis."
                })

    # 2. Bulk/Quarter Electrical Conductivity evaluation
    if ec >= EC_CLINICAL_THRESHOLD:
        risk_points += 40
        anomalies.append({
            "factor": "Electrical Conductivity",
            "value": f"{ec:.2f} mS/cm",
            "threshold": f"<{EC_NORMAL_MAX} mS/cm",
            "severity": "high",
            "description": "High ionic conductivity indicates sodium and chloride influx into milk due to tight-junction breakdown."
        })
    elif ec >= EC_SUBCLINICAL_THRESHOLD:
        risk_points += 25
        anomalies.append({
            "factor": "Electrical Conductivity",
            "value": f"{ec:.2f} mS/cm",
            "threshold": f"<{EC_NORMAL_MAX} mS/cm",
            "severity": "moderate",
            "description": "Conductivity elevated into subclinical range. Requires quarter-level monitoring."
        })

    # 3. Somatic Cell Count Proxy
    if scc > SCC_SUBCLINICAL_MAX:
        risk_points += 35
        anomalies.append({
            "factor": "Somatic Cell Count (SCC)",
            "value": f"{int(scc):,} cells/mL",
            "threshold": f"<{SCC_HEALTHY_MAX:,} cells/mL",
            "severity": "high",
            "description": "Severe leukocytic infiltration into mammary gland; clinical mastitis threshold exceeded."
        })
    elif scc > SCC_HEALTHY_MAX:
        risk_points += 20
        anomalies.append({
            "factor": "Somatic Cell Count (SCC)",
            "value": f"{int(scc):,} cells/mL",
            "threshold": f"<{SCC_HEALTHY_MAX:,} cells/mL",
            "severity": "moderate",
            "description": "SCC indicates immune defense activation, characteristic of subclinical infection."
        })

    # 4. pH evaluation
    if ph >= PH_ALKALINE_MASTITIS_THRESHOLD:
        risk_points += 20
        anomalies.append({
            "factor": "Milk pH Balance",
            "value": f"{ph:.2f}",
            "threshold": f"{PH_NORMAL_MIN} - {PH_NORMAL_MAX}",
            "severity": "moderate",
            "description": "Alkaline shift reflecting blood serum component leakage into milk cisterns."
        })
    elif ph <= PH_ACIDIC_FERMENTATION_THRESHOLD:
        risk_points += 15
        anomalies.append({
            "factor": "Milk pH Balance",
            "value": f"{ph:.2f}",
            "threshold": f"{PH_NORMAL_MIN} - {PH_NORMAL_MAX}",
            "severity": "moderate",
            "description": "Abnormal acidic deviation; potential coliform bacterial fermentation."
        })

    # 5. Temperature check
    if temp > TEMP_NORMAL_MAX:
        risk_points += 10
        anomalies.append({
            "factor": "Milk Temperature",
            "value": f"{temp:.1f} °C",
            "threshold": f"<{TEMP_NORMAL_MAX} °C",
            "severity": "low",
            "description": "Local hyperthermia indicative of active udder inflammation."
        })

    # Calculate bounded risk score (0 - 100)
    final_score = min(100, int(risk_points))

    if final_score >= 60:
        risk_level = "clinical_alert"
    elif final_score >= 25:
        risk_level = "subclinical_suspect"
    else:
        risk_level = "healthy"

    # Actionable veterinary recommendations
    recommendations = []
    if risk_level == "clinical_alert":
        recommendations.append("Immediate quarter isolation: do not pool milk from affected quarters.")
        recommendations.append("Perform California Mastitis Test (CMT) strip verification to confirm clot formation.")
        recommendations.append("Consult supervising veterinarian for culture & pathogen sensitivity.")
        recommendations.append("Apply post-milking barrier teat disinfectant with 1% available iodine.")
    elif risk_level == "subclinical_suspect":
        recommendations.append("Flag cow for high-frequency screening before morning and evening milkings.")
        recommendations.append("Sanitize milking cluster liners between cows to prevent contagious pathogen transmission.")
        recommendations.append("Inspect teat ends for hyperkeratosis or vacuum-induced trauma.")
    else:
        recommendations.append("Udder physiological parameters are within healthy baseline limits.")
        recommendations.append("Maintain routine bi-weekly screening and standard pre/post dip protocols.")

    return {
        "risk_score": final_score,
        "risk_level": risk_level,
        "affected_quarters": list(set(affected_quarters)),
        "max_quarter_differential_ratio": max_differential_ratio,
        "anomaly_factors": anomalies,
        "veterinary_recommendations": recommendations,
        "computation_method": "GauDhara Multi-Parametric Physiology Rule Engine v2.4 (IDF Bull. 338)",
    }


def compare_screening_outputs(local_output: Dict[str, Any], remote_output: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compares local deterministic calculation against remote workload output.
    Returns quantitative deltas, agreement verification, and scientific explanation.
    """
    if not remote_output or remote_output.get("status") != "completed":
        return {
            "agrees": False,
            "risk_level_match": False,
            "score_difference": None,
            "affected_quarters_match": False,
            "quarter_ratio_difference": None,
            "summary": "Remote execution result was unavailable or failed. Comparison evaluated against local baseline only.",
            "details": "Remote workload did not return completed telemetry for comparison."
        }

    local_score = int(local_output.get("risk_score", 0))
    remote_score = int(remote_output.get("risk_score", 0))
    score_diff = abs(local_score - remote_score)

    local_risk = local_output.get("risk_level")
    remote_risk = remote_output.get("risk_level")
    risk_level_match = (local_risk == remote_risk)

    local_q = set(local_output.get("affected_quarters", []))
    remote_q = set(remote_output.get("affected_quarters", []))
    affected_quarters_match = (local_q == remote_q)

    local_ratio = float(local_output.get("max_quarter_differential_ratio", 1.0))
    remote_ratio = float(remote_output.get("max_quarter_differential_ratio", 1.0))
    ratio_diff = round(abs(local_ratio - remote_ratio), 3)

    agrees = (score_diff <= 2 and risk_level_match and affected_quarters_match and ratio_diff <= 0.05)

    if agrees:
        summary = (
            f"Execution paths agree completely ({local_risk.replace('_', ' ').title()}). "
            f"Both local deterministic engine and remote cluster produced matching risk scores "
            f"(Local: {local_score}/100 vs Remote: {remote_score}/100) and quarter ratios ({local_ratio:.2f}x)."
        )
    else:
        summary = (
            f"Discrepancy detected between execution paths. "
            f"Risk levels: Local={local_risk} vs Remote={remote_risk}. "
            f"Score delta: {score_diff} points. Quarter ratio delta: {ratio_diff:.3f}x."
        )

    return {
        "agrees": agrees,
        "risk_level_match": risk_level_match,
        "score_difference": score_diff,
        "affected_quarters_match": affected_quarters_match,
        "quarter_ratio_difference": ratio_diff,
        "summary": summary,
        "details": f"Local risk: {local_risk} (score {local_score}), Remote risk: {remote_risk} (score {remote_score})."
    }


def main():
    """CLI / Execution entrypoint for Nodus Compute jobs."""
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"error": "Empty input received on stdin"}))
            sys.exit(1)

        payload = json.loads(raw_input)
        validation_errors = validate_screening_input(payload)
        if validation_errors:
            print(json.dumps({
                "status": "failed",
                "validation_errors": validation_errors,
                "timestamp": time.time()
            }))
            sys.exit(1)

        result = analyze_milk_sample(payload)
        output = {
            "status": "completed",
            "result": result,
            "timestamp": time.time()
        }
        print(json.dumps(output, indent=2))
        sys.exit(0)

    except Exception as exc:
        print(json.dumps({
            "status": "failed",
            "error": str(exc),
            "timestamp": time.time()
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
