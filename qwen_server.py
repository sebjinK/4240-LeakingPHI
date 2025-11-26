from transformers import AutoModelForCausalLM, AutoTokenizer
from fastapi import FastAPI
import uvicorn
from pydantic import BaseModel

model_name = "Qwen/Qwen2.5-1.5B-Instruct"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

app = FastAPI()

class ChatMessage(BaseModel):
    role: str
    content: str

@app.post("/generate")
async def generate(messages: list[ChatMessage]):
    messages = [msg.model_dump() for msg in messages]

    model_inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        return_tensors="pt",
        padding=True
    )

    outputs = model.generate(
        input_ids=model_inputs["input_ids"],
        attention_mask=model_inputs["attention_mask"],
        max_new_tokens=200
    )

    text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return {"generated_text": text}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5005)
