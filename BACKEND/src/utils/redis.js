import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    // Stop trying to reconnect after 3 attempts so the app doesn't crash
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        console.warn('⚠️ Redis server not found. App will run normally without caching.');
        return new Error('Retry time exhausted');
      }
      return 500; // wait 500ms before retrying
    }
  }
});

redisClient.on('error', (err) => {
  // Only log the error if it's NOT a connection refusal (to prevent spam)
  if (err.code !== 'ECONNREFUSED') {
    console.error('Redis Client Error', err);
  }
});

redisClient.on('connect', () => console.log('✅ Redis Connected Successfully...'));

// Connect asynchronously without crashing the main thread
redisClient.connect().catch(() => {
  console.log("ℹ️ Skipping Redis connection for local development.");
});

export default redisClient;