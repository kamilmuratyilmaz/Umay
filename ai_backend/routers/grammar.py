from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import litellm

from prompts import for_pair

router = APIRouter()


class GrammarRequest(BaseModel):
    query: str = Field(..., max_length=1000)
    native: str = Field(default="tr", pattern="^(tr|en|zh)$")
    target: str = Field(default="zh", pattern="^(tr|en|zh)$")


@router.post("/grammar")
async def grammar(body: GrammarRequest):
    system_instruction = for_pair(body.native, body.target)["grammar"]
    try:
        response = await litellm.acompletion(
            model="gemini/gemini-2.5-flash",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": body.query},
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grammar explanation failed: {e}")

    return {"text": response.choices[0].message.content}
