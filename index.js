// index.js
import './src/server.js';
import { startSubscription } from './src/subscription.js';

(async () => {
  try {
    // Start the feed polling/indexer
    await startSubscription();
    console.log('Feed subscription started successfully.');
  } catch (err) {
    console.error('Failed to start feed subscription:', err);
    process.exit(1);
  }
})();
