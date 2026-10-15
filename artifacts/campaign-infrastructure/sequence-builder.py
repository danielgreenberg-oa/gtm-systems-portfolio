"""Adapted production source excerpt, E07. Pure configuration, no vendor calls.

The build_eb_steps algorithm is preserved. Private docstring references were removed;
body constants are replaced with visible synthetic template placeholders. The 14-day
value is the inspected source's configuration, not a universal recommendation.
"""
import json

BODY_TEMPLATE = "{EMAIL 1}"
BODY_TEMPLATE2 = "{EMAIL 2}"
BODY_TEMPLATE_B = "{EMAIL 1B}"


def build_eb_steps(is_one_step: bool, has_variant_b: bool = False) -> list[dict]:
    """Build cadence steps; an A/B variant shares the first step's order."""
    full = [
        {"email_subject": "{SL 1}", "email_body": BODY_TEMPLATE, "wait_in_days": 14, "order": 1},
        {"email_subject": "{SL 2}", "email_body": BODY_TEMPLATE2, "wait_in_days": 14, "order": 2},
    ]
    steps = full[:1] if is_one_step else full
    if has_variant_b:
        steps = steps + [{
            "email_subject": "{SL 1B}", "email_body": BODY_TEMPLATE_B,
            "wait_in_days": 14, "order": 1, "variant": True, "variant_from_step": 1,
        }]
    return steps


if __name__ == "__main__":
    print(json.dumps({"classification": "adapted source, synthetic templates",
                      "proposed_steps": build_eb_steps(False, True)}, indent=2))
