
const STATS_URL = `${API_BASE_URL}/stats`;
const HEALTH_URL = `${API_BASE_URL}/health`;
const STORAGE_KEY = 'cybershieldLastScan';

document.addEventListener('DOMContentLoaded', () => {
  loadPopup().catch((error) => {
    setBackendStatus(`Unable to load popup data: ${error.message}`, true);
  });
});

async function loadPopup() {
  bindActions();
  await Promise.all([loadStats(), loadCurrentTabScan(), loadHealth()]);
}

function bindActions() {
  document.getElementById('scan-now').onclick = rescanCurrentTab;
  document.getElementById('refresh-popup').onclick = async () => {
    const button = document.getElementById('refresh-popup');
    button.disabled = true;
    button.textContent = 'Refreshing...';

    try {
      await refreshPanel();
    } catch (error) {
      setBackendStatus(`Unable to refresh popup data: ${error.message}`, true);
    } finally {
      button.disabled = false;
      button.textContent = 'Refresh panel';
    }
  };
}

async function loadStats() {
  try {
    const response = await fetch(STATS_URL);
    if (!response.ok) {
      throw new Error(`Stats request failed with ${response.status}`);
    }

    const data = await response.json();
    document.getElementById('total').textContent = data.total ?? 0;
    document.getElementById('high').textContent = data.high ?? 0;
    document.getElementById('medium').textContent = data.medium ?? 0;
    document.getElementById('safe').textContent = data.low ?? 0;
  } catch (error) {
    document.getElementById('total').textContent = '-';
    document.getElementById('high').textContent = '-';
    document.getElementById('medium').textContent = '-';
    document.getElementById('safe').textContent = '-';
    setBackendStatus(`Backend offline: ${error.message}`, true);
  }
}

async function loadHealth() {
  try {
    const response = await fetch(HEALTH_URL);
    if (!response.ok) {
      throw new Error(`Health request failed with ${response.status}`);
    }

    const data = await response.json();
    setBackendStatus(
      `Backend live. Storage: ${data.storageMode}. Analysis: ${data.analysisMode}.`,
      false,
    );
  } catch (error) {
    setBackendStatus(`Backend offline: ${error.message}`, true);
  }
}

async function loadCurrentTabScan() {
  const activeTab = await getActiveTab();
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const result = stored[STORAGE_KEY];
  const statusLabel = document.getElementById('scan-status');
  const detail = document.getElementById('scan-detail');
  const patterns = document.getElementById('scan-patterns');
  const host = document.getElementById('scan-host');
  const time = document.getElementById('scan-time');
  const activeUrl = activeTab?.url || '';

  host.textContent = activeUrl ? formatHost(activeUrl) : 'Waiting for page...';

  if (!result || (activeUrl && result.url && result.url !== activeUrl)) {
    statusLabel.textContent = 'No scan yet';
    detail.textContent = 'Open a suspicious page or click "Scan current tab".';
    patterns.innerHTML = '';
    time.textContent = 'No recent scan';
    applyRiskTone('IDLE');
    return;
  }

  host.textContent = formatHost(result.url);
  time.textContent = result.scannedAt ? formatRelativeTime(result.scannedAt) : 'Time unavailable';

  if (result.skipped) {
    statusLabel.textContent = 'Scan skipped';
    detail.textContent = result.reason;
    patterns.innerHTML = '';
    applyRiskTone('IDLE');
    return;
  }

  if (result.error) {
    statusLabel.textContent = 'Scan failed';
    detail.textContent = result.error;
    patterns.innerHTML = '';
    applyRiskTone('HIGH');
    return;
  }

  statusLabel.textContent = `${result.riskLevel} risk (${result.score}/100)`;
  detail.textContent = result.reason;
  patterns.innerHTML = (result.patterns || [])
    .map((pattern) => `<span class="pattern-pill">${escapeHtml(pattern)}</span>`)
    .join('');
  applyRiskTone(result.riskLevel);
}

async function rescanCurrentTab() {
  const button = document.getElementById('scan-now');
  button.disabled = true;
  button.textContent = 'Scanning...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found.');
    }

    if (!tab.url || !/^https?:/i.test(tab.url)) {
      throw new Error('This page cannot be scanned. Open a normal website tab and try again.');
    }

    const pagePayload = await collectPagePayload(tab.id);
    const result = await analyzeCurrentTab(pagePayload);
    await chrome.storage.local.set({ [STORAGE_KEY]: result });
    await renderResultInTab(tab);
    await Promise.all([loadCurrentTabScan(), loadStats()]);
  } catch (error) {
    setBackendStatus(`Manual scan failed: ${error.message}`, true);
  } finally {
    button.disabled = false;
    button.textContent = 'Scan current tab';
  }
}

async function refreshPanel() {
  const activeTab = await getActiveTab();

  if (activeTab?.id && activeTab.url && /^https?:/i.test(activeTab.url)) {
    try {
      await ensureContentScript(activeTab);
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type: 'CYBERSHIELD_SCAN_PAGE',
        force: false,
      });

      if (response?.ok && response.result) {
        await chrome.storage.local.set({ [STORAGE_KEY]: response.result });
      }
    } catch (error) {
      console.debug('CyberShield refresh could not rescan active tab:', error.message);
    }
  }

  await Promise.all([loadStats(), loadCurrentTabScan(), loadHealth()]);
}

async function ensureContentScript(tab) {
  if (!tab?.id) {
    throw new Error('No active tab found.');
  }

  if (!tab.url || !/^https?:/i.test(tab.url)) {
    throw new Error('This page cannot be scanned. Open a normal website tab and try again.');
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'CYBERSHIELD_PING' });
    return;
  } catch (error) {
    if (!String(error.message || '').includes('Receiving end does not exist')) {
      throw error;
    }
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
  });
}

async function collectPagePayload(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({
      url: window.location.href,
      content: (document.body?.innerText || '').trim(),
    }),
  });

  if (!result?.content) {
    throw new Error('No readable page text found.');
  }

  return result;
}

async function analyzeCurrentTab(payload) {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Analyze request failed with status ${response.status}`);
  }

  const data = await response.json();
  const result = {
    ...data,
    url: payload.url,
    skipped: false,
    scannedAt: new Date().toISOString(),
    source: 'manual',
  };
  return result;
}

async function renderResultInTab(tab) {
  try {
    await ensureContentScript(tab);
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    await chrome.tabs.sendMessage(tab.id, {
      type: 'CYBERSHIELD_RENDER_RESULT',
      result: stored[STORAGE_KEY],
    });
  } catch {
    // The popup still works even if the page cannot render the overlay.
  }
}

function setBackendStatus(message, isError) {
  const el = document.getElementById('backend-status');
  el.textContent = message;
  el.className = isError ? 'status status-error' : 'status status-ok';
}

function applyRiskTone(riskLevel) {
  const chip = document.getElementById('scan-chip');
  chip.className = 'scan-chip';

  if (riskLevel === 'HIGH') {
    chip.classList.add('scan-chip-high');
  } else if (riskLevel === 'MEDIUM') {
    chip.classList.add('scan-chip-medium');
  } else if (riskLevel === 'LOW') {
    chip.classList.add('scan-chip-low');
  }
}

function formatHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return url || 'Unknown page';
  }
}

function formatRelativeTime(isoTime) {
  if (!isoTime) {
    return 'Time unavailable';
  }

  const diffMs = Date.now() - new Date(isoTime).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes <= 0) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function escapeHtml(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}
