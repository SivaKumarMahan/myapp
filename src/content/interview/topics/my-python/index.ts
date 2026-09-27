import type { InterviewTopic } from '../../../types'
import { myPythonAutomationQuestions } from './automation'
import { myPythonFundamentalsQuestions } from './fundamentals'
import { myPythonCodingQuestions } from './coding'
import { myPythonLoggingQuestions } from './logging'

export const myPythonTopic: InterviewTopic = {
  id: 'my-python',
  group: 'bank',
  title: 'My Python questions',
  shortTitle: 'My Python',
  icon: '🐍',
  order: 112,
  oneLiner:
    'Python for DevOps automation - safe API calls, subprocess and secrets, production-ready scripts - plus core language, OOP, live-coding string exercises and Loguru logging.',
  headlines: [
    'Lists are mutable; tuples are immutable only in their own slots - a list inside a tuple can still change.',
    '`__init__()` initialises a new object; `__new__()` is what actually creates it.',
    'Decorators wrap behaviour without touching the function body; use `functools.wraps` and forward `*args, **kwargs`.',
    'Instance methods get `self`, class methods get `cls` (alternate constructors), static methods get nothing automatically.',
    'Python is dynamically but strongly typed: `"1" + 2` raises instead of guessing. Catch mistakes early with type hints and mypy.',
    'Every HTTP call and subprocess gets a timeout; retry only safe, temporary failures; never use `shell=True` with user input.',
    'In pandas, `isna().sum()` counts missing values; how you fill them depends on what "missing" means - and fit imputation on training data only.',
    'Loguru configures sink, format and level in one `add()` call; `bind()` adds context, and `diagnose=True` can leak secrets in production.',
  ],
  questions: [
    ...myPythonAutomationQuestions,
    ...myPythonFundamentalsQuestions,
    ...myPythonCodingQuestions,
    ...myPythonLoggingQuestions,
  ],
}
