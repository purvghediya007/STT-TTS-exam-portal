const { Queue } = require("bullmq");
const connection = require("../config/redis");

const answersTranscriptionQueue = new Queue("answers-transcription", {
  connection,
});

module.exports = answersTranscriptionQueue;
