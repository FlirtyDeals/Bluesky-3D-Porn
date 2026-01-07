// scripts/listGenerators.js
import pkg from '@atproto/api';
const { BskyAgent } = pkg;

async function main(){
  const handle = process.env.PUBLISH_HANDLE;
  const password = process.env.PUBLISH_PASSWORD;
  if(!handle||!password) throw new Error('Set PUBLISH_HANDLE and PUBLISH_PASSWORD');

  const agent = new BskyAgent({ service: 'https://bsky.social' });
  await agent.login({ identifier: handle, password });
  console.log('logged in did:', agent.session?.did);

  const res = await agent.api.com.atproto.repo.listRecords({
    repo: agent.session.did,
    collection: 'app.bsky.feed.generator',
    limit: 100
  });
  console.log(JSON.stringify(res.data ?? res, null, 2));
}
main().catch(e=>{
  console.error(e);
  process.exit(1);
});
