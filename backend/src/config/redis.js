const IORedis = require("ioredis");

console.log(
  "[Redis Config] REDIS_URL:",
  process.env.REDIS_URL
    ? "SET (length: " + process.env.REDIS_URL.length + ")"
    : "NOT SET"
);
console.log("[Redis Config] URL value:", process.env.REDIS_URL);

// Support ONLY Upstash Redis (cloud)
const redisConfig = {
  maxRetriesPerRequest: null, // ✅ REQUIRED BY BULLMQ
  tls: {
    rejectUnauthorized: false, // Required for Upstash
  },
  connectTimeout: 15000, // 15 seconds - Upstash can be slow initially
  commandTimeout: 10000,
  retryStrategy: (times) => {
    if (times > 15) {
      console.error(
        "❌ Redis: Max retries (15) reached. Check your REDIS_URL in .env"
      );
      return null; // Stop retrying
    }
    const delay = Math.min(times * 200, 5000);
    console.log(`⏳ Redis: Retrying connection... (attempt ${times}/15)`);
    return delay;
  },
};

// Parse REDIS_URL manually for IORedis
if (process.env.REDIS_URL) {
  const url = new URL(process.env.REDIS_URL);
  redisConfig.host = url.hostname;
  redisConfig.port = parseInt(url.port);
  redisConfig.password = url.password || undefined;
  console.log("[Redis Config] Parsed - Host:", url.hostname, "Port:", url.port);
}

const connection = new IORedis(redisConfig);

// Log connection status
connection.on("connect", () => {
  console.log("✅ Redis connected to Upstash");
});

connection.on("ready", () => {
  console.log("✅ Redis ready to accept commands");
});

connection.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
  // Don't crash the app - ioredis will auto-reconnect
});

connection.on("close", () => {
  console.log("⚠️  Redis connection closed");
});

connection.on("reconnecting", (delay) => {
  console.log(`🔄 Redis reconnecting in ${delay}ms...`);
});

module.exports = connection;
