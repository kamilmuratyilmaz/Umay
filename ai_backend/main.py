import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import PORT
from routers import tts, pronunciation, grammar, transcribe, live

app = FastAPI(title="Umay AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

app.include_router(tts.router, prefix="/api")
app.include_router(pronunciation.router, prefix="/api")
app.include_router(grammar.router, prefix="/api")
app.include_router(transcribe.router, prefix="/api")
app.include_router(live.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import litellm

    litellm._turn_on_debug()
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
