class AudioPreprocess:
  def __init__(self, audio_file_name):
    self.audio_file_name = audio_file_name
  def process(self):
    print("Preprocessed Audio Successfully")
    return self.audio_file_name