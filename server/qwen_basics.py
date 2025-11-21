from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

MODEL_PATH = "models/qwen2.5-0.5b-instruct"  # your actual path

SYSTEM_PROMPT = """
You are the AI Health Habit Tracker, a friendly wellness assistant.
Your job is to help the user log and reflect on their daily health habits:
sleep, exercise, meals, hydration, and mood.

Follow these rules:
- Be supportive and non-judgmental.
- First, extract what they did today (sleep hours, exercise, meals, water, mood).
- Briefly confirm what you logged in 1–2 sentences.
- Optionally give 1 simple, encouraging suggestion.
- If information is missing or unclear, ask a short follow-up question.
- Do NOT give medical diagnoses or emergency advice; tell them to contact a professional instead.
Keep responses concise (2–5 sentences) unless the user asks for more detail.
"""

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, local_files_only=True)
model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, local_files_only=True)
model.eval()

def chat_with_assistant(user_input: str) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_input},
    ]

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = tokenizer(prompt, return_tensors="pt")
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=200,
            do_sample=True,
            temperature=0.7,
        )

    answer = tokenizer.decode(outputs[0], skip_special_tokens=True)
    # optionally post-process to strip the prompt part if needed
    return answer

if __name__ == "__main__":
    user_msg = "I slept 6 hours, walked for 20 minutes, and drank 3 bottles of water."
    print(chat_with_assistant(user_msg))
