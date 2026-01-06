import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSkeletonForFeed } from './algos/simpleTopic.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
app.use(bodyParser.json());


// serve static logo and assets
app.use('/static', express.static(path.join(__dirname, '..', 'public')));


app.get('/xrpc/app.bsky.feed.getFeedSkeleton', async (req, res) => {
const feed = String(req.query.feed || '');
const cursor = String(req.query.cursor || '');
const limit = Math.min(Number(req.query.limit || 50), 100);


try {
const result = await getSkeletonForFeed(feed, { cursor, limit });
res.json({ cursor: result.cursor ?? null, feed: result.feed.slice(0, limit) });
} catch (err) {
console.error('getFeedSkeleton error', err);
res.status(500).json({ error: 'internal' });
}
});


// health
app.get('/.well-known/health', (req, res) => res.json({ ok: true }));


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));