# RESUME: how any agent, on any machine, picks up this project

This project is built in many sessions, possibly across different machines and apps (Claude Code, Codex). Sessions may stop at any moment (token limit, crash, laptop closed).

Resuming works because **all state lives in files in this folder, never in chat history**:
- `PROGRESS.md`: where we are, what is in progress, what's next.
- `git log`: what was actually finished.
- `PLAN.md`: what to do.
- `AGENTS.md`: the rules.

## 1. Kickoff prompt (paste this into any new session)

```
You are working on the toronto-crime-analytics project in the current folder.
1. Read AGENTS.md (rules; non-negotiable), then RESUME.md §2 (resume protocol),
   then PROGRESS.md (state), then only the PLAN.md phase you are about to work on.
2. Follow the resume protocol in RESUME.md §2 exactly: check git status/log and the
   "In progress" field, reconcile any half-finished item, re-create the machine
   environment if this machine is new, then continue from "Next action".
3. Checkpoint as you go (RESUME.md §3): write-ahead the item you start, commit
   locally after each finished checklist item, and update PROGRESS.md.
4. If an open question in PROGRESS.md blocks the current phase, ask me before
   doing that work. Never git push, deploy, or delete anything without asking me.
Start now: tell me in 3 lines where the project stands and what you will do next,
then do it.
```

You can answer a blocking question in the same message by appending it, for example:
`Q5 answered: yes, install everything project-local.`

## 2. Resume protocol (every session, before any new work)
1. **Orient.** Read `PROGRESS.md`: Current phase, **In progress**, Next action, Blockers, Machine log.
2. **Check what really happened.** Run `git status` and `git log --oneline -15`.
   - The last commit tells you what is certainly finished.
   - Uncommitted changes, or an **In progress** entry, mean the previous session was interrupted mid-item.
3. **Reconcile the interrupted item** (if any):
   - Inspect the files listed under "In progress" and the diff.
   - If the work is complete and passes the item's acceptance check, commit it and tick it.
   - If it is partial, finish it or redo it. If it is broken, ask the user before discarding it (discarding counts as deletion).
   - Never assume an unchecked item is done because its files exist. Run its check.
4. **Machine check.** Compare `hostname` with the last row of the Machine log in PROGRESS.md. If this is a different machine or a fresh copy:
   - **Prerequisites:** check that R ≥ 4.5, Python 3.12+, Node ≥ 20, tectonic and git are present. **Do not install system tools yourself; ask the user.**
   - **Machine-specific folders don't transfer.** Re-create them with `make env` (or the P1 steps, if the Makefile doesn't exist yet): `.venv`, `.r-lib`, `web/node_modules`, `.cache`.
   - **Data:** rebuild with `make data`. If `_reference/` is missing, re-clone per PLAN.md P1.
   - Add a row to the Machine log.
5. **Continue** from "Next action". Before you start, write the item into **In progress** (§3).

## 3. Checkpoint rules (so an interruption loses at most one item)
- **Write-ahead.** Before starting a checklist item, set PROGRESS.md **In progress** to `<item> | started <date> | files: <paths> | machine: <hostname>`.
- **Finish small.** Split long items into sub-items of under about 30 minutes, and tick each one.
- **Commit after every finished item.** Make a local commit `P<n>: <item>` that includes the PROGRESS.md update (tick, clear In progress, set Next action). Commits are local only; pushing still needs the user's OK.
- **Long computations** (R re-runs, the P5 ablation):
  - run them as scripts that write outputs to files and can **resume from cached partial outputs** (one file per fold, model or bootstrap batch);
  - never run them as one monolithic in-memory job;
  - log the command in "In progress", so the next session can re-launch it.
- **Subagents** write their findings to files (`parity/`, `reviews/`, `results/`), never only in their reply.

## 4. Moving the project to another machine
Work on **one machine at a time**. Always carry the whole folder, including the hidden `.git/`, and continue on the newest copy only. Two diverging copies cannot be merged safely by AirDrop.

1. **On the machine you're leaving:**
   - Make sure the last item is committed and PROGRESS.md says what's next.
   - Create a transfer zip without the machine-specific folders:
     ```bash
     cd ~/Desktop && zip -rq toronto-crime-analytics.zip toronto-crime-analytics -x 'toronto-crime-analytics/.venv/*' 'toronto-crime-analytics/.r-lib/*' 'toronto-crime-analytics/web/node_modules/*' 'toronto-crime-analytics/.cache/*' 'toronto-crime-analytics/build/*' 'toronto-crime-analytics/data/interim/*'
     ```
2. AirDrop the zip, then unzip it on the new machine.
3. Open the folder in Claude Code or Codex and paste the §1 kickoff prompt. The resume protocol re-creates the environment.
4. **Optional, more robust:** once you OK a push (AGENTS.md rule 5), a **private** GitHub remote can replace AirDrop. Each machine then runs `git pull` before working and pushes after.

**Notes**
- `_reference/notes/` holds copies of the planning notes from `~/Desktop/Resume/resume_bank/`, so the folder is self-contained on any machine.
- Model results are bit-identical only on the same machine (PLAN.md §3.2). Record in the Machine log which machine produced `results/`. Don't regenerate committed model results on another machine unless the phase requires it.
- **Claude Code** reads `CLAUDE.md`, which imports `AGENTS.md`. **Codex** reads `AGENTS.md`. Both follow the same files, so you can switch apps between sessions.
