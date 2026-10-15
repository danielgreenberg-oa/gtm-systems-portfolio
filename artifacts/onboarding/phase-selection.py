"""Adapted source excerpt, E02. Phase selection only, no provisioning.

Phases and gates are parameters instead of private module constants. Task completion
retains the inspected substring matching and treats skipped tasks as satisfied.
Those historical semantics require stable task naming; this is not a new task engine.
"""


def task_is_completed(tasks, agent_name, task_fragment):
    for task in tasks:
        if (task.get("agent_name") == agent_name
                and task_fragment.lower() in task.get("task_name", "").lower()
                and task.get("status") in ("completed", "skipped")):
            return True
    return False


def detect_current_phase(tasks, phases, gates):
    """Adaptation: count tasks by explicit phase field, retaining gate traversal."""
    waiting_phase = None
    waiting_reason = None
    for phase in phases:
        phase_tasks = [task for task in tasks if task.get("phase") == phase]
        completed = sum(task.get("status") in ("completed", "skipped") for task in phase_tasks)
        if not phase_tasks or completed >= len(phase_tasks):
            continue
        gate = gates.get(phase)
        if gate is None:
            return phase, "run"
        agent_name, task_fragment = gate
        if task_is_completed(tasks, agent_name, task_fragment):
            return phase, "run"
        if waiting_phase is None:
            waiting_phase, waiting_reason = phase, task_fragment
    if waiting_phase:
        return waiting_phase, f"wait:{waiting_reason}"
    return "complete", "complete"
