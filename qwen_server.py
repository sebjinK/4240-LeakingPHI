import os
from transformers import AutoModelForCausalLM, AutoTokenizer
from fastapi import FastAPI, Request
import uvicorn
from pydantic import BaseModel
from typing import List
import torch

model_name = os.environ.get("MODEL_PATH") or os.environ.get("HF_MODEL_ID") or "Qwen/Qwen2.5-1.5B-Instruct"
print(f"[qwen_server] Loading model from: {model_name}")
# If MODEL_PATH points to a local folder (e.g. /app/models/qwen2.5-0.5b-instruct), AutoTokenizer
# and AutoModelForCausalLM will load from that path. Otherwise, it will attempt to download from HF.
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

app = FastAPI()

class ChatMessage(BaseModel):
    role: str
    content: str

@app.post("/generate")
async def generate(request: Request):
    # Accept either a JSON array of messages or an object with a `messages` field
    body = await request.json()
    if isinstance(body, dict) and 'messages' in body:
        messages = body['messages']
    else:
        messages = body

    # normalize any pydantic-like objects to plain dicts
    norm_messages = []
    for msg in messages:
        if hasattr(msg, 'model_dump'):
            norm_messages.append(msg.model_dump())
        else:
            norm_messages.append(msg)
    messages = norm_messages

    model_inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        return_tensors="pt",
        padding=True
    )

    # debug: log types/shapes to help diagnose tensor issues
    if isinstance(model_inputs, dict):
        print("[qwen_server] model_inputs keys:", list(model_inputs.keys()))
        for k, v in model_inputs.items():
            try:
                print(f"[qwen_server] {k}: type={type(v)}, shape={v.shape}")
            except Exception:
                print(f"[qwen_server] {k}: type={type(v)}")
    else:
        print("[qwen_server] model_inputs is a", type(model_inputs))

    # Normalize inputs for model.generate depending on tokenizer return type
    if isinstance(model_inputs, dict):
        input_ids = model_inputs.get("input_ids")
        attention_mask = model_inputs.get("attention_mask")
    elif hasattr(model_inputs, 'shape'):
        # single tensor returned
        input_ids = model_inputs
        attention_mask = None
    else:
        raise ValueError("Unsupported model_inputs type: " + str(type(model_inputs)))

    try:
        if attention_mask is not None:
            outputs = model.generate(
                input_ids=input_ids,
                attention_mask=attention_mask,
                max_new_tokens=200
            )
        else:
            outputs = model.generate(
                input_ids=input_ids,
                max_new_tokens=200
            )
    except Exception as e:
        print("[qwen_server] model.generate failed:", repr(e))
        try:
            if isinstance(model_inputs, dict):
                print("[qwen_server] model_inputs repr:", {k: (v.shape if hasattr(v, 'shape') else type(v)) for k, v in model_inputs.items()})
            else:
                print("[qwen_server] model_inputs repr:", type(model_inputs), getattr(model_inputs, 'shape', None))
        except Exception:
            pass
        raise

    # ensure outputs is indexable; handle a few possible return formats
    if hasattr(outputs, '__len__') and len(outputs) > 0:
        seq = outputs[0]
    else:
        seq = outputs

    # if seq is a tensor, convert to list for tokenizer.decode
    if hasattr(seq, 'tolist'):
        seq_list = seq.tolist()
    else:
        seq_list = seq

    text = tokenizer.decode(seq_list, skip_special_tokens=True)
    return {"generated_text": text}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5005)
