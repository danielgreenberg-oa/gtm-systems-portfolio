"""Behavioral checks for the selected Python excerpts."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT/path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


sequence = load("sequence", "artifacts/campaign-infrastructure/sequence-builder.py")
phase = load("phase", "artifacts/onboarding/phase-selection.py")


class Excerpts(unittest.TestCase):
    def test_variant_is_not_an_extra_cadence_step(self):
        steps = sequence.build_eb_steps(False, True)
        self.assertEqual([s["order"] for s in steps if not s.get("variant")], [1, 2])
        self.assertEqual(steps[2]["variant_from_step"], 1)

    def test_one_step_with_variant(self):
        steps = sequence.build_eb_steps(True, True)
        self.assertEqual(len(steps), 2)
        self.assertEqual([s["order"] for s in steps], [1, 1])

    def test_ready_parallel_phase_survives_blocked_gate(self):
        tasks = [{"phase": "infra", "status": "pending"}, {"phase": "research", "status": "pending"}]
        self.assertEqual(phase.detect_current_phase(tasks, ["infra", "research"],
                         {"infra": ("human", "approve")}), ("research", "run"))

    def test_all_remaining_work_waits_at_gate(self):
        self.assertEqual(phase.detect_current_phase([{"phase": "infra", "status": "pending"}],
                         ["infra"], {"infra": ("human", "approve")}), ("infra", "wait:approve"))


if __name__ == "__main__":
    unittest.main()
