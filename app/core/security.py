from cryptography.fernet import Fernet
import os

# In a real application, this key should be loaded from a secure environment variable
# and never hardcoded or generated on the fly (unless it's persistent).
# For this prototype, we generate one if not present, but for consistency in tests/runs
# we will use a fixed key or load from env.
_KEY = os.getenv("ENCRYPTION_KEY")
if not _KEY:
    _KEY = Fernet.generate_key().decode()

fernet = Fernet(_KEY.encode())

def encrypt_value(value: str) -> str:
    if not value:
        return None
    return fernet.encrypt(value.encode()).decode()

def decrypt_value(token: str) -> str:
    if not token:
        return None
    try:
        return fernet.decrypt(token.encode()).decode()
    except Exception:
        # If decryption fails (e.g. key changed or invalid data), return as is or None
        return None
