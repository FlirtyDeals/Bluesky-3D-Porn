import sqlite3 from 'sqlite3';
import { open } from 'sqlite';


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


export async function getSkeletonForFeed(feedUri, opts = {}) {
const limit = opts.limit || 50;
const cursor = opts.cursor || `${Date.now()}::z`;
const db = await getDb();


// cursor format: timestamp::cid
const rows = await db.all(
`SELECT post_uri, created_at, cid FROM posts WHERE (created_at || '::' || cid) < ? ORDER BY created_at DESC LIMIT ?`,
[cursor, limit]
);


const feed = rows.map(r => ({ post: r.post_uri }));
const nextCursor = rows.length ? `${rows[rows.length - 1].created_at}::${rows[rows.length - 1].cid}` : null;
return { feed, cursor: nextCursor };
}