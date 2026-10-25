"""
Automated unit and integration test suite for Agent37 Cloud API Service.
Tests:
1. Missing API credentials handling (transparent offline/disconnected status)
2. Invalid API credentials handling (HTTP 401 raises Agent37Error)
3. Instance reuse logic (avoids spinning up duplicate instances for each message)
4. Timeout and network error handling
5. Multi-turn conversation session ID propagation
6. Grounded context formatting and clinical safety rules
"""

import unittest
from unittest.mock import patch, MagicMock
import urllib.error
import io
import json

from backend.agent37_service import (
    is_configured,
    check_instance_health,
    get_or_create_instance,
    send_agent_message,
    get_agent37_status,
    build_system_instructions,
    Agent37Error,
    _cached_instance
)
from backend.chat_engine import process_chat_message


class TestAgent37Service(unittest.TestCase):

    def setUp(self):
        # Reset cached instance before each test
        _cached_instance["id"] = None
        _cached_instance["url"] = None
        _cached_instance["last_checked"] = 0
        _cached_instance["is_healthy"] = False

    def test_missing_credentials_status(self):
        """Verifies transparent disconnected status when AGENT37_API_KEY is unset."""
        with patch("backend.agent37_service.AGENT37_API_KEY", ""):
            self.assertFalse(is_configured())
            status = get_agent37_status()
            self.assertFalse(status["configured"])
            self.assertFalse(status["is_connected"])
            self.assertIn("AGENT37_API_KEY is not configured", status["message"])

            res = send_agent_message("Hello")
            self.assertEqual(res["status"], "disconnected")
            self.assertEqual(res["error"], "missing_credentials")
            self.assertFalse(res["is_connected"])

    def test_invalid_credentials_handling(self):
        """Verifies HTTP 401 from Agent37 Cloud API produces proper Agent37Error."""
        mock_err = urllib.error.HTTPError(
            url="https://api.agent37.com/v1/instances",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=io.BytesIO(b'{"error": "invalid_api_key", "message": "API key unrecognized"}')
        )

        with patch("backend.agent37_service.AGENT37_API_KEY", "sk_invalid_test_key"):
            with patch("urllib.request.urlopen", side_effect=mock_err):
                with self.assertRaises(Agent37Error) as ctx:
                    get_or_create_instance()
                self.assertEqual(ctx.exception.status_code, 401)
                self.assertIn("Invalid AGENT37_API_KEY", str(ctx.exception))

    def test_instance_reuse_avoids_duplicate_instances(self):
        """Verifies an active healthy instance is reused across subsequent queries."""
        _cached_instance["id"] = "inst_existing_123"
        _cached_instance["url"] = "https://inst_existing_123.agent37.app"
        _cached_instance["last_checked"] = 9999999999.0
        _cached_instance["is_healthy"] = True

        with patch("backend.agent37_service.AGENT37_API_KEY", "sk_live_valid"):
            inst_id, inst_url = get_or_create_instance()
            self.assertEqual(inst_id, "inst_existing_123")
            self.assertEqual(inst_url, "https://inst_existing_123.agent37.app")

    def test_timeout_and_network_error_handling(self):
        """Verifies URLError / timeout returns structured error without crashing."""
        mock_url_err = urllib.error.URLError("Connection timed out after 30s")

        with patch("backend.agent37_service.AGENT37_API_KEY", "sk_live_valid"):
            with patch("backend.agent37_service.get_or_create_instance", return_value=("inst_1", "https://inst_1.agent37.app")):
                with patch("urllib.request.urlopen", side_effect=mock_url_err):
                    res = send_agent_message("Interpret EC readings")
                    self.assertEqual(res["status"], "timeout_or_network_error")
                    self.assertFalse(res["is_connected"])
                    self.assertIn("Connection timed out", res["error"])

    def test_successful_agent_turn_and_session_continuity(self):
        """Verifies successful turn returns session_id, output_text, and status."""
        mock_response_payload = {
            "id": "resp_001a2b3c",
            "session_id": "sess_998877",
            "status": "completed",
            "output_text": "The quarter electrical conductivity of 6.2 mS/cm exceeds the 1.15x threshold.",
            "usage": {"input_tokens": 120, "output_tokens": 45}
        }

        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(mock_response_payload).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp

        with patch("backend.agent37_service.AGENT37_API_KEY", "sk_live_valid"):
            with patch("backend.agent37_service.get_or_create_instance", return_value=("inst_1", "https://inst_1.agent37.app")):
                with patch("urllib.request.urlopen", return_value=mock_resp):
                    res = send_agent_message("Explain conductivity", session_id=None)
                    self.assertEqual(res["status"], "success")
                    self.assertEqual(res["session_id"], "sess_998877")
                    self.assertIn("6.2 mS/cm", res["reply"])
                    self.assertEqual(res["provider"], "agent37_cloud")

    def test_clinical_safety_instructions(self):
        """Verifies system instructions strictly enforce pre-clinical boundaries."""
        instructions = build_system_instructions("Tag: GD-2024-001 Lakshmi, Status: subclinical_suspect", "en")
        self.assertIn("early screening aid, not a confirmed veterinary diagnosis", instructions.lower())
        self.assertIn("never invent a 7–14-day prediction", instructions.lower())
        self.assertIn("cannot independently prescribe medication", instructions.lower())
        self.assertIn("GD-2024-001", instructions)

    def test_chat_engine_routes_to_agent37_when_requested(self):
        """Verifies chat_engine routes to Agent37 and preserves session_id."""
        mock_a37_result = {
            "status": "success",
            "reply": "Agent37 analysis: Animal Lakshmi shows subclinical indicators.",
            "provider": "agent37_cloud",
            "instance_id": "inst_hermes_1",
            "session_id": "sess_live_123",
            "is_connected": True
        }

        with patch("backend.chat_engine.is_agent37_configured", return_value=True):
            with patch("backend.chat_engine.send_agent37_message", return_value=mock_a37_result):
                req = {
                    "message": "Summarize cow health",
                    "provider": "agent37",
                    "session_id": "sess_live_123"
                }
                res = process_chat_message(req)
                self.assertEqual(res["status"], "success")
                self.assertEqual(res["provider"], "agent37_cloud")
                self.assertEqual(res["session_id"], "sess_live_123")
                self.assertFalse(res["is_fallback"])


    def test_herd_action_planner_workflow_local_fallback(self):
        """Verifies herd action planner prioritizes animals, identifies triggers, and operates truthfully in fallback mode."""
        from backend.agent37_service import generate_herd_action_plan
        mock_animals = [
            {"id": "c1", "tag_id": "HFX-405", "name": "Lakshmi", "breed": "HF Cross", "status": "clinical_alert", "parity": 1, "lactation_stage": "Early"},
            {"id": "c2", "tag_id": "SAH-208", "name": "Kamdhenu", "breed": "Sahiwal", "status": "subclinical_suspect", "parity": 3, "lactation_stage": "Mid"},
            {"id": "c3", "tag_id": "GIR-104", "name": "Ganga", "breed": "Gir", "status": "healthy", "parity": 2, "lactation_stage": "Early"}
        ]
        mock_screenings = [
            {
                "animal_id": "c1", "animal_tag": "HFX-405", "screened_at": "2026-10-24T10:00:00Z",
                "electrical_conductivity": 6.8, "quarter": "RL", "scc_estimate": 800000,
                "compute_result": {"risk_score": 90, "max_quarter_differential_ratio": 1.40}
            },
            {
                "animal_id": "c2", "animal_tag": "SAH-208", "screened_at": "2026-10-24T08:00:00Z",
                "electrical_conductivity": 5.9, "quarter": "FL", "scc_estimate": 320000,
                "compute_result": {"risk_score": 55, "max_quarter_differential_ratio": 1.28}
            }
        ]
        with patch("backend.agent37_service.AGENT37_API_KEY", ""):
            plan = generate_herd_action_plan({"animals": mock_animals, "screenings": mock_screenings, "alerts": []})
            self.assertEqual(plan["status"], "success")
            self.assertEqual(plan["provider"], "local_rule_planner")
            self.assertTrue(plan["is_fallback"])
            self.assertEqual(plan["coverage"]["total_animals"], 3)
            self.assertEqual(plan["coverage"]["screened_count"], 2)
            # Prioritized animals should put Lakshmi (urgent) first, then Kamdhenu (high), then Ganga (routine)
            self.assertEqual(plan["prioritized_animals"][0]["tag_id"], "HFX-405")
            self.assertEqual(plan["prioritized_animals"][0]["urgency"], "urgent")
            self.assertEqual(plan["prioritized_animals"][1]["tag_id"], "SAH-208")
            self.assertEqual(plan["prioritized_animals"][1]["urgency"], "high")
            self.assertEqual(plan["prioritized_animals"][2]["tag_id"], "GIR-104")
            self.assertEqual(plan["prioritized_animals"][2]["urgency"], "routine")
            self.assertIn("HFX-405", plan["veterinary_review_summary"])

    def test_herd_action_planner_with_agent37_integration(self):
        """Verifies that when Agent37 is configured, the planner dispatches prompt and adopts Agent37 output."""
        from backend.agent37_service import generate_herd_action_plan
        mock_animals = [{"id": "c1", "tag_id": "SAH-208", "name": "Kamdhenu", "breed": "Sahiwal", "status": "subclinical_suspect"}]
        mock_screenings = [{
            "animal_id": "c1", "screened_at": "2026-10-24T12:00:00Z",
            "electrical_conductivity": 5.9, "quarter": "FL", "scc_estimate": 300000,
            "compute_result": {"risk_score": 50, "max_quarter_differential_ratio": 1.25}
        }]
        mock_a37_res = {
            "status": "success",
            "reply": "Agent37 Clinical Review: Follow up cow Kamdhenu before morning milking.",
            "provider": "agent37_cloud",
            "session_id": "sess_plan_1",
            "instance_id": "inst_1"
        }
        with patch("backend.agent37_service.is_configured", return_value=True):
            with patch("backend.agent37_service.send_agent_message", return_value=mock_a37_res):
                plan = generate_herd_action_plan({"animals": mock_animals, "screenings": mock_screenings, "alerts": []})
                self.assertEqual(plan["provider"], "agent37_cloud")
                self.assertFalse(plan["is_fallback"])
                self.assertEqual(plan["session_id"], "sess_plan_1")
                self.assertIn("Agent37 Clinical Review", plan["veterinary_review_summary"])


if __name__ == "__main__":
    unittest.main()
