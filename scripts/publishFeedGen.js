// Minimal publish helper. You must fill in credentials before running.
// Usage: set environment variables PUBLISH_HANDLE and PUBLISH_PASSWORD, then run `node scripts/publishFeedGen.js`


import fs from 'fs';
import { BskyAgent } from '@atproto/api';


const SERVICE_HOSTNAME = process.env.FEEDGEN_HOSTNAME || 'bluesky-3d-porn.onrender.com';
const FEED_NAME = '3D Porn - Rule 34';
const FEED_DESC = 'Rule 34 Porn from popular video games, featuring iconic game characters';
const LOGO_URL = `https://${SERVICE_HOSTNAME}/static/3d-porn.png`;


async function publish() {
const handle = process.env.PUBLISH_HANDLE; // e.g. yourhandle.bsky.social
const password = process.env.PUBLISH_PASSWORD; // app password or account password
if (!handle || !password) {
console.error('Set PUBLISH_HANDLE and PUBLISH_PASSWORD env vars first');
process.exit(1);
}


const agent = new BskyAgent({ service: 'https://bsky.social' });
await agent.login({ identifier: handle, password });


const feedDeclaration = {
// The shape follows Bluesky feed generator declaration roughly.
// You may need to adjust fields to match the exact schema in the repo you use to publish.
did: agent.session?.did,
name: FEED_NAME,
description: FEED_DESC,
avatar: LOGO_URL,
version: '1',
// public URL where Bluesky will fetch feed skeleton
service: `https://${SERVICE_HOSTNAME}`
};


// Example: store the declaration as a blob in your repo using the agent's repo methods
// The exact code to create a record depends on your account repo setup.
// This is a placeholder to show where publishing happens.
console.log('Feed declaration prepared, but publish step is left for you to adapt to your repo workflow.');
console.log(JSON.stringify(feedDeclaration, null, 2));
}


publish().catch(err => console.error(err));