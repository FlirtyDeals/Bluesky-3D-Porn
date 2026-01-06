import { BskyAgent } from '@atproto/api';
const HANDLES = [
'marvel-rivals-porn.bsky.social',
'star-wars-porn.bsky.social',
'dc-comics-porn.bsky.social',
'resident-evil-porn.bsky.social',
'warcraft-porn.bsky.social'
];


const POLL_INTERVAL = Number(process.env.POLL_INTERVAL || 60) * 1000; // seconds -> ms


let dbPromise;
async function getDb() {
if (!dbPromise) {
dbPromise = open({ filename: './data/feedgen.db', driver: sqlite3.Database });
const db = await dbPromise;
await db.exec(`CREATE TABLE IF NOT EXISTS posts (
post_uri TEXT PRIMARY KEY,
created_at INTEGER,
cid TEXT,
author TEXT
)`);
}
return dbPromise;
}


export async function startSubscription() {
const agent = new BskyAgent({ service: process.env.BSKY_SERVICE || 'https://bsky.social' });
const db = await getDb();


// resolve handles to DIDs
const actors = {};
for (const h of HANDLES) {
try {
const res = await agent.api.app.bsky.actor.getProfile({ actor: h });
if (res && res.data && res.data.did) actors[h] = res.data.did;
} catch (e) {
console.error('Failed to resolve profile for', h, e?.message || e);
}
}


// lastSeen map per actor DID
const lastSeen = {};


async function pollOnce() {
for (const [handle, did] of Object.entries(actors)) {
try {
const feedRes = await agent.api.app.bsky.feed.getAuthorFeed({ actor: did, limit: 50 });
const items = feedRes?.data?.feed || [];
for (const item of items) {
// item may contain a post object at item.post
const post = item.post || item;
const uri = post.uri || post?.id || null;
const cid = post.cid || (post?.cid) || null;
const created = post?.createdAt ? Date.parse(post.createdAt) : Date.now();
if (!uri) continue;


// skip older than lastSeen
if (lastSeen[did] && created <= lastSeen[did]) continue;


await db.run(`INSERT OR REPLACE INTO posts(post_uri, created_at, cid, author) VALUES(?,?,?,?)`, [uri, created, cid || '', did]);
}


if (items.length) {
const newest = items[0]?.post?.createdAt ? Date.parse(items[0].post.createdAt) : Date.now();
lastSeen[did] = Math.max(lastSeen[did] || 0, newest);
}
} catch (e) {
console.error('Failed to fetch author feed for', handle, e?.message || e);
}
}
}


// initial poll
await pollOnce();
// schedule periodic polling
setInterval(pollOnce, POLL_INTERVAL);
console.log('Started polling author feeds for handles:', Object.keys(actors));
}