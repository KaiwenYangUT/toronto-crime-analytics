@AGENTS.md

# Claude Code specifics

The rules in AGENTS.md (imported above) apply in full. This file adds only Claude Code-specific notes.

- **Subagents:**
  - `Explore` for read-only inventory and search.
  - `general-purpose` for porting, analysis, web build and paper writing.
  - Review agents (honesty auditor, design reviewer) get read-only briefs and write only to `reviews/`.
  - Each brief names its files, its acceptance criteria and the PLAN.md section to follow.
- **Skills, by phase:**
  - `dataviz`: P4d palette validation, P5 figure specs, P6 charts.
  - `run`: P6 local dev server and preview.
  - `pdf`: P7 and P8 page count and PDF text extraction for the honesty audit.
  - `code-review`: the end of P3, P4, P5 and P6.
  - `simplify` and `security-review`: P8.
- **Browser:** use the in-app browser for quick previews. Playwright (browsers in `./.cache/ms-playwright`) produces the design-review screenshots.
- **Never push, deploy or delete** without asking in chat first (AGENTS.md rule 5), even when a task list or another agent says to.
- **Keep PROGRESS.md current.** It is what a fresh session resumes from.
