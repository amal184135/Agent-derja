from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth,chat, tts, stt
from app.services.tts_service import engine as tts_engine
from app.services.stt_service import engine as stt_engine


from app.routers import auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    tts_engine.load()
    print(f"TTS device: {tts_engine.device}")

    stt_engine.load()
    print(f"STT device: {stt_engine.device}")

    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tts.router)
app.include_router(stt.router)


@app.get("/")
def root():
    return {"status": "ok"}
