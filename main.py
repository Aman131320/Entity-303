import io
import base64
import torch
import ollama
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from diffusers import StableDiffusionPipeline

# ---------------------------------------------------------
# 1. Initialize FastAPI Application
# ---------------------------------------------------------
app = FastAPI(
    title="Entity AI Local Backend",
    description="Offline local AI engine for text and image generation."
)

# ---------------------------------------------------------
# 2. Configure CORS Middleware
# Allows front-end clients (Flutter, React Native, Web) to connect seamlessly.
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin during local development
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, OPTIONS, etc.
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 3. Load Image Generation Model (Stable Diffusion)
# Automatically detects if an NVIDIA GPU is available.
# ---------------------------------------------------------
print("Loading Stable Diffusion model into memory...")
device = "cuda" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if device == "cuda" else torch.float32

pipe = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5", 
    torch_dtype=torch_dtype
)
pipe = pipe.to(device)
print(f"Stable Diffusion loaded successfully on: {device.upper()}")

# ---------------------------------------------------------
# 4. Request Data Models
# ---------------------------------------------------------
class ChatRequest(BaseModel):
    prompt: str

class ImageRequest(BaseModel):
    prompt: str

# ---------------------------------------------------------
# 5. API Endpoints
# ---------------------------------------------------------

@app.get("/")
async def health_check():
    """
    Simple status check endpoint to confirm the server is running.
    """
    return {
        "status": "online",
        "device": device,
        "message": "Entity AI local backend is ready."
    }

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Text generation endpoint using local Ollama (Llama 3.2).
    Injects system prompt instructions before every request.
    """
    messages = [
        {
            "role": "system",
            "content": (
                "You are Entity AI, a highly intelligent and helpful assistant. "
                "Your creator and owner is Damar Aman. If anyone asks who created you, "
                "who your owner is, or who you belong to, you must answer 'Damar Aman'."
            )
        },
        {
            "role": "user",
            "content": request.prompt
        }
    ]
    
    # Query local Ollama instance
    response = ollama.chat(model="llama3.2", messages=messages)
    
    return {"response": response["message"]["content"]}

@app.post("/generate-image")
async def generate_image(request: ImageRequest):
    """
    Image generation endpoint using local Stable Diffusion.
    Converts output image to Base64 format for client-side decoding.
    """
    # Generate image from prompt
    image = pipe(request.prompt, num_inference_steps=15).images[0]
    
    # Encode image to Base64 string
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return {"image_base64": img_str}