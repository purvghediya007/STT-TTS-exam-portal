import os
import uuid
from gtts import gTTS

 
# Create local folder automatically if not exists
 
BASE_DIR = "generated_audio"

os.makedirs(BASE_DIR, exist_ok=True)


def generate_tts_audio(text: str, language: str = "en", slow: bool = False) -> str:
    """
    Generate speech audio from text using gTTS.
    Saves file locally inside generated_audio/ folder.
    Returns the local file path.
    """

    # Generate audio
    tts = gTTS(text=text, lang=language, slow=slow)

    # Create unique filename
    filename = f"{uuid.uuid4()}.mp3"
    file_path = os.path.join(BASE_DIR, filename)

    # Save to disk
    tts.save(file_path)

    return file_path
