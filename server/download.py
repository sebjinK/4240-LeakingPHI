# download_qwen.py
import os
from dotenv import load_dotenv
from huggingface_hub import login, snapshot_download

def main():
    load_dotenv()
    hf_token = os.getenv("HF_TOKEN")

    if not hf_token:
        raise RuntimeError("HF_TOKEN not found in .env")

    login(hf_token)

    repo_id = "Qwen/Qwen2.5-0.5B-Instruct"   # <--- Qwen model
    # you can change this folder name if you want
    local_dir = "models/qwen2.5-0.5b-instruct"

    print(f"Downloading {repo_id} to {local_dir} ...")
    path = snapshot_download(
        repo_id=repo_id,
        local_dir=local_dir,
        local_dir_use_symlinks=False,
    )
    print("Done! Actual path:", path)

if __name__ == "__main__":
    main()
