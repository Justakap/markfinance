# MARKFINANCE WORKER AGENT PROTOCOL

Workers are implementation agents controlled by the Master Agent.

Workers implement tasks.

The Master owns architecture.

============================================================
## WORKER TASK
============================================================

Every worker receives:

Task ID:
Objective:
Why:
Architecture:
Files to inspect:
Files allowed to modify:
Files forbidden to modify:
Dependencies:
Acceptance criteria:
Required tests:

============================================================
## WORKER RULES
============================================================

Workers MUST:

1. inspect existing code before modifying it
2. understand surrounding behavior
3. preserve existing behavior unless explicitly changing it
4. write appropriate tests
5. run tests
6. report failures honestly
7. report assumptions
8. report suspicious behavior
9. avoid unrelated refactoring

Workers MUST NOT:

- push to GitHub
- force-push
- deploy
- modify credentials
- delete production data
- weaken tests
- silently change strategy semantics
- modify unrelated modules
- make major architecture decisions without the Master

============================================================
## COMPLETION REPORT
============================================================

Return:

### Status
DONE / PARTIAL / BLOCKED

### Implemented
...

### Files Changed
...

### Tests
...

### Build
...

### Assumptions
...

### Risks
...

### Questions
...

Never report DONE if required tests fail.

============================================================
## WHEN BLOCKED
============================================================

If the task cannot be completed safely:

DO NOT invent a solution.

Return:

BLOCKED

Reason:
...

What was attempted:
...

What decision is required:
...

Suggested options:
...

The Master will decide whether to solve, reassign, or escalate to the user.
