// The API chooses the provider and signs uploads; no provider secrets live here.
export async function mediaRequest(body, getToken, signal) {
  const { appendEnvironmentSearch } = await import('/covermate-environment.mjs');
  const token = await getToken();
  const response = await fetch(appendEnvironmentSearch('/api/media'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body), signal
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(Error(result.message || 'Image storage is unavailable.'), { code: result.error });
  return result;
}

export async function uploadOriginal({ file, remoteUrl, getToken, signal }) {
  const prepared = await mediaRequest({ action: 'prepare', ...(file ? { file: { name: file.name, type: file.type, size: file.size } } : { remoteUrl }) }, getToken, signal);
  if (!prepared.upload || !/^https:\/\//.test(prepared.upload.url) || !prepared.ticket) throw Error('Invalid upload destination.');
  const body = new FormData();
  for (const [key, value] of Object.entries(prepared.upload.fields)) body.set(key, String(value));
  body.set('file', file || remoteUrl);
  const response = await fetch(prepared.upload.url, { method: 'POST', body, signal });
  const result = await response.json();
  if (!response.ok) throw Error('Could not upload the original image.');
  return mediaRequest({ action: 'complete', ticket: prepared.ticket, result }, getToken, signal);
}
