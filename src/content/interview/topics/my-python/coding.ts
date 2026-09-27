import type { InterviewQuestion } from '../../../types'

/** Live-coding exercises on strings and numbers. */
export const myPythonCodingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mypy-26',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you count every character in a string using a dictionary and find the maximum and minimum counts?',
    probing:
      'Whether you can write a single-pass dictionary count, handle ties and empty input, and state complexity.',
    answer: [
      'I scan the string once and use each character as a dictionary key. If the character has already been seen, I bump its count; otherwise I start it at one.',
      'I return lists because more than one character can share the same maximum or minimum count. The scan takes `O(n)` time and `O(k)` space, where `k` is the number of distinct characters.',
      "Before I code, I ask whether comparison should be case-sensitive and whether spaces and punctuation count. In production I'd just use `collections.Counter`, but writing it out with a dictionary shows the logic an interviewer wants to see.",
    ],
    code: [
      {
        title: 'Character statistics',
        language: 'python',
        code: `def character_statistics(text: str) -> tuple[dict[str, int], list[str], list[str]]:
    counts: dict[str, int] = {}

    for character in text:
        if character.isspace():       # Remove this condition if spaces must be counted.
            continue
        counts[character] = counts.get(character, 0) + 1

    if not counts:
        return {}, [], []

    maximum = max(counts.values())
    minimum = min(counts.values())

    most_frequent = [char for char, count in counts.items() if count == maximum]
    least_frequent = [char for char, count in counts.items() if count == minimum]
    return counts, most_frequent, least_frequent


counts, maximum_characters, minimum_characters = character_statistics("banana")
print(counts)               # {'b': 1, 'a': 3, 'n': 2}
print(maximum_characters)   # ['a']
print(minimum_characters)   # ['b']`,
      },
    ],
    tags: ['python', 'coding', 'strings'],
  },
  {
    id: 'itv-mypy-27',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you check whether a number is prime using recursion?',
    probing:
      'Whether you know the square-root bound, correct base cases, and Python recursion depth limits.',
    answer: [
      "A prime number is greater than one and has no divisor other than one and itself. It's enough to test divisors up to the square root of the number.",
      'For `29`, the function tests `2`, `3`, `4`, and `5`. Once `6 * 6` passes `29`, no factor has turned up, so the number is prime.',
      'The time complexity is roughly `O(sqrt(n))`. Recursion is fine for showing the idea, but Python limits how deep recursion can go, so an iterative version is safer for very large numbers.',
    ],
    code: [
      {
        title: 'Recursive prime check',
        language: 'python',
        code: `def is_prime(number: int, divisor: int = 2) -> bool:
    if number < 2:
        return False

    if divisor * divisor > number:
        return True

    if number % divisor == 0:
        return False

    return is_prime(number, divisor + 1)


print(is_prime(29))  # True
print(is_prime(21))  # False
print(is_prime(1))   # False`,
      },
    ],
    tags: ['python', 'coding', 'recursion'],
  },
  {
    id: 'itv-mypy-28',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you remove a value supplied by the user from a string?',
    probing:
      'Whether you clarify requirements first and know strings are immutable, choosing replace or a set filter as needed.',
    answer: [
      'First I ask whether the input is one character or a whole substring, whether matching should be case-sensitive, and whether every occurrence should go. To remove every exact occurrence of a substring, I use `str.replace`.',
      'For input `"cloud engineering"` and value `"engineer"`, the result is `"cloud ing"`. `str.replace` returns a new string, because Python strings can\'t be changed in place - a fresh string is always created.',
      'If instead the goal is to remove individual characters that appear in a set like `"aeiou"`, I use a set and filter.',
    ],
    code: [
      {
        title: 'Remove a substring',
        language: 'python',
        code: `def remove_value(text: str, value: str) -> str:
    if value == "":
        raise ValueError("The value to remove cannot be empty")
    return text.replace(value, "")


original = input("Enter the string: ")
value_to_remove = input("Enter the character or substring to remove: ")
print(remove_value(original, value_to_remove))`,
      },
      {
        title: 'Remove a set of characters',
        language: 'python',
        code: `def remove_characters(text: str, characters: str) -> str:
    blocked = set(characters)
    return "".join(char for char in text if char not in blocked)`,
      },
    ],
    tags: ['python', 'coding', 'strings'],
  },
  {
    id: 'itv-mypy-29',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you reverse a string without using a built-in reverse function or slicing?',
    probing:
      'Whether you can write the index loop and know why repeated string concatenation is slow.',
    answer: [
      'I start at the last index and walk backwards to the first character.',
      'This shows the algorithm clearly, but repeatedly building a string this way can approach `O(n²)` work, since a new string gets created on each append. A faster version appends characters to a list and joins them once at the end.',
      'For user-visible Unicode text, reversing by code point can break apart combined characters or emoji made of multiple parts. A Unicode-aware library may be needed there.',
    ],
    code: [
      {
        title: 'Index loop',
        language: 'python',
        code: `def reverse_string(text: str) -> str:
    result = ""
    index = len(text) - 1

    while index >= 0:
        result += text[index]
        index -= 1

    return result


print(reverse_string("Python"))  # nohtyP`,
      },
      {
        title: 'List and join',
        language: 'python',
        code: `def reverse_string_efficient(text: str) -> str:
    characters: list[str] = []
    for index in range(len(text) - 1, -1, -1):
        characters.append(text[index])
    return "".join(characters)`,
      },
    ],
    tags: ['python', 'coding', 'strings'],
  },
  {
    id: 'itv-mypy-30',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you remove duplicate digits from a very large number or string and retain the latest occurrence?',
    probing:
      'Whether you treat the number as a string, interpret "latest" correctly, and write an O(n) scan with a set.',
    answer: [
      'I treat the value as a string, so leading zeros survive and there\'s no risk of an integer overflowing. "Keep the latest" means keep the last time each character appears. I scan from right to left, keep the first copy of each character I see going that direction, then reverse the result once.',
      "In `112233214`, the last occurrences of each digit come out as `3`, `2`, `1`, and `4`. This is `O(n)` time and `O(k)` space. If `reversed` isn't allowed, I loop an index from `len(value) - 1` down to zero instead.",
      'If the interviewer actually means "keep the first occurrence and drop later duplicates," I scan left to right instead.',
    ],
    code: [
      {
        title: 'Keep the latest occurrence',
        language: 'python',
        code: `def keep_latest_occurrence(value: str) -> str:
    seen: set[str] = set()
    reversed_result: list[str] = []

    for character in reversed(value):
        if character not in seen:
            seen.add(character)
            reversed_result.append(character)

    return "".join(reversed(reversed_result))


print(keep_latest_occurrence("112233214"))  # 3214`,
      },
      {
        title: 'Keep the first occurrence',
        language: 'python',
        code: `def keep_first_occurrence(value: str) -> str:
    seen: set[str] = set()
    result: list[str] = []
    for character in value:
        if character not in seen:
            seen.add(character)
            result.append(character)
    return "".join(result)`,
      },
    ],
    tags: ['python', 'coding', 'strings'],
  },
  {
    id: 'itv-mypy-31',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you rotate a string anticlockwise?',
    probing:
      'Whether you clarify the meaning of rotation and handle counts larger than the length with modulo.',
    answer: [
      'For a one-dimensional string, "anticlockwise" usually just means a left rotation. A left rotation by `positions` moves that many leading characters to the end.',
      "Using modulo handles a rotation count larger than the string's length. With this definition, a negative position rotates to the right instead.",
      "This takes `O(n)` time and space, since strings can't be changed in place and a new string always has to be built. If the interviewer actually means rotating a two-dimensional character grid, that's a different problem, and I'd ask before coding it.",
    ],
    code: [
      {
        title: 'Left rotation',
        language: 'python',
        code: `def rotate_left(text: str, positions: int) -> str:
    if not text:
        return text

    positions %= len(text)
    return text[positions:] + text[:positions]


print(rotate_left("abcdef", 2))   # cdefab
print(rotate_left("abcdef", 8))   # cdefab, because 8 % 6 == 2`,
      },
    ],
    tags: ['python', 'coding', 'strings'],
  },
]
