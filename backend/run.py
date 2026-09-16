import uvicorn
import os
from pathlib import Path
from dotenv import load_dotenv

if __name__ == "__main__":
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()

    port = int(os.getenv("FASTAPI_PORT", "8000"))
    host = os.getenv("FASTAPI_HOST", "127.0.0.1")
    
    print(f"Starting FastAPI server on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True, app_dir=str(Path(__file__).parent))
