import subprocess
import os
import uuid

class AudioPreprocess:
    """
    Convert ANY uploaded audio file into a normalized WAV file
    for Whisper / HF ASR pipelines.
    """

    def __init__(self, audio_file_name: str):
        self.original = audio_file_name
        self.output = self._make_temp_wav()

    def _make_temp_wav(self) -> str:
        """
        Convert input file to 16kHz mono WAV using ffmpeg.
        """
        wav_path = os.path.join(
            os.path.dirname(self.original),
            f"preprocessed_{uuid.uuid4().hex}.wav"
        )

        cmd = [
            "ffmpeg",
            "-y",                   # overwrite
            "-i", self.original,   # input
            "-ar", "16000",        # sample rate
            "-ac", "1",            # mono
            wav_path
        ]

        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return wav_path
        except Exception as e:
            print("FFmpeg conversion failed:", e)
            return self.original

    def process(self) -> str:
        print("Audio preprocessed successfully →", self.output)
        return self.output
