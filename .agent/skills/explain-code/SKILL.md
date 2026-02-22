---
name: explain-code
description: >
  Use this skill when the user asks what any code does, wants something
  explained, says "I don't understand this", "what does this mean", "can you
  explain", "what is this file doing", or points to any file, function,
  error message, or terminal output and wants to understand it. Never assumes
  the user has any coding knowledge.
---

# Explain Code Skill

## Goal

Explain any code, file, error message, or terminal output to a complete
beginner in plain English. No jargon without an immediate definition. No
assumption of prior knowledge.

## Instructions

### Step 1 — Identify what needs explaining

The user will either:
- Point to a specific file (read it with the file tool)
- Paste a block of code directly into chat
- Share an error message or terminal output
- Ask about a specific concept they encountered

### Step 2 — Choose the right explanation level

Before explaining, read the conversation history to calibrate:
- If this is one of their first messages → assume zero coding knowledge
- If they have been building for a while → you can use slightly more
  technical terms, but still define them

### Step 3 — Explain using the Three-Layer method

**Layer 1 — The Analogy (always first)**
Start with a real-world analogy that requires no technical knowledge.

**Layer 2 — The Plain English Summary**
Explain what the code does in 2–4 sentences of plain English.

**Layer 3 — The Line-by-Line Walkthrough**
Go through the code section by section (not necessarily line by line).
For each section:
- Quote the relevant part
- Explain what it does in one or two sentences
- Explain WHY it is there (purpose, not just mechanics)

### Step 4 — Answer the implicit question

Most "explain this" requests have an underlying question. End your explanation
by answering what the user probably actually wants to know:
- Is this safe?
- Can I change this?
- What would happen if I deleted this?
- Why is it written this way and not another way?

If you are not sure what their implicit question is, ask: "Is there a specific
part you are most curious about?"

## Examples

### Example: Explaining a function

**User points to:**
```python
@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200
```

**Correct explanation:**
> Think of this like a doctor's receptionist. When the receptionist's phone
> rings with a special check-in call, they always answer with "Everything is
> fine here." That is exactly what this code does for your app.
>
> This creates a special page at the address `/health` on your website. When
> Google Cloud checks whether your app is still running (which it does
> automatically every few minutes), it visits this page. Your app responds
> with a short message saying "status: ok" — meaning "I am alive and healthy."
>
> The `200` at the end is a standard code that means "success" on the internet
> — the same way a thumbs-up means everything is fine.
>
> You should never change or delete this — Google uses it to decide whether
> to keep sending users to your app.

### Example: Explaining an error message

**User shares:**
```
ModuleNotFoundError: No module named 'flask'
```

**Correct explanation:**
> This error is like trying to open a door with a key that is not on your
> keyring. Your app needs a tool called "flask" to run, but Python cannot
> find it on your computer right now.
>
> This almost always means your virtual environment is not activated. The
> virtual environment is like the lunchbox where Flask is stored — if you
> do not open the lunchbox first, Python does not know where to look.
>
> To fix it, run this in your terminal:
> - Mac/Linux: `source venv/bin/activate`
> - Windows: `venv\Scripts\activate`
>
> You should see `(venv)` appear at the start of your terminal line. Then
> try running your app again.

## Constraints

- Never say "simply", "just", "obviously", or "easy"
- Always start with an analogy, even for short explanations
- Never end an explanation without confirming the user understands —
  finish with: "Does that make sense? Happy to dig into any part further."
- If the code contains a security problem, flag it clearly and kindly
  after the explanation: "One thing worth noting here: [issue]. Here is
  how we can fix that safely."
