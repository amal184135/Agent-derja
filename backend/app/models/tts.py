from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000, description="Texte en derja tunisienne a synthetiser")
    language: str = Field(default="ar", description="Code langue utilise par le modele XTTS")