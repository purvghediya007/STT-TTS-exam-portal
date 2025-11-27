# !apt-get install ffmpeg -y # RUN THIS COMMAND IN DOCKER

"""
Module for conversion of speech audio fetched by FastAPI to text format in given language format

How to run? 
stt = STT(lang="en",model="whisper",audio_file_name=audio_file_path)
stt.transcribe()
print(stt.transcription_list)


"""

# Requirements
try:
  import warnings
  warnings.filterwarnings("ignore")

  import whisper
  from transformers import pipeline

  from AudioPreprocess import AudioPreprocess
  from AIExceptions import *

except Exception as e:
  print("Could not find certain modules! Details: ",e)

class ModelGenerator:
  _whisper_model = None
  _hf_model = None

  def __init__(self, model):
    self.model = model

  @classmethod
  def whisper_model_generator(cls):
    if cls._whisper_model is None:
      whisper_model = whisper.load_model("base")
    return whisper_model

  @classmethod
  def hf_model_generator(cls):
    if cls._hf_model is None:
      asr_pipeline = pipeline("automatic-speech-recognition", model='openai/whisper-large-v3', device=0)

    return asr_pipeline

class STT:
  def __init__(self, lang, model, audio_file_name):
    self.lang: str = lang.lower()
    self.model: str = model.lower()
    self.audio_file_name: str = audio_file_name
    self.transcription_list: list[str] = []
    self.new_student: bool = True


  def audio_preprocess(self):
    preprocessor = AudioPreprocess(self.audio_file_name)
    self.audio_preprocessed = preprocessor.process()
    return self.audio_preprocessed

  def whisper_transcribe(self):
    try:
      whisper_model = ModelGenerator.whisper_model_generator()

      audio_preprocessed = self.audio_preprocess()

      transcription_data = whisper_model.transcribe(audio_preprocessed, language = self.lang)

      transcription = transcription_data["text"]

      return transcription

    except Exception as e:
      print("Error while accessing whisper model. Please try changing model")
      print("Details: ",e)

  def hf_transcribe(self):
    try:

      asr_pipeline = ModelGenerator.hf_model_generator()

      audio_preprocessed = self.audio_preprocess()

      transcription_data = asr_pipeline(audio_preprocessed)

      transcription = transcription_data["text"]

      return transcription

    except Exception as e:
      print("Error while accessing hugging face model. Please try changing model")
      print("Details: ",e)


  def model_selector(self):
    match self.model:
      case "whisper":
        return self.whisper_transcribe()

      case "hf":
        return self.hf_transcribe()

      case _:
        raise IllegalModelSelectionException(f"Model type {self.model} not found. Try a different model type")


  def transcribe(self):
    try:
      transcription = self.model_selector()
      self.transcription_list.append(transcription)

    except Exception as e:
      print(e)


