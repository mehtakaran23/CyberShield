importScripts('config.js');
const ANALYZE_URL = `${API_BASE_URL}/analyze`;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'CYBERSHIELD_ANALYZE_PAGE') {
    return false;
  }

  analyzePage(message.payload)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function analyzePage(payload) {
  const response = await fetch(ANALYZE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Analyze request failed with status ${response.status}`);
  }

  return response.json();
}
