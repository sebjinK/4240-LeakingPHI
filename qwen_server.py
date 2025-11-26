from transformers import AutoModelForCausalLM, AutoTokenizer
from fastapi import FastAPI
import uvicorn

model_name = "Qwen/Qwen2.5-1.5B-Instruct"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

app = FastAPI()

@app.post("/generate")
async def generate(messages: list):
    # messages is a list of dicts: {role: "user"/"system", content: "..."}
    prompt = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
    inputs = tokenizer(prompt, return_tensors="pt")
    outputs = model.generate(**inputs, max_new_tokens=200)
    text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return {"generated_text": text}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5005)
