"""
Text utilities shared across backend modules.
"""

COMPANY_CONTEXT_WORD_LIMIT = 5000
COMPANY_CONTEXT_WORD_WARNING = 4000


def word_count(text: str) -> int:
    """Return the number of whitespace-delimited tokens in text."""
    return len(text.split())


def markdown_body_word_count(content: str) -> int:
    """
    Count words in a company context markdown file, excluding the title line
    (the first line beginning with '#').
    """
    body_lines = []
    skipped_title = False
    for line in content.split("\n"):
        if not skipped_title and line.strip().startswith("#"):
            skipped_title = True
            continue
        body_lines.append(line)
    body = "\n".join(body_lines).strip()
    return word_count(body) if body else 0


def context_exceeds_limit(text: str) -> bool:
    """Return True if the company context file body exceeds the word limit."""
    return markdown_body_word_count(text) > COMPANY_CONTEXT_WORD_LIMIT
