const IORedis = require("ioredis");

const connection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,

  // BullMQ requires this
  maxRetriesPerRequest: null,

  retryStrategy(times) {
    if (times > 15) {
      console.error("❌ Redis: Max retries reached.");
      return null;
    }

    const delay = Math.min(times * 200, 5000);
    console.log(`⏳ Redis reconnecting (${times}/15)...`);
    return delay;
  },
});

connection.on("connect", () => {
  console.log("✅ Connected to local Redis");
});

connection.on("ready", () => {
  console.log("✅ Redis ready");
});

connection.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
});

connection.on("close", () => {
  console.log("⚠️ Redis connection closed");
});

module.exports = connection;
