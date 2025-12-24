const { Queue } = require("bullmq");
const connection = require("../config/redis");

const answersEvaluationQueue = new Queue("answers-evaluation", {
  connection,
});

module.exports = answersEvaluationQueue;
