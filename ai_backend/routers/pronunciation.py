import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import litellm

from prompts import for_pair, LANGUAGE_NAME

router = APIRouter()


class PronunciationRequest(BaseModel):
    base64Audio: str
    mimeType: str
    targetWord: str = Field(..., max_length=50)
    pinyin: str = ""
    native: str = Field(default="tr", pattern="^(tr|en|zh)$")
    target: str = Field(default="zh", pattern="^(tr|en|zh)$")


@router.post("/evaluate-pronunciation")
async def evaluate_pronunciation(body: PronunciationRequest):
    system_instruction = for_pair(body.native, body.target)["pronunciation"]
    target_lang = LANGUAGE_NAME[body.target]
    native_lang = LANGUAGE_NAME[body.native]

    hint = f' ({body.pinyin})' if body.target == "zh" and body.pinyin else ''
    prompt = (
        f'{system_instruction}\n\n'
        f'The user is trying to say the {target_lang} word "{body.targetWord}"{hint}. '
        'Listen to the audio and evaluate their pronunciation. '
        f'Return a JSON object with: {{"score": number (0-100), '
        f'"feedback": string (in {native_lang}, explain what was good and what needs improvement), '
        '"transcription": string (what you heard)}.'
    )

    try:
        response = await litellm.acompletion(
            model="gemini/gemini-2.5-flash",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "file",
                        "file": {"file_data": f"data:{body.mimeType};base64,{body.base64Audio}"},
                    },
                    {"type": "text", "text": prompt},
                ],
            }],
            response_format={"type": "json_object"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")

    try:
        return json.loads(response.choices[0].message.content or "{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON from model")
