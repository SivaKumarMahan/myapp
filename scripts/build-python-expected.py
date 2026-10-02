"""Fills in each Python challenge test's `expected` value.

    npm run py:expected

Runs every reference solution through src/content/python/harness.py - the same
harness the browser uses - with CPython, and stores the value each test
expression returns. It also checks that each challenge's starter code does
NOT already pass, so no challenge is accidentally pre-solved.

Needs Python 3.10+ with pandas installed (for the two pandas challenges).
With --check it changes nothing and fails if a stored expected value is stale.
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / "src" / "content" / "python"
harness = {}
exec((ROOT / "harness.py").read_text(), harness)
run_tests = harness["__run_tests"]

data = json.loads((ROOT / "challenges.json").read_text())
CHECK = "--check" in sys.argv
problems = []
for challenge in data["challenges"]:
    calls = json.dumps([test["call"] for test in challenge["tests"]])
    outcome = json.loads(run_tests(challenge["solution"], challenge["fixtures"], calls))
    if outcome["setupError"]:
        problems.append(f"{challenge['id']}: solution failed to load:\n{outcome['setupError']}")
        continue
    for test, result in zip(challenge["tests"], outcome["results"]):
        if result["error"]:
            problems.append(f"{challenge['id']} / {test['name']}: {result['error']}")
        if CHECK and test.get("expected") != result["value"]:
            problems.append(f"{challenge['id']} / {test['name']}: stored expected value is stale")
        test["expected"] = result["value"]

    starter = json.loads(run_tests(challenge["starter"], challenge["fixtures"], calls))
    passing = [
        result["error"] is None and result["value"] == test["expected"]
        for test, result in zip(challenge["tests"], starter["results"])
    ]
    if not starter["setupError"] and all(passing):
        problems.append(f"{challenge['id']}: the starter code already passes every test")
    if not CHECK:
        print(f"{challenge['id']:24} {len(challenge['tests'])} tests")

if problems:
    print("\n".join(problems), file=sys.stderr)
    sys.exit(1)
if not CHECK:
    (ROOT / "challenges.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
