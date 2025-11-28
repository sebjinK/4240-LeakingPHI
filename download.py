from transformers import AutoModelForCausalLM, AutoTokenizer
from dotenv import load_dotenv
import os

# Try to load from .env file if it exists (for local development)
# But also use environment variables (for Docker build)
load_dotenv()
HF_TOKEN = os.getenv('HF_TOKEN')  # Get the HF_TOKEN from environment variables

model_id = "Qwen/Qwen2.5-1.5B-Instruct"

# If you want authentication:
tokenizer = AutoTokenizer.from_pretrained(model_id, token=HF_TOKEN)
model = AutoModelForCausalLM.from_pretrained(model_id, token=HF_TOKEN)

print("Model downloaded successfully!")
