// src/subscription.js
import pkg from '@atproto/api';
const { BskyAgent } = pkg;

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DB_PATH = '/tmp/feedgen.db';

// Handles included in feed
const HANDLES = [
  'marvel-rivals-porn.bsky.social',
  'star-wars-porn.bsky.social',
  'dc-comics-porn.bsky.social',
  'resident-evil-porn.bsky.social',
  'warcraft-porn.bsky.social'
];

const POLL_INTERVAL = Number(process.env.POLL_INTERVAL || 300);

let dbPromise;

async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

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

export async function startSubscription() {
  const agent = new BskyAgent({
    service: process.env.BSKY_SERVICE || 'https://bsky.social'
  });

  try {
    await agent.login({
      identifier: process.env.FEED_POLL_HANDLE,
      password: process.env.FEED_POLL_PASSWORD
    });
    console.log('Poll agent logged in');
  } catch (err) {
    console.warn('Poll agent login failed', err?.message || err);
  }

  async function pollOnce() {
    const db = await getDb();

    for (const handle of HANDLES) {
      try {
        const feedRes = await agent.api.app.bsky.feed.getAuthorFeed({
          actor: handle,
          limit: 50
        });

        const feedItems = feedRes?.data?.feed || [];

        for (const item of feedItems) {
          const post = item.post || item;
          if (!post?.cid || !post?.uri) continue;

          const created = post.createdAt
            ? Date.parse(post.createdAt)
            : Date.now();

          await db.run(
            `INSERT OR REPLACE INTO posts
             (post_uri, author, created, cid)
             VALUES (?,?,?,?)`,
            [post.uri, handle, created, post.cid]
          );
        }
      } catch (err) {
        console.error('Failed to poll author feed', handle, err?.message || err);
      }
    }
  }

  await pollOnce();
  setInterval(pollOnce, POLL_INTERVAL * 1000);
  console.log('Polling started');
}
