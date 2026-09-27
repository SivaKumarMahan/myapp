import type { InterviewQuestion } from '../../../types'

/** Core language: data structures, copying, scope, modules, decorators, OOP, typing and pandas. */
export const myPythonFundamentalsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mypy-14',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a list, tuple, set, and dictionary?',
    probing:
      'Whether you know mutability, ordering, uniqueness and hashability, and choose a structure by what the data means.',
    answer: [
      '- A **list** is ordered and can change. Use it for a sequence that grows or shrinks.\n- A **tuple** is ordered but fixed once created. Use it for a fixed record, or when you need a hashable composite value.\n- A **set** stores unique values and is fast for checking membership.\n- A **dictionary** maps unique keys to values and keeps insertion order in current Python versions.',
      "I pick based on what the data actually means, not just syntax. A set removes duplicates, but it doesn't represent an order that matters to the business. A dictionary makes a named lookup clearer than relying on list positions.",
      '**List vs tuple in detail.** Lists and tuples are both ordered collections, and both can hold mixed types. The main difference between them is whether you can change them after creation.',
      "- **List**: mutable - items can be added, removed, or replaced; written with `[]`; has mutating methods such as `append()`, `extend()`, and `remove()`; good for a collection that changes over time; not hashable.\n- **Tuple**: immutable - once created, its items can't be swapped out; usually written with `()`; has fewer methods, since there's nothing to mutate; good for a fixed record, or an interface that shouldn't change; can be hashable, if everything inside it is hashable too.",
      'Being "immutable" only applies to the tuple\'s own slots. It doesn\'t reach inside. A tuple can hold a list, and that list can still be changed freely.',
    ],
    code: [
      {
        title: 'One of each',
        language: 'python',
        code: `servers = ["web1", "web2"]
endpoint = ("db.internal", 5432)
regions = {"centralindia", "eastus"}
ports = {"http": 80, "https": 443}`,
      },
      {
        title: 'List vs tuple',
        language: 'python',
        code: `topics = ["Python", "Linux", "Kubernetes"]
topics.append("Terraform")

coordinates = (17.3850, 78.4867)

print(topics)
print(coordinates)`,
      },
    ],
    traps: ['A tuple is immutable only in its own slots - a list inside a tuple can still change.'],
    tags: ['python', 'data structures'],
  },
  {
    id: 'itv-mypy-15',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between a shallow copy and a deep copy?',
    probing:
      'Whether you understand references to nested objects, and that assignment copies nothing.',
    answer: [
      'A shallow copy makes a new outer object, but the objects nested inside it are still shared with the original. A deep copy rebuilds everything inside, recursively, so nothing is shared.',
      "Assignment like `second = original` doesn't copy anything at all; both names point to the exact same object. A list slice or `list.copy()` gives you a shallow copy.",
      "Deep copies can be expensive, and they don't make sense for things like sockets, locks, or database connections. I only reach for one when I genuinely need independent nested state, and often I'd rather use an immutable value or build the fields I need explicitly instead.",
    ],
    code: [
      {
        title: 'copy vs deepcopy',
        language: 'python',
        code: `import copy

original = [[1, 2], [3, 4]]
shallow = copy.copy(original)
deep = copy.deepcopy(original)

shallow[0].append(99)
print(original)  # [[1, 2, 99], [3, 4]] because inner list is shared

deep[1].append(88)
print(original)  # unchanged by the deep-copy modification`,
      },
    ],
    traps: ["Assignment (`second = original`) doesn't copy anything; both names share one object."],
    tags: ['python', 'copy', 'references'],
  },
  {
    id: 'itv-mypy-16',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain local, nonlocal, and global variables in Python.',
    probing: 'Whether you know LEGB lookup and why UnboundLocalError happens without nonlocal.',
    answer: [
      'Python looks up names using LEGB order: Local, Enclosing, Global, Built-in.',
      '- A local variable belongs to the current function.\n- `nonlocal` lets a nested function change a variable that belongs to the function wrapping it.\n- `global` lets a function change a variable that lives at the module level.',
      'Without `nonlocal count`, the line `count += 1` would try to create a brand-new local `count` before it has a value, and Python raises `UnboundLocalError`. I avoid mutable global state in general, because it makes tests, concurrency, and just reasoning about the code harder.',
      'Passing arguments, returning values, using closures, or using a class instance is usually clearer. `nonlocal` earns its place in small closures like counters or decorators.',
    ],
    code: [
      {
        title: 'Closure counter with nonlocal',
        language: 'python',
        code: `application_name = "orders"       # Global/module scope


def create_counter():
    count = 0                       # Enclosing scope

    def increment() -> int:
        nonlocal count
        count += 1
        return count

    return increment


counter = create_counter()
print(counter())  # 1
print(counter())  # 2`,
      },
    ],
    tags: ['python', 'scope', 'closures'],
  },
  {
    id: 'itv-mypy-17',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a module, package, and library?',
    probing:
      'Whether you can separate the import system concepts from the loose term "library" and from pip distributions.',
    answer: [
      "- A **module** is a single importable Python file, for example `validators.py`.\n- A **package** is an importable directory that groups modules and subpackages together. Traditional packages contain `__init__.py`; namespace packages can skip it.\n- A **library** is a general term for reusable code, and it can hold one or many packages and modules. It isn't a separate syntax feature in Python.",
      "`pip` installs a distribution package from a package index, while `import` loads an import package or module. Their names don't have to match.",
      'For a library I plan to publish, I define metadata and dependencies in `pyproject.toml`, use a virtual environment, pin or lock the dependencies, test the public API, and avoid circular imports or heavy work happening just from importing the module.',
    ],
    code: [
      {
        title: 'Library layout',
        language: 'text',
        code: `inventory_library/
├── pyproject.toml
└── src/
    └── inventory/
        ├── __init__.py
        ├── client.py
        └── validators.py`,
      },
      {
        title: 'Importing from the package',
        language: 'python',
        code: `from inventory.client import InventoryClient
from inventory import validators`,
      },
    ],
    tags: ['python', 'packaging', 'modules'],
  },
  {
    id: 'itv-mypy-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is a decorator in Python?',
    probing:
      'Whether you can write a decorator correctly with functools.wraps and forward arbitrary arguments.',
    answer: [
      "A decorator is a callable that takes a function or class and returns a wrapped or modified version of it. It adds reusable behavior without touching the original function's body. Common uses are authorization, logging, timing, caching, retries, and route registration. The `@decorator` syntax applies it.",
      "`@wraps` keeps the original function's name, docstring, and other metadata intact, which helps debugging and any framework that inspects the function. A decorator that takes its own arguments just adds one more outer function layer.",
      'The wrapper takes `*args` and `**kwargs` so it can forward calls no matter what arguments the original function expects.',
      'For async functions, the wrapper needs to be async too, and it needs to `await` the original call. I never log arguments blindly, in case one of them is sensitive.',
    ],
    code: [
      {
        title: 'Timing decorator',
        language: 'python',
        code: `from functools import wraps
from time import perf_counter


def measure_time(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        start = perf_counter()
        try:
            return function(*args, **kwargs)
        finally:
            duration = perf_counter() - start
            print(f"{function.__name__} took {duration:.4f}s")

    return wrapper


@measure_time
def add(left: int, right: int) -> int:
    return left + right


print(add(2, 3))`,
      },
      {
        title: 'Typed audit decorator',
        language: 'python',
        code: `from collections.abc import Callable
from functools import wraps
from typing import Any


def audit_call(func: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        print(f"Calling {func.__name__}")
        result = func(*args, **kwargs)
        print(f"Completed {func.__name__}")
        return result

    return wrapper


@audit_call
def say_hello(name: str) -> str:
    return f"Hello, {name}!"


print(say_hello("Momen"))`,
      },
    ],
    tags: ['python', 'decorators'],
  },
  {
    id: 'itv-mypy-19',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a Python list and an array?',
    probing:
      'Whether you know list vs array.array vs NumPy and the memory and speed trade-offs between them.',
    answer: [
      'A Python list is a general-purpose sequence. It stores references to objects and can hold mixed types. `array.array` stores values of a single basic type more compactly.',
      'A NumPy array is a separate third-party structure built for uniform, multi-dimensional numeric data and vectorized math.',
      'Lists work best for ordinary collections that hold rich object values. Typed arrays use less memory for large sequences of plain numbers, and NumPy is normally much faster for bulk numeric work, since the operations run in optimized native code instead of a Python loop.',
      "Both lists and these arrays keep their order and can be changed. Indexing is roughly `O(1)`, but inserting near the start requires shifting everything else, so that's `O(n)`.",
    ],
    code: [
      {
        title: 'list vs array.array',
        language: 'python',
        code: `from array import array

items = [1, "two", 3.0]          # Mixed Python objects are allowed.
numbers = array("i", [1, 2, 3])  # Signed integers only.`,
      },
    ],
    tags: ['python', 'data structures', 'numpy'],
  },
  {
    id: 'itv-mypy-20',
    level: 'basic',
    kind: 'open',
    prompt: 'What is slicing in Python?',
    probing: 'Whether you know start/stop/step semantics, negative indexes, and that slices copy.',
    answer: [
      'Slicing pulls out part of a sequence with `sequence[start:stop:step]`. The start index is included, the stop index is excluded, and any value you leave out uses a sensible default. Negative indexes count from the end.',
      'For a regular list, a slice creates a new outer list, but the objects inside it are still shared with the original. String and tuple slices also produce new sequences.',
      "A step of zero raises `ValueError`. A large slice uses memory proportional to its size, so for a big iterable I'd rather stream it with something like `itertools.islice`.",
    ],
    code: [
      {
        title: 'Slice examples',
        language: 'python',
        code: `values = [10, 20, 30, 40, 50, 60]

print(values[1:4])    # [20, 30, 40]
print(values[:3])     # [10, 20, 30]
print(values[3:])     # [40, 50, 60]
print(values[-2:])    # [50, 60]
print(values[::2])    # [10, 30, 50]
print(values[::-1])   # [60, 50, 40, 30, 20, 10]`,
      },
    ],
    tags: ['python', 'slicing'],
  },
  {
    id: 'itv-mypy-21',
    level: 'basic',
    kind: 'open',
    prompt: 'What does it mean that Python is dynamically typed?',
    probing:
      'Whether you can separate dynamic vs static typing from strong vs weak typing, and know how to catch type errors early.',
    answer: [
      'Typing is about how a language connects values and operations to data types. Python is dynamically typed, which means type checks happen while the program runs, not before. A variable name can point to one type of value now and a different type later.',
      'Python is also strongly typed. It will not silently mix incompatible values, so `"1" + 2` raises an error instead of guessing what you meant.',
      'Dynamic typing makes it faster to write and explore code, since you skip type declarations. The tradeoff is that a type mistake may not show up until the program actually runs that line.',
      'To catch mistakes earlier, I use type hints, a static checker like mypy or pyright, unit tests, input validation, and clear interfaces. One thing worth remembering: "dynamic vs. static" and "strong vs. weak" are two different questions. Don\'t treat them as the same comparison.',
    ],
    code: [
      {
        title: 'Rebinding and explicit conversion',
        language: 'python',
        code: `value = 1          # value refers to an int
value = "one"      # it can later refer to a str

total = "1" + str(2)  # explicit conversion produces "12"`,
      },
    ],
    traps: ['Treating "dynamic vs static" and "strong vs weak" as the same comparison.'],
    tags: ['python', 'typing'],
  },
  {
    id: 'itv-mypy-22',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the __init__() method in a Python class?',
    probing: 'Whether you know __init__ initialises rather than creates, and what self refers to.',
    answer: [
      "`__init__()` runs right after Python creates a new object, and its job is to set up the object's starting state. It should always return `None`.",
      'People often call it "the constructor" in interviews, though technically it\'s `__new__()` that creates the object - `__init__()` just initializes it.',
      'Here, `self` refers to the newly created instance. Each `Book` object receives its own `title` attribute.',
    ],
    code: [
      {
        title: 'A class with __init__',
        language: 'python',
        code: `class Book:
    def __init__(self, title: str) -> None:
        self.title = title

    def display(self) -> None:
        print(f"Book name: {self.title}")


book = Book("Sandman")
book.display()`,
      },
    ],
    traps: ['`__init__()` does not create the object; `__new__()` does.'],
    tags: ['python', 'oop', 'classes'],
  },
  {
    id: 'itv-mypy-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between instance, class, and static methods?',
    probing:
      'Whether you know what each method type receives automatically and when to use each, such as classmethod alternate constructors.',
    answer: [
      "- **Instance method**: a normal `def` in a class; first argument `self`; reads or changes one object's state and can also reach class state.\n- **Class method**: declared with `@classmethod`; first argument `cls`; reads or changes class-level state and is often used as an alternate constructor.\n- **Static method**: declared with `@staticmethod`; no first argument supplied automatically; a utility that's related to the class but doesn't need instance or class state.",
      "A static method can still read global data if it needs to - nothing stops it. It just doesn't get `self` or `cls` handed to it automatically. If the logic actually needs object or class state, use the method type that gets it.",
    ],
    code: [
      {
        title: 'All three method types',
        language: 'python',
        code: `class Deployment:
    platform = "AKS"

    def __init__(self, service: str) -> None:
        self.service = service

    def description(self) -> str:
        return f"{self.service} runs on {self.platform}"

    @classmethod
    def from_repository(cls, repository: str) -> "Deployment":
        service = repository.rsplit("/", maxsplit=1)[-1]
        return cls(service)

    @staticmethod
    def valid_replicas(replicas: int) -> bool:
        return replicas > 0`,
      },
    ],
    tags: ['python', 'oop', 'classes'],
  },
  {
    id: 'itv-mypy-24',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain inheritance in Python and when to prefer composition.',
    probing:
      'Whether you can use inheritance and super() correctly and recognise when an is-a relationship does not hold.',
    answer: [
      'Inheritance lets a child class reuse and specialize behavior from a parent class, and it\'s what makes polymorphism work. That said, composition is often the clearer choice when the relationship isn\'t a genuine "is-a" one.',
      "A child class can override any inherited method. Use `super()` when the parent's version still needs to run too, especially when extending `__init__()`. Keep inheritance trees shallow, and test overridden behavior directly.",
    ],
    code: [
      {
        title: 'Parent and child notifier',
        language: 'python',
        code: `class Notifier:
    def send(self, message: str) -> None:
        raise NotImplementedError


class TeamsNotifier(Notifier):
    def __init__(self, channel: str) -> None:
        self.channel = channel

    def send(self, message: str) -> None:
        print(f"Sending to {self.channel}: {message}")`,
      },
    ],
    tags: ['python', 'oop', 'inheritance'],
  },
  {
    id: 'itv-mypy-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you find and handle missing values in a pandas DataFrame?',
    probing:
      'Whether you can count missing values and choose a handling strategy that does not skew results or leak data.',
    answer: [
      '`isna()` (or its alias `isnull()`) flags missing values. Calling `sum()` on top of that counts them per column, since Python treats `True` as `1`.',
      'Finding the missing values is only step one. What you do about them depends on what "missing" actually means here:',
      '- Use `dropna()` only when dropping those rows or columns won\'t skew the result.\n- Use `fillna()` with a constant or a statistic you can justify, for simple cases.\n- For time series, forward- or backward-filling only makes sense if the domain actually supports it.\n- Add a missing-value flag when the fact that something is missing is itself useful information.\n- Learn the imputation rule from the training data only, then apply that same rule to validation and test data - otherwise you leak information across the split.\n- Tell apart `NaN`, `None`, empty strings, and placeholder values - they aren\'t always the same kind of "missing."',
    ],
    code: [
      {
        title: 'Count and percentage of missing values',
        language: 'python',
        code: `import numpy as np
import pandas as pd

data = {
    "id": [1, 4, np.nan, 9],
    "age": [30, 45, np.nan, np.nan],
    "score": [np.nan, 140, 180, 198],
}

frame = pd.DataFrame(data)

print(frame.isna().sum())
print(frame.isna().mean().mul(100).round(2))  # missing percentage`,
      },
    ],
    traps: [
      'Fitting imputation on the full dataset leaks information across the train/test split.',
    ],
    tags: ['python', 'pandas', 'data'],
  },
]
