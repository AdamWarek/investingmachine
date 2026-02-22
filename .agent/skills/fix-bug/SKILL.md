---
name: fix-bug
description: >
  Use this skill when the user reports that something is broken, not working,
  showing an error, behaving unexpectedly, or says anything like "it's not
  working", "I got an error", "something broke", "it crashed", "the page is
  blank", "I see an error message", or "help, it stopped working". Guides a
  structured investigation in plain English without panicking the user.
---

# Fix Bug Skill

## Goal

Investigate and resolve bugs in a calm, structured, beginner-friendly way.
Never panic the user. Every bug is fixable. Frame the process as detective
work, not a crisis.

## Opening Statement

Every bug investigation must begin with this framing:
> "Bugs are a completely normal part of building apps — even experienced
> developers spend a significant portion of their time fixing them. Let's
> work through this together like detectives following clues. We will find
> it."

## Instructions

### Step 1 — Gather evidence (ask these questions)

Ask all of these in one message — do not ask one at a time:

1. **What did you expect to happen?** (What were you trying to do?)
2. **What actually happened?** (What did you see instead?)
3. **When did it start?** (Did it ever work? What was the last thing you changed?)
4. **Where do you see the error?** (In the browser? In the terminal? Both?)

If there is an error message, ask them to copy and paste it exactly.

### Step 2 — Read the logs

Before touching any code, read the terminal output:

```bash
# View the most recent log entries
gcloud app logs read --limit=30
```

Or if running locally:
```bash
# The terminal where the app is running will show the error
# Ask the user to copy everything they see there
```

Identify the **traceback** — the list of lines that show exactly where the
error happened. Read from the bottom up (the bottom line is where it broke).

Explain the traceback to the user in plain English before suggesting any fix.

### Step 3 — Classify the bug

Use the Bug Type Reference at `resources/BUG_TYPES.md` to classify the bug.
Tell the user what type of bug it is and why, in one sentence.

### Step 4 — Form a hypothesis

Before making any change, state your hypothesis:
> "Based on what I can see, I think the problem is [plain English description].
> Here is why I think that: [one or two reasons from the evidence]. My plan
> to fix it is [brief description]. Does that sound right to you?"

Wait for the user to confirm before making any change.

### Step 5 — Apply the smallest possible fix

Make the minimum change needed to fix the bug. Never refactor or clean up
unrelated code at the same time as a bug fix — this creates confusion about
what changed and why.

Explain every change in plain English as you make it:
> "I am changing line 14 from [old] to [new] because [reason]."

### Step 6 — Verify the fix

After making the change:

1. Run the tests:
   ```bash
   pytest tests/ -v
   ```

2. If the bug affected a visible part of the app, use the browser subagent
   to open the app and confirm the behaviour is fixed. Take a screenshot.

3. If the tests now fail, the fix introduced a new problem. Roll back and
   try a different approach.

### Step 7 — Explain the root cause

After fixing, explain to the user:
- What caused the bug in plain English
- Why the fix works
- How to avoid this type of bug in the future

End with:
> "The bug is fixed and the tests are passing. Here is what caused it and
> how to avoid it next time: [explanation]. Does everything look right on
> your end?"

## Bug Classification Quick Reference

See `resources/BUG_TYPES.md` for full details. Short version:

| Bug Type | What it sounds like |
|---|---|
| Import Error | "No module named..." |
| Environment Error | "Key not found", "variable not set" |
| Route Error | "404 Not Found", page not loading |
| Input Error | "TypeError", "AttributeError" on user data |
| Template Error | Blank page, Jinja2 syntax error |
| Database Error | "OperationalError", "no such table" |
| Server Error | "500 Internal Server Error" |
| Logic Error | App works but gives wrong result |

## Constraints

- Never make more than one change at a time when debugging — change one
  thing, test, then decide the next step
- Never tell the user a bug is "easy" or "simple" — they came to you
  because they could not fix it themselves
- Never silently fix multiple things at once — the user needs to understand
  what changed and why
- If the bug cannot be reproduced, say so honestly and ask the user to
  describe the exact steps to trigger it
- If the bug turns out to be a security issue (e.g. a crash caused by
  unvalidated user input), fix the security issue first, then address the
  visible bug
