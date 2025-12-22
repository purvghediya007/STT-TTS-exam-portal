const { Queue } = require("bullmq");
const connection = require("../config/redis");

const aiQueue = new Queue("ai-processing", {
  connection,
});

module.exports = aiQueue;
