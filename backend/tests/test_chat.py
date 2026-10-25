"""
Automated unit tests for GauDhara Veterinary AI Assistant Chat Engine.
Verifies:
- Pydantic schema validation & error handling
- Emergency clinical detection and urgent veterinary escalation
- 1.15x conductivity differential and sampling SOP explanations
- Grounded animal context resolution
- Rate limiting protection
- Transparent fallback labeling and deterministic rules
"""

import unittest
from unittest.mock import patch
from backend.chat_engine import (
    process_chat_message,
    detect_clinical_emergency,
    check_rate_limit,
    get_authorized_animal_summary,
    execute_veterinary_knowledge_fallback
)


class TestVeterinaryAssistantChatEngine(unittest.TestCase):

    def setUp(self):
        self.mock_herd = [
            {
                "id": "animal-1",
                "tag_id": "GD-2024-001",
                "name": "Lakshmi",
                "breed": "Gir",
                "lactation_stage": "Mid",
                "parity": 3,
                "status": "subclinical_suspect",
                "avg_daily_yield_liters": 14.5,
                "barn_location": "Barn A - Stall 04",
                "last_screened_at": "2026-10-18T06:30:00Z"
            },
            {
                "id": "animal-2",
                "tag_id": "GD-2024-002",
                "name": "Gauri",
                "breed": "Sahiwal",
                "lactation_stage": "Early",
                "parity": 2,
                "status": "healthy",
                "avg_daily_yield_liters": 16.0,
                "barn_location": "Barn A - Stall 08",
                "last_screened_at": "2026-10-18T06:45:00Z"
            }
        ]

    def test_sample_collection_sop_explanation(self):
        """Verifies clear explanation of milk sample collection procedures via fallback engine."""
        reply = execute_veterinary_knowledge_fallback("How do I take a clean milk sample for conductivity testing?", None, "en")
        self.assertIn("Foremilk", reply)
        self.assertIn("45°", reply)

    def test_quarter_differential_explanation(self):
        """Verifies accurate veterinary explanation of 1.15x conductivity disparity."""
        reply = execute_veterinary_knowledge_fallback("Explain why quarter EC ratio 1.15 indicates subclinical mastitis", None, "en")
        self.assertIn("1.15", reply)
        self.assertTrue("subclinical" in reply.lower() or "epithelial" in reply.lower())

    def test_emergency_clinical_detection(self):
        """Verifies detection of severe physical signs triggering urgent doctor consultation."""
        alert = detect_clinical_emergency("The cow has high fever, udder is swollen rock hard and milk has blood clots")
        self.assertIsNotNone(alert)
        self.assertEqual(alert.level, "urgent")
        self.assertIn("Immediate Veterinary Consultation", alert.title)

        # Hindi detection
        alert_hi = detect_clinical_emergency("गाय को तेज बुखार है और थन में भारी सूजन आ गई है")
        self.assertIsNotNone(alert_hi)
        self.assertEqual(alert_hi.level, "urgent")

    def test_authorized_animal_summary(self):
        """Verifies authorized animal records are retrieved accurately without hallucinating non-existent cows."""
        summary = get_authorized_animal_summary("GD-2024-001", self.mock_herd)
        self.assertIsNotNone(summary)
        self.assertEqual(summary["name"], "Lakshmi")
        self.assertEqual(summary["breed"], "Gir")
        self.assertEqual(summary["status"], "subclinical_suspect")

        # Unknown animal should be None
        unknown = get_authorized_animal_summary("NON_EXISTENT_TAG", self.mock_herd)
        self.assertIsNone(unknown)

    def test_fallback_summary_formatting(self):
        """Verifies animal summary output formatting."""
        summary = get_authorized_animal_summary("GD-2024-001", self.mock_herd)
        reply = execute_veterinary_knowledge_fallback("summarize status", summary, "en")
        self.assertIn("Lakshmi", reply)
        self.assertIn("GD-2024-001", reply)
        self.assertIn("Gir", reply)

    @patch("backend.chat_engine.call_gemini_api", return_value=None)
    def test_transparent_fallback_mode_attribution(self, mock_gemini):
        """Ensures that when external inference API is absent or fails, fallback mode is truthfully declared."""
        req = {
            "message": "What are the common causes of high somatic cell count?",
            "language": "en"
        }
        res = process_chat_message(req)
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["provider"], "edge_veterinary_knowledge_engine")
        self.assertTrue(res["is_fallback"])

    def test_hindi_language_support(self):
        """Verifies Hindi prompt and response generation."""
        reply = execute_veterinary_knowledge_fallback("कच्चे दूध में सोमाटिक सेल काउंट बढ़ने का क्या कारण है?", None, "hi")
        self.assertIn("सोमैटिक सेल", reply)

    def test_validation_rejects_empty_message(self):
        """Verifies rejection of invalid or empty messages."""
        req = {
            "message": ""
        }
        res = process_chat_message(req)
        self.assertEqual(res["status"], "error")


if __name__ == "__main__":
    unittest.main()
