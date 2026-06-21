"""
Audio preprocessing pipeline for STT input.

Converts arbitrary audio formats to 16 kHz mono PCM WAV,
optionally trims silence via WebRTC VAD, and chunks long recordings
into segments of a configurable maximum duration.
"""

from __future__ import annotations

import logging
import os
import subprocess
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np
import soundfile as sf
import webrtcvad

from ai_ml.exceptions import AudioProcessingError

logger = logging.getLogger(__name__)


@dataclass
class AudioMetadata:
    """Metadata produced after preprocessing an audio file."""

    original_path: str
    processed_path: str
    sample_rate: int
    duration_sec: float


@dataclass
class PreprocessResult:
    """Full result returned by :meth:`AudioPreprocessor.preprocess_file`."""

    audio: np.ndarray
    sample_rate: int
    metadata: AudioMetadata
    chunks: List[np.ndarray] = field(default_factory=list)


@dataclass
class AudioPreprocessorConfig:
    """
    Tunable parameters for the audio preprocessing pipeline.

    Attributes:
        target_sample_rate: Output sample rate in Hz (Whisper expects 16 000).
        target_channels:    Output channel count (1 = mono).
        vad_enabled:        Whether to trim leading/trailing silence.
        vad_mode:           WebRTC VAD aggressiveness (0–3; higher = stricter).
        chunk_duration_sec: Maximum duration of each audio chunk in seconds.
    """

    target_sample_rate: int = 16_000
    target_channels: int = 1
    vad_enabled: bool = True
    vad_mode: int = 2
    chunk_duration_sec: float = 90.0


class AudioPreprocessor:
    """
    Converts, cleans, and chunks audio files for downstream STT.

    Usage::

        preprocessor = AudioPreprocessor()
        result = preprocessor.preprocess_file("/path/to/input.webm")
        # result.metadata.processed_path  → 16 kHz WAV
        # result.chunks                   → list of numpy arrays
    """

    def __init__(self, config: Optional[AudioPreprocessorConfig] = None) -> None:
        self.config = config or AudioPreprocessorConfig()

    # Public API

    def preprocess_file(
        self,
        input_path: str,
        output_wav_path: Optional[str] = None,
    ) -> PreprocessResult:
        """
        Full preprocessing pipeline for a single audio file.

        Args:
            input_path:      Path to the source audio file.
            output_wav_path: Optional explicit path for the converted WAV.
                             Defaults to ``<input_stem>_16k.wav`` alongside the source.

        Returns:
            :class:`PreprocessResult` containing the numpy audio array,
            sample rate, metadata, and chunks.

        Raises:
            AudioProcessingError: If the file is missing, ffmpeg is not found,
                                  or audio loading fails.
        """
        if not os.path.isfile(input_path):
            raise AudioProcessingError(f"Audio file not found: {input_path}")

        logger.debug("Pre-processing audio file: %s", input_path)

        wav_path = self._convert_to_pcm_wav(input_path, output_wav_path)
        audio, sr = self._load_audio(wav_path)

        if self.config.vad_enabled:
            audio = self._trim_silence_vad(audio, sr)

        chunks = self._chunk_audio(audio, sr, self.config.chunk_duration_sec)
        duration = len(audio) / sr

        logger.debug(
            "Pre-processing complete: %.2f s, %d chunk(s) → %s",
            duration,
            len(chunks),
            wav_path,
        )

        metadata = AudioMetadata(
            original_path=os.path.abspath(input_path),
            processed_path=os.path.abspath(wav_path),
            sample_rate=sr,
            duration_sec=duration,
        )

        return PreprocessResult(audio=audio, sample_rate=sr, metadata=metadata, chunks=chunks)

    # Private helpers

    def _convert_to_pcm_wav(self, input_path: str, output_path: Optional[str]) -> str:
        if output_path is None:
            base, _ = os.path.splitext(input_path)
            output_path = f"{base}_16k.wav"

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-acodec", "pcm_s16le",
            "-ac", str(self.config.target_channels),
            "-ar", str(self.config.target_sample_rate),
            output_path,
        ]

        try:
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
        except FileNotFoundError as exc:
            raise AudioProcessingError(
                "ffmpeg not found. Install it and ensure it is on PATH."
            ) from exc

        if result.returncode != 0:
            raise AudioProcessingError(
                f"ffmpeg conversion failed (exit {result.returncode}): {result.stderr}"
            )

        return output_path

    def _load_audio(self, wav_path: str) -> Tuple[np.ndarray, int]:
        try:
            audio, sr = sf.read(wav_path, dtype="float32")
        except Exception as exc:
            raise AudioProcessingError(f"Failed to load WAV file '{wav_path}'.") from exc

        # Downmix to mono if needed
        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)

        return audio, sr

    def _trim_silence_vad(self, audio: np.ndarray, sr: int) -> np.ndarray:
        """Remove non-speech frames using WebRTC VAD."""
        vad = webrtcvad.Vad(self.config.vad_mode)
        frame_ms = 30
        frame_len = int(sr * frame_ms / 1000)

        audio_bytes = (audio * 32_768).astype(np.int16).tobytes()
        voiced_frames: List[bytes] = []

        num_frames = len(audio_bytes) // (frame_len * 2)
        for i in range(num_frames):
            start = i * frame_len * 2
            frame = audio_bytes[start : start + frame_len * 2]
            if vad.is_speech(frame, sr):
                voiced_frames.append(frame)

        if not voiced_frames:
            logger.debug("VAD found no speech; returning original audio unchanged.")
            return audio

        out_bytes = b"".join(voiced_frames)
        return np.frombuffer(out_bytes, dtype=np.int16).astype(np.float32) / 32_768.0

    @staticmethod
    def _chunk_audio(audio: np.ndarray, sr: int, max_sec: float) -> List[np.ndarray]:
        if audio.size == 0 or max_sec <= 0:
            return [audio]

        max_samples = int(sr * max_sec)
        if len(audio) <= max_samples:
            return [audio]

        return [audio[i : i + max_samples] for i in range(0, len(audio), max_samples)]
