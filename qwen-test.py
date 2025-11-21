# qwen_test.py
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

MODEL_PATH = "models/qwen2.5-0.5b-instruct"
# ^^^ change this to EXACT path printed by download_qwen.py

def main():
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_PATH,
        local_files_only=True,
    )

    print("Loading model...")
    if torch.cuda.is_available():
        # If by chance you *do* have a GPU
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_PATH,
            local_files_only=True,
            torch_dtype=torch.float16,
            device_map="auto",
        )
    else:
        # Pure CPU – safer to keep default dtype (float32)
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_PATH,
            local_files_only=True,
        )

    model.eval()

    prompt = "You are a helpful assistant. Explain what a DDoS attack is in 2 sentences."
    inputs = tokenizer(prompt, return_tensors="pt")
    if torch.cuda.is_available():
        inputs = inputs.to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=80,
            do_sample=True,
            temperature=0.7,
        )

    print(tokenizer.decode(outputs[0], skip_special_tokens=True))

if __name__ == "__main__":
    main()

