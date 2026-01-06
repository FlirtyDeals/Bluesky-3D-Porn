// src/algos/simpleTopic.js
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'feedgen.db');

let dbPromise;
async function getDb() {
  if (!dbPromise) {
    // Ensure data directory exists and is writable
    await fs.promises.mkdir(DATA_DIR, { recursive: true });

    dbPromise = open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    // Ensure schema exists
    const db = await dbPromise;
    await db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        post_uri TEXT PRIMARY KEY,
        author TEXT,
        created INTEGER,
        cid TEXT
      )
    `);
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
