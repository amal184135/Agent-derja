from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth,chat, tts
from app.services.tts_service import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine.load()
    print(f"TTS device: {engine.device}")
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
app.include_router(chat.router)
app.include_router(tts.router)

@app.get("/")
def root():
    return {"status": "ok"}
