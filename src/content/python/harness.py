"""Test harness for the Python playground's challenges.

The same file runs in two places, so a challenge is judged identically in both:

* in the browser (Pyodide), to run the learner's code against the tests;
* in CPython, by ``scripts/build-python-expected.py``, to work out each test's
  expected value from the reference solution.

A test is a Python expression (``count_status_codes(SAMPLE_LOG)``) evaluated in
the namespace the fixtures and the learner's code were run in. Its value is
normalised to plain JSON (tuples and sets become lists, numpy scalars become
numbers) so results compare the same way everywhere.
"""

import contextlib
import io
import json
import math
import traceback

MAX_OUTPUT = 4000


def __normalize(value):
    if isinstance(value, bool) or value is None or isinstance(value, (int, str)):
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return str(value)
        return value
    if isinstance(value, dict):
        return {str(key): __normalize(item) for key, item in value.items()}
    if isinstance(value, (set, frozenset)):
        items = [__normalize(item) for item in value]
        try:
            return sorted(items)
        except TypeError:
            return sorted(items, key=repr)
    if isinstance(value, (list, tuple)):
        return [__normalize(item) for item in value]
    # numpy and pandas scalars
    if hasattr(value, "item") and callable(value.item):
        try:
            return __normalize(value.item())
        except Exception:
            pass
    # pandas Series / DataFrame
    if hasattr(value, "to_dict") and callable(value.to_dict):
        try:
            return __normalize(value.to_dict())
        except Exception:
            pass
    return str(value)


def __short_traceback(error, filename):
    """The traceback without the harness's own frames."""
    frames = [
        frame for frame in traceback.extract_tb(error.__traceback__) if frame.filename == filename
    ]
    lines = [f'  line {frame.lineno}, in {frame.name}' for frame in frames[-3:]]
    message = f'{type(error).__name__}: {error}'
    return '\n'.join(lines + [message]) if lines else message


def __run_tests(code, fixtures, calls_json):
    """Runs fixtures, then the learner's code, then each test expression.

    Returns JSON: {"setupError": str|None, "output": str, "results": [{"value", "error", "output"}]}
    """
    namespace = {"__name__": "__challenge__"}
    calls = json.loads(calls_json)
    out = io.StringIO()
    setup_error = None
    try:
        exec(compile(fixtures, "<fixtures>", "exec"), namespace)
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            exec(compile(code, "<your code>", "exec"), namespace)
    except BaseException as error:  # noqa: BLE001 - report anything, including SystemExit
        setup_error = __short_traceback(error, "<your code>")

    results = []
    if setup_error is None:
        for call in calls:
            printed = io.StringIO()
            try:
                with contextlib.redirect_stdout(printed), contextlib.redirect_stderr(printed):
                    value = eval(compile(call, "<test>", "eval"), namespace)
                results.append(
                    {"value": __normalize(value), "error": None, "output": printed.getvalue()[:MAX_OUTPUT]}
                )
            except BaseException as error:  # noqa: BLE001
                results.append(
                    {
                        "value": None,
                        "error": __short_traceback(error, "<your code>"),
                        "output": printed.getvalue()[:MAX_OUTPUT],
                    }
                )
    return json.dumps(
        {"setupError": setup_error, "output": out.getvalue()[:MAX_OUTPUT], "results": results}
    )
