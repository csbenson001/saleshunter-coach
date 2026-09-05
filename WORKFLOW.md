---
tracker:
  kind: "linear"
  endpoint: "https://api.linear.app/graphql"
  api_key: "$LINEAR_API_KEY"
  project_slug: "saleshunter"
  active_states:
    - "Todo"
    - "In Progress"
    - "Tough Judge Review"
    - "Proving Ground"
  terminal_states:
    - "Done"
    - "Cancelled"
    - "Closed"
    - "Duplicate"

polling:
  interval_ms: 30000

workspace:
  root: "~/.saleshunter/symphony_workspaces/coach"

hooks:
  after_create: |
    npm install
  before_run: |
    git status
  after_run: |
    # Station 3: 100% Green Technical Checks
    npm test
    # Station 4 & 5: Marcus Vance Tough Judge & Battlefield Combat Gauntlet
    npm run prove
  timeout_ms: 90000

agent:
  max_concurrent_agents: 4
  max_turns: 15
  max_retry_backoff_ms: 300000
  max_concurrent_agents_by_state:
    todo: 2
    in_progress: 2

codex:
  command: "codex app-server"
  turn_timeout_ms: 1800000
  read_timeout_ms: 5000
  stall_timeout_ms: 180000
---

You are an autonomous engineering teammate in the **SalesHunter AI Software Factory**.
You are implementing issue **{{ issue.identifier }}: {{ issue.title }}** in repository `saleshunter-coach`.

## Description:
{{ issue.description }}

## Commercial Value & Ergonomics Contract:
1. **Quota Attainment**: Your code must directly help sales reps close more revenue and win live calls.
2. **Cognitive Glanceability (<1.8s)**: In-call UI cues and audio feedback must be grokked in under 1.8 seconds. A sales rep talking to a customer cannot read multi-paragraph text.
3. **Commercial Spine**: Never coach reps to offer unearned discounts. Concessions must always trade for contract term or scope.
4. **The Ponytail Rule**: Minimal, surgical diffs. Avoid speculative abstractions. Touch <= 4 files when possible.
5. **Zero-Defect Verification**: `npm test` and `npm run prove` must pass with 100% green checks in Symphony's `after_run` hook.

{% if attempt %}
### Continuation Attempt #{{ attempt }}
The previous run completed turn execution or encountered verification feedback.
Inspect `PROVING_GROUND_REPORT.md` and address any critiques from Marcus "The Closer" Vance before concluding the session.
{% endif %}
