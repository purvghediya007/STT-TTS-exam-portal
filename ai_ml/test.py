from pathlib import Path

current_folder_path = Path(__file__).parent
main_folder = current_folder_path.parent
audio_file = main_folder / "test_audios" / "audio_test_whisper.wav"

print(audio_file)
