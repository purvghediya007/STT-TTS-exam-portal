import os
import subprocess
from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np
import soundfile as sf
import webrtcvad
from ai_ml.AIExceptions import *


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
    chunks: List[np.ndarray]


class AudioPreprocessorConfig:
    def __init__(
        self,
        target_sample_rate: int = 16000,
        target_channels: int = 1,
        vad_enabled: bool = True,
        vad_mode: int = 2,
        chunk_duration_sec: float = 90.0,
    ):
        self.target_sample_rate = target_sample_rate
        self.target_channels = target_channels
        self.vad_enabled = vad_enabled
        self.vad_mode = vad_mode
        self.chunk_duration_sec = chunk_duration_sec


class AudioPreprocessor:
    def __init__(self, config: Optional[AudioPreprocessorConfig] = None):
        self.config = config or AudioPreprocessorConfig()

    def preprocess_file(
        self,
        input_path: str,
        output_wav_path: Optional[str] = None,
    ) -> PreprocessResult:

        if not os.path.isfile(input_path):
            raise AudioProcessingError(f"File not found: {input_path}")

        wav_path = self._convert_to_pcm_wav(input_path, output_wav_path)
        audio, sr = self._load_audio(wav_path)

        if self.config.vad_enabled:
            audio = self._trim_silence_vad(audio, sr)

        chunks = self._chunk_audio(audio, sr, self.config.chunk_duration_sec)

        metadata = AudioMetadata(
            original_path=os.path.abspath(input_path),
            processed_path=os.path.abspath(wav_path),
            sample_rate=sr,
            duration_sec=len(audio) / sr,
        )

        return PreprocessResult(
            audio=audio,
            sample_rate=sr,
            metadata=metadata,
            chunks=chunks,
        )

    def _convert_to_pcm_wav(self, input_path: str, output_path: Optional[str]) -> str:
        if output_path is None:
            base, _ = os.path.splitext(input_path)
            output_path = base + "_16k.wav"

        cmd = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-acodec", "pcm_s16le",
            "-ac", str(self.config.target_channels),
            "-ar", str(self.config.target_sample_rate),
            output_path,
        ]

        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        except FileNotFoundError as e:
            raise AudioProcessingError("ffmpeg not found") from e

        if result.returncode != 0:
            raise AudioProcessingError(result.stderr)

        return output_path

    def _load_audio(self, wav_path: str) -> Tuple[np.ndarray, int]:
        try:
            audio, sr = sf.read(wav_path, dtype="float32")
        except Exception as e:
            raise AudioProcessingError(f"Failed to load WAV: {wav_path}") from e

        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)

        return audio, sr

    def _trim_silence_vad(self, audio: np.ndarray, sr: int) -> np.ndarray:
        vad = webrtcvad.Vad(self.config.vad_mode)
        frame_ms = 30
        frame_len = int(sr * frame_ms / 1000)

        audio_bytes = (audio * 32768).astype(np.int16).tobytes()
        voiced = []

        num_frames = len(audio_bytes) // (frame_len * 2)
        for i in range(num_frames):
            start = i * frame_len * 2
            end = start + frame_len * 2
            frame = audio_bytes[start:end]
            if vad.is_speech(frame, sr):
                voiced.append(frame)

        if not voiced:
            return audio

        out = b"".join(voiced)
        return np.frombuffer(out, dtype=np.int16).astype(np.float32) / 32768.0

    @staticmethod
    def _chunk_audio(audio: np.ndarray, sr: int, max_sec: float) -> List[np.ndarray]:
        if audio.size == 0 or max_sec <= 0:
            return [audio]

        max_samples = int(sr * max_sec)
        if len(audio) <= max_samples:
            return [audio]

        return [
            audio[i:i + max_samples]
            for i in range(0, len(audio), max_samples)
        ]
