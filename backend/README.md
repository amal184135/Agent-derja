# Backend

API FastAPI + MongoDB, exécution 100% native sur Windows (pas de Docker), avec accès direct au GPU NVIDIA pour le modèle XTTS v2.

## Prérequis

- Python 3.11
- Un GPU NVIDIA avec drivers + CUDA 12.1 installés (pour l'inférence XTTS v2 ; sinon le modèle tournera sur CPU)
- MongoDB Community Server installé et démarré en local

### Installer MongoDB Community Server

1. Télécharger l'installeur MSI officiel : https://www.mongodb.com/try/download/community
2. Lors de l'installation, cocher **"Install MongoDB as a Service"** pour qu'il démarre automatiquement au démarrage de Windows.
3. Démarrer le service (si nécessaire) :
   ```powershell
   Start-Service MongoDB
   ```
4. Vérifier qu'il tourne :
   ```powershell
   Get-Service MongoDB
   ```

MongoDB écoute par défaut sur `mongodb://localhost:27017`, ce qui correspond à la valeur de `MONGO_URL` dans `.env`.

## Installation (première fois)

```powershell
.\setup.ps1
```

Ce script :
- crée l'environnement virtuel Python (`venv`)
- l'active
- installe les dépendances depuis `requirements.txt` (dont PyTorch/CUDA via `--extra-index-url https://download.pytorch.org/whl/cu121`)
- affiche des rappels pour les drivers CUDA et MongoDB

## Lancement

```powershell
.\run.ps1
```

Ce script active le venv et lance :
```
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

L'API est ensuite disponible sur http://localhost:8000.

## Configuration

Les variables d'environnement sont définies dans `.env` (voir `app/core/config.py`) :

- `MONGO_URL` — URL de connexion MongoDB (défaut : `mongodb://localhost:27017`)
- `MONGO_DB_NAME` — nom de la base
- `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` — configuration JWT
- `TTS_MODEL_DIR`, `TTS_REFERENCE_WAV`, `TTS_DEFAULT_LANGUAGE`, `TTS_DEVICE` — configuration XTTS v2 (voir `app/core/config.py`)
