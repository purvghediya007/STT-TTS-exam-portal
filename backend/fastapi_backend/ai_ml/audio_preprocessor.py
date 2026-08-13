"""Convert uploads to mono 16 kHz WAV and remove silence before STT."""
from __future__ import annotations

import logging
import os
import subprocess
from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np
import soundfile as sf
import webrtcvad

from ai_ml.exceptions import AudioProcessingError

logger = logging.getLogger(__name__)


@dataclass
class AudioMetadata:
    original_path: str
    processed_path: str
    sample_rate: int
    duration_sec: float


@dataclass
class PreprocessResult:
    audio: np.ndarray
    sample_rate: int
    metadata: AudioMetadata


@dataclass
class AudioPreprocessorConfig:
    target_sample_rate: int = 16_000
    target_channels: int = 1
    vad_enabled: bool = True
    vad_mode: int = 2


class AudioPreprocessor:
    def __init__(self, config: Optional[AudioPreprocessorConfig] = None) -> None:
        self.config = config or AudioPreprocessorConfig()

    def preprocess_file(self, input_path: str, output_wav_path: Optional[str] = None) -> PreprocessResult:
        if not os.path.isfile(input_path):
            raise AudioProcessingError(f"Audio file not found: {input_path}")
        wav_path = self._convert_to_pcm_wav(input_path, output_wav_path)
        audio, sr = self._load_audio(wav_path)
        if self.config.vad_enabled:
            audio = self._trim_silence_vad(audio, sr)
        sf.write(wav_path, audio, sr, subtype="PCM_16")
        metadata = AudioMetadata(os.path.abspath(input_path), os.path.abspath(wav_path), sr, len(audio) / sr)
        logger.debug("Pre-processing complete: %.2f seconds -> %s", metadata.duration_sec, wav_path)
        return PreprocessResult(audio=audio, sample_rate=sr, metadata=metadata)

    def _convert_to_pcm_wav(self, input_path: str, output_path: Optional[str]) -> str:
        if output_path is None:
            base, _ = os.path.splitext(input_path)
            output_path = f"{base}_16k.wav"
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", input_path, "-acodec", "pcm_s16le", "-ac", str(self.config.target_channels), "-ar", str(self.config.target_sample_rate), output_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        if result.returncode != 0:
            raise AudioProcessingError(f"ffmpeg conversion failed (exit {result.returncode}): {result.stderr}")
        return output_path

    def _load_audio(self, wav_path: str) -> Tuple[np.ndarray, int]:
        try:
            audio, sr = sf.read(wav_path, dtype="float32")
        except Exception as exc:
            raise AudioProcessingError(f"Failed to load WAV file '{wav_path}'.") from exc
        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)
        return audio, sr

    def _trim_silence_vad(self, audio: np.ndarray, sr: int) -> np.ndarray:
        vad = webrtcvad.Vad(self.config.vad_mode)
        frame_len = int(sr * 30 / 1000)
        audio_bytes = (audio * 32768).astype(np.int16).tobytes()
        voiced: List[bytes] = []
        for i in range(len(audio_bytes) // (frame_len * 2)):
            frame = audio_bytes[i * frame_len * 2:(i + 1) * frame_len * 2]
            if vad.is_speech(frame, sr):
                voiced.append(frame)
        if not voiced:
            return audio
        return np.frombuffer(b"".join(voiced), dtype=np.int16).astype(np.float32) / 32768.0
