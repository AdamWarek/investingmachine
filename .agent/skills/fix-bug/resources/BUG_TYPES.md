# Bug Type Reference

Use this guide to classify bugs before attempting a fix. Understanding
the type of bug tells you where to look and what to change.

---

## Import Error
**What you see:** `ModuleNotFoundError: No module named 'flask'`
**Plain English:** Python cannot find a package it needs.
**Where to look:** Is the virtual environment activated? Is the package
in `requirements.txt`? Was `pip install -r requirements.txt` run?
**Fix pattern:** Activate venv → `pip install -r requirements.txt`

---

## Environment / Configuration Error
**What you see:** `RuntimeError: SECRET_KEY is not set`, `KeyError`
**Plain English:** The app is looking for a value (like a secret key)
that has not been provided.
**Where to look:** `.env` file, `app.yaml`, environment variables.
**Fix pattern:** Add the missing value to `.env` for local, or Secret
Manager for production.

---

## Route Error (404)
**What you see:** "404 Not Found" in the browser
**Plain English:** The user visited a page that does not exist in the app.
**Where to look:** Is the URL spelled correctly? Does the route exist in
`app.py`? Is the route inside the right HTTP method (`GET` vs `POST`)?
**Fix pattern:** Check spelling → check `app.py` routes → check HTTP method

---

## Input Handling Error
**What you see:** `TypeError`, `AttributeError`, `NoneType has no attribute`
**Plain English:** The code tried to use data from the user but the data
was missing, empty, or in an unexpected format.
**Where to look:** Any route that reads from `request.json`, `request.form`,
or `request.args` without checking if the value exists first.
**Fix pattern:** Add validation before using user data:
```python
data = request.get_json(silent=True)
if not data or "field" not in data:
    abort(400, "Missing required field")
```

---

## Template / Rendering Error
**What you see:** Blank page, `jinja2.TemplateNotFound`, `UndefinedError`
**Plain English:** The HTML template file is missing, misspelled, or trying
to use a variable that was not passed to it.
**Where to look:** Does the template file exist in `templates/`? Is the
filename spelled exactly right (case-sensitive)? Was every variable used
in the template passed from the route function?
**Fix pattern:** Check filename → check `render_template()` call → check
variable names

---

## Database Error
**What you see:** `OperationalError: no such table`, `IntegrityError`
**Plain English:** Something went wrong with the database — usually the
table does not exist yet, or data being saved violates a rule.
**Where to look:** Was the database initialised? Was the migration run?
**Fix pattern:** Run database setup / migration commands

---

## Server Error (500)
**What you see:** "500 Internal Server Error" in the browser
**Plain English:** Something crashed inside the app. The browser shows
a generic error because the real error is hidden (correctly) in the logs.
**Where to look:** The terminal logs — the real traceback is there.
**Fix pattern:** Read logs → find traceback → fix the line that crashed

---

## Logic Error
**What you see:** No error message, but the app gives wrong results
**Plain English:** The code runs without crashing but does something
different from what was intended.
**Where to look:** The specific function or route that produces the wrong
output. Add `logger.info()` statements to trace the values at each step.
**Fix pattern:** Add logging → trace values → find where they diverge
from expectations → fix the logic

---

## Port / Server Not Running
**What you see:** "Connection refused", blank browser, "ERR_CONNECTION_REFUSED"
**Plain English:** The app is not running, or is running on a different
port than the browser is trying to connect to.
**Where to look:** Is the terminal showing the app is running? What port
is it on? Is the virtual environment active?
**Fix pattern:** Start the app → confirm the port in the terminal output →
visit the correct URL (`http://127.0.0.1:8080`)
