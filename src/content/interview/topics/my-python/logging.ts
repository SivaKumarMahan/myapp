import type { InterviewQuestion } from '../../../types'

/** Better logging with Loguru: levels, formatting, sinks, context and exceptions. */
export const myPythonLoggingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mypy-32',
    level: 'basic',
    kind: 'open',
    prompt: 'What are log levels, and how does Loguru extend the built-in logging levels?',
    probing:
      'Whether you know the standard severity order, the extra Loguru levels, and why TRACE is hidden by default.',
    answer: [
      'A **log level** is a severity label attached to each message. Assigning levels lets you focus on the messages that matter and filter out the noise while troubleshooting or monitoring.',
      "Python's built-in `logging` module ships with `DEBUG`, `INFO`, `WARNING`, `ERROR`, and `CRITICAL`. Loguru adds two more: `TRACE` and `SUCCESS`.",
      'Log levels in order of increasing priority:',
      '- **TRACE** (5): very fine-grained diagnostic detail\n- **DEBUG** (10): debugging information\n- **INFO** (20): general informational messages\n- **SUCCESS** (25): an operation completed successfully\n- **WARNING** (30): something unexpected, but not fatal\n- **ERROR** (40): a failure in the current operation\n- **CRITICAL** (50): a severe error; the app may not continue',
      "Install it with `pip install loguru`, then import the `logger` from the `loguru` module and use it directly. The default output format is `date | level | file location: scope: line number - message`. The `trace` line won't print by default, because Loguru's default level is `DEBUG`.",
      'Loguru also lets you define your own log level with `level()`, giving it a name, a priority number, a color and an icon.',
      'Official references: Loguru documentation (https://loguru.readthedocs.io/) and the Loguru GitHub repository (https://github.com/Delgan/loguru).',
    ],
    code: [
      {
        title: 'Install Loguru',
        language: 'bash',
        code: `pip install loguru`,
      },
      {
        title: 'Logging at every level',
        language: 'python',
        code: `from loguru import logger

logger.trace("Hi, This is Akhilesh Mishra")
logger.debug("I will show how to use loguru for better logging in python")
logger.info(" I love how the logs look")
logger.warning("Different color of each section of log")
logger.error("Easy to get started with")
logger.critical("So many options to choose from")
logger.success(" You see what i am talking about")`,
      },
      {
        title: 'Default output format',
        language: 'text',
        code: `date | level | file location: scope: line number - message`,
      },
      {
        title: 'Custom log levels',
        language: 'python',
        code: `import sys
from loguru import logger

logger.remove(0)

m_level = logger.level("Medium", no=45, color="<yellow><bold>", icon="/\\\\/\\\\")
n_level = logger.level("Nedium", no=45, color="<blue><bold>", icon="|\\\\|")

logger.add(sys.stderr, format=" <level> {level.icon} :: {message} </level>")

logger.log("Medium", "This is my custom log level")
logger.log("Nedium", "I like having optional log levels")`,
      },
    ],
    tags: ['python', 'logging', 'loguru'],
  },
  {
    id: 'itv-mypy-33',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you change the log level, format, colors, and time format in Loguru?',
    probing:
      'Whether you know logger.add() configures sink, format and level in one call, and that remove() clears the default handler.',
    answer: [
      "Use the logger's `add()` function to set a different default log level and update the formatting at the same time.",
      'Unlike the built-in `logging` module, Loguru lets you add a handler, set the format, and set the log level all in one call to `add()`. Call `logger.remove()` first to remove the old formatting.',
      'Set colors for your log output using an HTML-like syntax such as `<yellow>`, `<green>`, `<bold>` and `<blue>` tags in the format string. `<level>` uses the default color for the level.',
      'Time formatting uses tokens such as `{time:MMMM D, YYYY > HH:mm:ss!UTC}` for UTC time. See the Loguru date/time formatting reference (https://loguru.readthedocs.io/en/stable/api/logger.html#time) for more options.',
    ],
    code: [
      {
        title: 'Change the default level',
        language: 'python',
        code: `import sys
from loguru import logger

logger.add(sys.stderr, level="TRACE")
logger.trace("Hi, This is Akhilesh Mishra")`,
      },
      {
        title: 'Handler, format and level in one call',
        language: 'python',
        code: `import sys
from loguru import logger

logger.remove()  # remove the old formatting
logger.add(sys.stdout, format="{time}::{level} --- {message}", level="INFO")

logger.debug(" Add a handler, update formatting, and change the loglevel")
logger.info(" one function to rule them all")
logger.success(" logger.add()")`,
      },
      {
        title: 'Pretty logging with colors',
        language: 'python',
        code: `logger.remove()
logger.add(
    sys.stdout,
    format=" <yellow>{time} </yellow>:: <green> <bold> {level} </bold> </green>--- <blue> {message} </blue>",
)

logger.info("Set the colors you want to use for logs")
logger.success(" How easy it was???")`,
      },
      {
        title: 'Custom time format',
        language: 'python',
        code: `import sys
from loguru import logger

logger.remove()
# MMMM D, YYYY > HH:mm:ss!UTC : UTC time
logger.add(sys.stderr, format="{time:MMMM D, YYYY > HH:mm:ss!UTC} | {level} | <level>{message} </level>")

logger.warning(" Use time format-> {time:MMMM D, YYYY > HH:mm:ss!UTC}")
logger.success("Use the default color from level: <level>{message} </level>")`,
      },
    ],
    tags: ['python', 'logging', 'loguru'],
  },
  {
    id: 'itv-mypy-34',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you send Loguru logs to a file with rotation, retention, compression, and JSON?',
    probing:
      'Whether you know Loguru file sinks and their rotation, retention, compression and serialize options.',
    answer: [
      'Loguru sends logs to the console by default, but you can point it at a file instead with `logger.add("log_file_demo.log")`, optionally with a format and a `{time}` placeholder in the file name.',
      'Loguru can rotate, clean up, and compress log files based on time or size:',
      '- `rotation="500 MB"` automatically rotates a too-big file\n- `rotation="12:00"` creates a new file each day at noon\n- `rotation="1 week"` rotates a file once it is too old\n- `retention="10 days"` cleans up after some time\n- `compression="zip"` saves some space',
      'Loguru can write logs in JSON format with the `serialize=True` option.',
    ],
    code: [
      {
        title: 'Formatted file logging',
        language: 'python',
        code: `from loguru import logger

logger.add("log_file_demo.log")

logger.remove()
logger.add("file_{time}.log", format="{time:MMMM D, YYYY > HH:mm:ss} | {level} | <level>{message} </level>")

logger.info("using file logging")
logger.success(" will send logs to the file")`,
      },
      {
        title: 'Rotation, retention and compression',
        language: 'python',
        code: `logger.add("log_rotate.log", rotation="500 MB")   # Automatically rotate a too-big file
logger.add("log_rotate2.log", rotation="12:00")    # New file is created each day at noon
logger.add("log_rotate3.log", rotation="1 week")   # Once the file is too old, it's rotated

logger.add("log_retention.log", retention="10 days")  # Cleanup after some time

logger.add("log_retention2.log", compression="zip")   # Save some space`,
      },
      {
        title: 'JSON logging',
        language: 'python',
        code: `import sys
from loguru import logger

logger.remove(0)
logger.add(
    sys.stderr,
    format="{time:MMMM D: YYYY:: HH:mm:ss!UTC} | {level} | {message}",
    serialize=True,
)
logger.warning(" Its addictive, use with caution !")
logger.success("I know you started liking loguru")`,
      },
    ],
    tags: ['python', 'logging', 'loguru'],
  },
  {
    id: 'itv-mypy-35',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you add context to Loguru log messages with bind(), contextualize(), filter, and patch()?',
    probing:
      'Whether you can attach structured context to logs, scope it, route on it, and add computed fields - the basis of correlation IDs.',
    answer: [
      'To attach extra context to a log message, use `bind()`. Add the `{extra}` placeholder to your `add()` format so those custom fields actually show up in the output. You can bind more context on top of an existing bound logger, or pass kwargs during formatting.',
      '**Temporary context with `contextualize()`.** Use this context manager to set context that only applies for the duration of the `with` block.',
      '**Combine `bind()` and `filter` for fine-grained control.** A sink can filter on fields in `record["extra"]`, so only messages bound with a given key reach that file.',
      '**Attach dynamic values with `patch()`.** `patch()` lets you attach a computed value to every message as it is logged.',
    ],
    code: [
      {
        title: 'bind() context',
        language: 'python',
        code: `import sys
from loguru import logger

# Remove the default logger
logger.remove(0)

# Add a new logger that outputs to sys.stderr
logger.add(
    sys.stderr,
    format=" {level} | <level>{message}</level> | {extra} ",
)

# Create a new logger with some initial context
context_logger = logger.bind(author="Akhilesh", type="demo")

# Log an info message with the current context
context_logger.info("You can pass context with logs!")

# Bind additional context to the logger and log a warning message
context_logger.bind(blog_type="Tutorial").warning(
    "You can use extra attributes to bind context!"
)

# Log a success message with additional context provided during formatting
context_logger.success(
    "Use kwargs to add context during formatting: {platform}", platform="Medium"
)`,
      },
      {
        title: 'Temporary context with contextualize()',
        language: 'python',
        code: `import sys
from loguru import logger

logger.remove(0)

logger.add(
    sys.stderr,
    format=" {level} | <level>{message}</level> | {extra} ",
)

context_logger = logger.bind(blog_id=45)

def do_something():
    context_logger.debug("doing something")

with logger.contextualize(scope="From context manager"):
    do_something()

do_something()`,
      },
      {
        title: 'bind() plus filter',
        language: 'python',
        code: `from loguru import logger

logger.add("special.log", filter=lambda record: "special" in record["extra"])
logger.debug("This message is not logged to the file")
logger.bind(special=True).info("This message, though, is logged to the file!")`,
      },
      {
        title: 'Dynamic values with patch()',
        language: 'python',
        code: `import sys
from loguru import logger
from datetime import datetime

logger.remove(0)
logger.add(sys.stderr, format="{extra[utc]} - {level} - {message}")
logger = logger.patch(lambda record: record["extra"].update(utc=datetime.now()))

logger.info("using patch method from loguru")`,
      },
    ],
    followUps: [
      'How would you attach a per-request correlation ID to every log line in a web service?',
      'How would you combine serialize=True with bound context for a log platform?',
    ],
    tags: ['python', 'logging', 'loguru'],
  },
  {
    id: 'itv-mypy-36',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you log exceptions with Loguru, and what is the risk of diagnose=True?',
    probing:
      'Whether you can capture full tracebacks with logger.exception or logger.catch and know variable values in traces can leak secrets in production.',
    answer: [
      "Logging exceptions matters for tracking down bugs, but it's only useful if you can actually see what caused the problem. Loguru prints the full stack trace, including variable values, so the cause is easier to spot.",
      'Inside an `except` block, `logger.exception()` logs the message together with the traceback. You can also use the `logger.catch()` decorator to log any exception raised by a function.',
      'By default, `logger.catch()` logs at the `ERROR` level, but you can point it at a different level instead.',
      'Caution: `diagnose=True` is the default and may leak sensitive data in production, because it prints variable values in the trace. Turn `backtrace` and `diagnose` off for production sinks.',
    ],
    code: [
      {
        title: 'logger.exception with backtrace and diagnose',
        language: 'python',
        code: `from loguru import logger

logger.remove(0)

# Caution: "diagnose=True" is the default and may leak sensitive data in prod
logger.add("loguru.log", backtrace=True, diagnose=True)

def func(a, b):
    return a / b

def nested(c):
    try:
        func(5, c)
    except ZeroDivisionError:
        logger.exception("Did you just??")

nested(0)`,
      },
      {
        title: 'logger.catch() decorator',
        language: 'python',
        code: `from loguru import logger

logger.remove(0)

# Caution: "diagnose=True" is the default and may leak sensitive data in prod
logger.add("loguru.log", backtrace=False, diagnose=False)

@logger.catch()
def func(a, b):
    return a / b

func(5, 0)`,
      },
    ],
    traps: ['Leaving `diagnose=True` on in production can write secret variable values into logs.'],
    followUps: [
      'How would you keep secrets out of logs even when an exception carries them?',
      'Should logger.catch() re-raise the exception, and how would you configure that?',
    ],
    tags: ['python', 'logging', 'loguru', 'exceptions'],
  },
]
