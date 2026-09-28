'use strict';
// Add only the index required by the Mural; never delete unrelated indexes.
const { execFileSync } = require('node:child_process');
async function ensureIndex() {
  const token = execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8' }).trim();
  const endpoint = 'https://firestore.googleapis.com/v1/projects/louvor-ide/databases/(default)/collectionGroups/notifications/indexes';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const fields = [{ fieldPath: 'userId', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }];
  let created = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    let pageToken = '';
    let index;
    do {
      const response = await fetch(`${endpoint}?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, { headers });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(`Index lookup failed (${response.status}): ${String(failure.error?.message || failure.error?.status || 'unknown').replaceAll(token, '[redacted]')}`);
      }
      const body = await response.json();
      index = (body.indexes || []).find(item => item.queryScope === 'COLLECTION' && item.fields?.length === 3 && fields.every((field, i) => item.fields[i]?.fieldPath === field.fieldPath && item.fields[i]?.order === field.order));
      pageToken = body.nextPageToken || '';
    } while (!index && pageToken);
    if (index?.state === 'READY') { console.log('Notification index ready.'); return; }
    if (index?.state === 'NEEDS_REPAIR') throw new Error('Notification index needs repair.');
    if (!index && !created) {
      const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ queryScope: 'COLLECTION', fields }) });
      if (!response.ok && response.status !== 409) throw new Error(`Index creation failed (${response.status}).`);
      created = true;
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error('Notification index is not ready; hosting was not published.');
}
if (require.main === module) ensureIndex().catch(error => { console.error(error.message); process.exitCode = 1; });
