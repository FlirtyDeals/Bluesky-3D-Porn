// scripts/publishFeedGen.js
// Robust publish script: verifies PNG, fetches if needed, uploads blob with forced mimeType,
// then publishes an app.bsky.feed.generator record.
// Requires env vars: PUBLISH_HANDLE, PUBLISH_PASSWORD, FEEDGEN_HOSTNAME

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import pkg from '@atproto/api';
const { BskyAgent } = pkg;

const SERVICE_HOSTNAME = process.env.FEEDGEN_HOSTNAME || 'bluesky-3d-porn.onrender.com';
const FEED_NAME = '3D Porn - Rule 34';
const FEED_DESC = 'Rule 34 Porn from popular video games, featuring iconic game characters';
const LOCAL_LOGO_PATH = path.join('public', '3d-porn.png');
const REMOTE_LOGO_URL = `https://${SERVICE_HOSTNAME}/static/3d-porn.png`;

// helper: pick blob ref from various shapes
function extractAvatarRef(uploadResp) {
  const d = uploadResp?.data ?? uploadResp;
  if (!d) return null;
  if (d.blob) return d.blob;
  if (d.cid) return { cid: d.cid };
  if (d.ref) return { ref: d.ref };
  if (uploadResp?.ref) return uploadResp.ref;
  return d;
}

async function loadImageBytes() {
  // try local file first
  if (fs.existsSync(LOCAL_LOGO_PATH)) {
    const buf = fs.readFileSync(LOCAL_LOGO_PATH);
    const header = buf.slice(0, 8).toString('hex');
    console.log('Local file found. first 8 bytes (hex):', header);
    // PNG signature is: 89 50 4E 47 0D 0A 1A 0A => hex: 89504e470d0a1a0a
    if (header === '89504e470d0a1a0a') {
      console.log('Local file looks like a valid PNG.');
      return { buffer: buf, source: 'local' };
    } else {
      console.warn('Local file does not have a PNG signature. Will attempt to fetch from remote URL.');
    }
  } else {
    console.warn(`Local logo not found at ${LOCAL_LOGO_PATH}. Will attempt to fetch from remote URL.`);
  }

  // fallback: fetch remote copy from your Render site
  console.log('Fetching remote logo from:', REMOTE_LOGO_URL);
  const res = await fetch(REMOTE_LOGO_URL);
  if (!res.ok) throw new Error(`Failed to fetch remote logo, status ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  const header = buf.slice(0, 8).toString('hex');
  console.log('Remote file first 8 bytes (hex):', header);
  if (header !== '89504e470d0a1a0a') {
    throw new Error('Remote file is not a PNG (signature mismatch). Please ensure the file at the URL is a PNG image.');
  }
  return { buffer: buf, source: 'remote' };
}

async function uploadBlobViaXrpc(agent, buffer) {
  // Direct POST to the xrpc upload endpoint. This ensures raw bytes and correct content-type.
  const service = agent?.service || 'https://bsky.social';
  const url = `${service.replace(/\/+$/, '')}/xrpc/com.atproto.repo.uploadBlob`;
  const token = agent?.session?.accessJwt;
  if (!token) throw new Error('No access token available on agent.session.accessJwt');

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'image/png',
      'Content-Length': String(buffer.length),
    },
    body: buffer,
  });

  const text = await resp.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    // Some endpoints may return non-JSON on error. Throw with raw text for debugging.
    if (!resp.ok) throw new Error(`Upload failed, status ${resp.status}, body: ${text}`);
    throw new Error('Upload returned non-JSON response but status was OK. Body: ' + text);
  }

  if (!resp.ok) {
    throw new Error(`Upload failed, status ${resp.status}, body: ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

async function publish() {
  const handle = process.env.PUBLISH_HANDLE;
  const password = process.env.PUBLISH_PASSWORD;

  if (!handle || !password) {
    console.error('Set PUBLISH_HANDLE and PUBLISH_PASSWORD environment variables first!');
    process.exit(1);
  }

  const agent = new BskyAgent({ service: 'https://bsky.social' });
  try {
    await agent.login({ identifier: handle, password });
    console.log('Logged in as', handle);
  } catch (err) {
    console.error('Login failed:', err?.message ?? err);
    process.exit(1);
  }

  // load image bytes (local preferred, remote fallback)
  let img;
  try {
    img = await loadImageBytes();
    console.log(`Using ${img.source} image (${img.buffer.length} bytes)`);
  } catch (err) {
    console.error('Failed to load image bytes:', err?.message ?? err);
    process.exit(1);
  }

  // upload blob forcing mimeType image/png
  let uploadResp;
  try {
    // Preferred: use SDK convenience method if it accepts Buffer correctly.
    if (typeof agent.uploadBlob === 'function') {
      try {
        // Try passing raw Buffer. Some SDK builds accept Buffer directly.
        uploadResp = await agent.uploadBlob(img.buffer, { encoding: 'image/png' });
      } catch (innerErr) {
        console.warn('agent.uploadBlob failed or produced an unexpected result. Falling back to direct xrpc POST.', innerErr?.message ?? innerErr);
        uploadResp = await uploadBlobViaXrpc(agent, img.buffer);
      }
    } else {
      // If SDK method not present, use direct xrpc POST.
      uploadResp = await uploadBlobViaXrpc(agent, img.buffer);
    }

    // Show a compact preview
    const previewKeys = uploadResp && typeof uploadResp === 'object' ? Object.keys(uploadResp).slice(0, 8) : typeof uploadResp;
    console.log('uploadResp preview:', previewKeys);
  } catch (err) {
    console.error('Blob upload failed:', err?.data ?? err?.message ?? err);
    process.exit(1);
  }

  const avatarRef = extractAvatarRef(uploadResp);
  if (!avatarRef) {
    console.error('Could not extract blob ref from upload response:', uploadResp);
    process.exit(1);
  }
  console.log('Using avatar blob ref:', avatarRef);

const SERVICE_DID = `did:web:${SERVICE_HOSTNAME}`;

const record = {
  displayName: FEED_NAME,
  // point the feed declaration at the web DID that hosts your service
  did: SERVICE_DID,
  name: FEED_NAME,
  description: FEED_DESC,
  avatar: avatarRef,
  version: '1',
  service: `https://${SERVICE_HOSTNAME}`,
  createdAt: new Date().toISOString()
};

  try {
    const res = await agent.api.com.atproto.repo.putRecord({
      repo: agent.session.did,
      collection: 'app.bsky.feed.generator',
      rkey: '3d-porn',
      record,
    });
    console.log('Feed published successfully.');
    console.log('Response:', res.data ?? res);
  } catch (err) {
    console.error('Failed to publish feed record:', err?.data ?? err?.message ?? err);
    process.exit(1);
  }
}

publish().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
