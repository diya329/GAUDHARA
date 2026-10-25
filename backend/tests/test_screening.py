"""
Automated validation and smoke tests for GauDhara screening analysis.
Covers:
- Valid healthy sample
- Unilateral quarter conductivity disparity (>1.15x)
- Severe clinical multi-parametric mastitis
- Invalid physical values (negative SCC, absurd pH)
- Edge case handling
"""

import unittest
from backend.workload import analyze_milk_sample, validate_screening_input


class TestScreeningWorkload(unittest.TestCase):

    def test_healthy_sample(self):
        sample = {
            "electrical_conductivity": 4.5,
            "quarter_conductivities": {"FL": 4.5, "FR": 4.4, "RL": 4.6, "RR": 4.5},
            "ph_level": 6.65,
            "scc_estimate": 120_000,
            "temperature_c": 38.6,
            "optical_density": 0.28
        }
        errors = validate_screening_input(sample)
        self.assertEqual(len(errors), 0)

        result = analyze_milk_sample(sample)
        self.assertEqual(result["risk_level"], "healthy")
        self.assertLess(result["risk_score"], 25)
        self.assertLess(result["max_quarter_differential_ratio"], 1.15)
        self.assertEqual(len(result["affected_quarters"]), 0)

    def test_unilateral_subclinical_quarter_disparity(self):
        # FL is elevated at 5.9 mS/cm while FR is normal at 4.6 mS/cm (ratio = 1.28x)
        sample = {
            "electrical_conductivity": 5.2,
            "quarter_conductivities": {"FL": 5.9, "FR": 4.6, "RL": 4.7, "RR": 4.6},
            "ph_level": 6.72,
            "scc_estimate": 280_000,
            "temperature_c": 38.8,
            "optical_density": 0.35
        }
        result = analyze_milk_sample(sample)
        self.assertIn("subclinical_suspect", [result["risk_level"], "clinical_alert"])
        self.assertGreaterEqual(result["max_quarter_differential_ratio"], 1.15)
        self.assertIn("FL", result["affected_quarters"])

    def test_clinical_mastitis(self):
        sample = {
            "electrical_conductivity": 6.8,
            "quarter_conductivities": {"FL": 7.2, "FR": 4.5, "RL": 5.0, "RR": 4.8},
            "ph_level": 7.10,
            "scc_estimate": 850_000,
            "temperature_c": 39.8,
            "optical_density": 0.58
        }
        result = analyze_milk_sample(sample)
        self.assertEqual(result["risk_level"], "clinical_alert")
        self.assertGreaterEqual(result["risk_score"], 60)
        self.assertTrue(any("Quarter Asymmetry" in a["factor"] for a in result["anomaly_factors"]))

    def test_invalid_input_validation(self):
        invalid_sample = {
            "electrical_conductivity": -2.0,  # Impossible negative
            "ph_level": 14.5,                 # Beyond chemical scale
            "scc_estimate": -500              # Negative count
        }
        errors = validate_screening_input(invalid_sample)
        self.assertGreaterEqual(len(errors), 3)


    def test_compare_screening_outputs_agreement(self):
        """Verifies concordant local and remote outputs are marked as agreeing."""
        from backend.workload import compare_screening_outputs
        local_out = {
            "risk_score": 42,
            "risk_level": "subclinical_suspect",
            "affected_quarters": ["FL"],
            "max_quarter_differential_ratio": 1.28
        }
        remote_out = {
            "status": "completed",
            "risk_score": 42,
            "risk_level": "subclinical_suspect",
            "affected_quarters": ["FL"],
            "max_quarter_differential_ratio": 1.28
        }
        comparison = compare_screening_outputs(local_out, remote_out)
        self.assertTrue(comparison["agrees"])
        self.assertTrue(comparison["risk_level_match"])
        self.assertEqual(comparison["score_difference"], 0)
        self.assertEqual(comparison["quarter_ratio_difference"], 0.0)

    def test_compare_screening_outputs_discrepancy(self):
        """Verifies divergent risk levels or score differences are flagged."""
        from backend.workload import compare_screening_outputs
        local_out = {
            "risk_score": 20,
            "risk_level": "healthy",
            "affected_quarters": [],
            "max_quarter_differential_ratio": 1.05
        }
        remote_out = {
            "status": "completed",
            "risk_score": 65,
            "risk_level": "clinical_alert",
            "affected_quarters": ["RL"],
            "max_quarter_differential_ratio": 1.35
        }
        comparison = compare_screening_outputs(local_out, remote_out)
        self.assertFalse(comparison["agrees"])
        self.assertFalse(comparison["risk_level_match"])
        self.assertEqual(comparison["score_difference"], 45)

    def test_workload_lab_execution_flow(self):
        """Verifies the 5-step workload lab pipeline executes and produces verifiable metadata."""
        from backend.main import process_workload_lab_request
        sample = {
            "electrical_conductivity": 5.2,
            "quarter_conductivities": {"FL": 5.9, "FR": 4.6, "RL": 4.7, "RR": 4.6},
            "ph_level": 6.70,
            "scc_estimate": 240000,
            "temperature_c": 38.6,
            "optical_density": 0.32
        }
        res = process_workload_lab_request({"sample": sample, "run_remote": False})
        self.assertEqual(res["status"], "completed")
        self.assertIsNotNone(res["local_result"])
        self.assertEqual(res["local_result"]["risk_level"], "subclinical_suspect")
        self.assertIsNotNone(res["execution_flow"])
        self.assertEqual(len(res["execution_flow"]), 5)
        self.assertEqual(res["execution_flow"][0]["step"], "validation")
        self.assertEqual(res["execution_flow"][0]["status"], "completed")


if __name__ == "__main__":
    unittest.main()
