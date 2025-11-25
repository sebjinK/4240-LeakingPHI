from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "Qwen/Qwen2.5-1.5B-Instruct"

# If you want authentication:
import os
os.environ["HF_TOKEN"] = "your_hf_token_here"

tokenizer = AutoTokenizer.from_pretrained(model_id, token=os.environ["HF_TOKEN"])
model = AutoModelForCausalLM.from_pretrained(model_id, token=os.environ["HF_TOKEN"])

print("Model downloaded successfully!")
