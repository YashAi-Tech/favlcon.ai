import os
import re
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from openai import OpenAI

# Load .env from project root or backend folder
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

app = FastAPI(
    title="Promptsmith & Favlicon AI Generator API",
    description="FastAPI backend powered by OpenRouter for generating interactive multi-page React websites from prompts and images.",
    version="1.0.0",
)

# CORS Configuration for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are an elite front-end engineer and art director. You build complete, highly graphical, animated MULTI-PAGE React websites.

Reply in EXACTLY this format, nothing else:

<<<TITLE>>>
Site name
<<<SLUG>>>
kebab-case-slug
<<<DESCRIPTION>>>
One sentence describing the site.
<<<CODE>>>
(JSX only)

CODE rules — the JSX runs in the browser via Babel, so:
- NO import/export statements, NO TypeScript, NO markdown fences.
- React and the hooks useState, useEffect, useRef, useMemo, useCallback are already in scope.
- A helper "useHashRoute()" is in scope: const [route, go] = useHashRoute(); route is like "/" or "/about"; call go("/about") to navigate.
- You MUST define "function App() { ... }" as the root component. It renders a shared header nav + footer and switches between at least 4 distinct page components (e.g. Home, About/Services, Work/Features, Contact) based on route.
- Every page is rich and graphical: big hero, layered gradients, glassmorphism, grid/bento sections, testimonials, stats, FAQ, CTA, real specific copy (never lorem ipsum).
- Tailwind (CDN) is available for all styling. Use it heavily and cohesively; pick a bold distinctive palette (avoid generic purple-on-white).
- Animation is required: use the ready-made classes "anim-fade-up", "anim-float", "anim-shimmer", and "reveal" (reveal elements animate in on scroll automatically), plus Tailwind transitions/hover effects and CSS keyframes in inline <style> if needed.
- Add interactivity: mobile menu toggle, accordions, tabs, carousels, hover states, working contact form with local state.
- Images: use https://images.unsplash.com/... URLs or pure CSS gradients/SVG.
- Must be fully responsive and accessible (alt text, buttons, labels).
- Self-contained: no external JS libraries beyond what is in scope."""

class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="Prompt describing the website to create")
    image: Optional[str] = Field(None, description="Optional base64/data URL reference image")
    model: Optional[str] = Field(None, description="OpenRouter model to use")

class GenerateResponse(BaseModel):
    title: str
    slug: str
    description: str
    code: str

class ModelInfo(BaseModel):
    id: str
    name: str
    description: str

def parse_section(text: str, tag: str, next_tag: Optional[str] = None) -> str:
    start = text.find(f"<<<{tag}>>>")
    if start == -1:
        return ""
    start_pos = start + len(tag) + 6
    if next_tag:
        end_pos = text.find(f"<<<{next_tag}>>>", start_pos)
        if end_pos != -1:
            return text[start_pos:end_pos].strip()
    return text[start_pos:].strip()

def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned[:48] if cleaned else "site"

def get_openrouter_client() -> tuple[OpenAI, str]:
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    lovable_key = os.getenv("LOVABLE_API_KEY", "").strip()

    if openrouter_key:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_key,
            default_headers={
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "Favlicon Prompt Art Studio",
            },
        )
        return client, "openrouter"
    elif lovable_key:
        client = OpenAI(
            base_url="https://ai.gateway.lovable.dev/v1",
            api_key=lovable_key,
            default_headers={
                "Lovable-API-Key": lovable_key,
                "X-Lovable-AIG-SDK": "fastapi-backend",
            },
        )
        return client, "lovable"
    elif openai_key:
        client = OpenAI(api_key=openai_key)
        return client, "openai"
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI API Key not configured. Please set OPENROUTER_API_KEY in your .env file.",
        )

@app.get("/")
def root():
    return {
        "app": "Promptsmith / Favlicon AI Generator FastAPI",
        "docs": "/docs",
        "health": "/health",
        "generate_endpoint": "/api/generate",
    }

@app.get("/health")
def health_check():
    openrouter_key = bool(os.getenv("OPENROUTER_API_KEY"))
    openai_key = bool(os.getenv("OPENAI_API_KEY"))
    lovable_key = bool(os.getenv("LOVABLE_API_KEY"))

    provider = "openrouter" if openrouter_key else ("lovable" if lovable_key else ("openai" if openai_key else "none"))

    return {
        "status": "healthy",
        "provider": provider,
        "configured_keys": {
            "openrouter": openrouter_key,
            "lovable": lovable_key,
            "openai": openai_key,
        },
    }

@app.get("/api/models", response_model=List[ModelInfo])
def list_models():
    return [
        ModelInfo(
            id="google/gemini-2.5-flash",
            name="Gemini 2.5 Flash",
            description="Ultra-fast, high intelligence, excellent with JSX code generation",
        ),
        ModelInfo(
            id="openai/gpt-4o",
            name="GPT-4o",
            description="High precision, strong reasoning, and visual comprehension",
        ),
        ModelInfo(
            id="anthropic/claude-3.5-sonnet",
            name="Claude 3.5 Sonnet",
            description="Superior frontend design aesthetics and clean code generation",
        ),
        ModelInfo(
            id="deepseek/deepseek-chat",
            name="DeepSeek V3",
            description="Fast and economical high-performance code model",
        ),
        ModelInfo(
            id="meta-llama/llama-3.3-70b-instruct",
            name="Llama 3.3 70B",
            description="Open-weights flagship intelligence",
        ),
    ]

@app.post("/api/generate", response_model=GenerateResponse)
def generate_site(req: GenerateRequest):
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please describe what to build.")

    client, provider = get_openrouter_client()

    # Determine model
    if req.model:
        model = req.model
    elif provider == "openrouter":
        model = "google/gemini-2.5-flash"
    elif provider == "lovable":
        model = "openai/gpt-6-astra"
    else:
        model = "gpt-4o"

    # Build messages
    user_content: List[Dict[str, Any]] = [
        {"type": "text", "text": req.prompt.strip()}
    ]

    if req.image and req.image.startswith("data:image/"):
        user_content.append({
            "type": "image_url",
            "image_url": {"url": req.image}
        })

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.7,
            max_tokens=4096,
        )

        response_text = completion.choices[0].message.content or ""
        
        title = parse_section(response_text, "TITLE", "SLUG") or "Untitled Site"
        raw_slug = parse_section(response_text, "SLUG", "DESCRIPTION") or title
        slug = slugify(raw_slug)
        description = parse_section(response_text, "DESCRIPTION", "CODE") or "An interactive React website."
        
        raw_code = parse_section(response_text, "CODE")
        # Strip code markdown fences if present
        code = re.sub(r"^```(?:jsx|js|tsx|javascript)?\s*", "", raw_code, flags=re.IGNORECASE)
        code = re.sub(r"\s*```$", "", code).strip()

        if "function App" not in code and "const App" not in code:
            # Fallback check or retry formatting
            if not code:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="AI returned an empty response. Please try again with more details."
                )

        return GenerateResponse(
            title=title,
            slug=slug,
            description=description,
            code=code,
        )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "credit" in error_msg.lower() or "402" in error_msg:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Generation failed: {error_msg}")
