---
description: Commit and push only task-relevant changes safely
argument-hint: "[commit message or scope]"
---
Commit and push only changes relevant to current task.

Optional user guidance: $ARGUMENTS

Steps:
1. Inspect repo state:
   - `git status --short`
   - `git diff --stat`
   - `git diff`

2. Identify files changed by current task. Do not include unrelated user changes.

3. Run narrow verification for changed files using repo-preferred tools and local instructions.

4. Stage only task files:
   - `git add <specific files>`

5. Review staged diff:
   - `git diff --cached --stat`
   - `git diff --cached`

6. Commit with concise message. Prefer user-provided message/scope when supplied; otherwise use conventional style:
   - `git commit -m "<type>: <summary>"`

7. Push current branch:
   - `git push`

8. Final response must include:
   - commit hash
   - pushed branch
   - files committed
   - verification run
   - skipped/unrelated dirty files
