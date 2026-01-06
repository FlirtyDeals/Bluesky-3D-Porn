// src/algos/simpleTopic.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let dbPromise;
async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: './data/feedgen.db',
      driver: sqlite3.Database
    });
  }
  return dbPromise;
}

export async function getSkeletonForFeed(feedUri, opts = {}) {
  const limit = opts.limit || 50;
  const cursor = opts.cursor || `${Date.now()}::z`;
  const db = await getDb();

  // cursor format is "timestamp::cid"
  const rows = await db.all(
    `SELECT post_uri, created, cid FROM posts
     WHERE (created || '::' || cid) < ?
     ORDER BY created DESC
     LIMIT ?`,
    [cursor, limit]
  );

  const feed = rows.map(r => ({ post: r.post_uri }));
  const nextCursor = rows.length
    ? `${rows[rows.length - 1].created}::${rows[rows.length - 1].cid}`
    : null;

  return { feed, cursor: nextCursor };
}
