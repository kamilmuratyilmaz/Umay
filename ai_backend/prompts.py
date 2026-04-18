"""Per-(native, target) system prompts for Umay's AI features.

Keys are ``(native, target)`` tuples using ISO-639-1 codes (``tr``, ``en``,
``zh``). Each value is a dict keyed by feature name (``grammar``,
``pronunciation``, ``live``, ``tts_normal``, ``tts_slow``).

If a pair is missing, callers fall back to the ``("tr", "zh")`` defaults.
"""

from __future__ import annotations

LangPair = tuple[str, str]

LANGUAGE_NAME = {
    "tr": "Turkish",
    "en": "English",
    "zh": "Chinese",
}

def _grammar(target: str, native: str) -> str:
    tgt = LANGUAGE_NAME[target]
    nat = LANGUAGE_NAME[native]
    return (
        f"You are an expert {tgt} language teacher. "
        f"Explain {tgt} grammar concepts clearly in {nat}. "
        f"Provide examples in {tgt}; when helpful, include a {nat} translation."
    )


def _pronunciation(target: str, native: str) -> str:
    tgt = LANGUAGE_NAME[target]
    nat = LANGUAGE_NAME[native]
    return (
        f"You are evaluating a learner's {tgt} pronunciation. "
        f"Return JSON with score (0-100), feedback (in {nat}, plain prose), "
        f"and transcription (what you heard)."
    )


def _live(target: str, native: str) -> str:
    tgt = LANGUAGE_NAME[target]
    nat = LANGUAGE_NAME[native]
    return (
        f"You are a friendly {tgt} teacher for a {nat} speaker. "
        f"You speak both {nat} and {tgt}. Help the user practice their conversational "
        f"{tgt}. Correct mistakes gently. Keep responses concise."
    )


def _tts_prompt(target: str, isSlow: bool) -> str:
    tgt = LANGUAGE_NAME[target]
    qualifier = "very slowly, clearly and naturally" if isSlow else "clearly and naturally"
    tone_hint = ", emphasizing the tones" if target == "zh" else ""
    return f"Please speak the following {tgt} text {qualifier}{tone_hint}: {{text}}"


def for_pair(native: str, target: str) -> dict:
    if native not in LANGUAGE_NAME or target not in LANGUAGE_NAME or native == target:
        native, target = "tr", "zh"
    return {
        "grammar":       _grammar(target, native),
        "pronunciation": _pronunciation(target, native),
        "live":          _live(target, native),
        "tts_normal":    _tts_prompt(target, False),
        "tts_slow":      _tts_prompt(target, True),
    }
