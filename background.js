const badgeColor = '#1d7bf2';

function updateBadge(isActive) {
  try {
    if (!chrome.action) {
      return;
    }
    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    chrome.action.setBadgeText({ text: isActive ? 'ON' : '' });
  } catch (error) {
    const message = error?.message || error;
    console.error('Failed to update badge', message);
  }
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.sync.set({
      isActive: false,
      webhookUrl: '',
      token: ''
    });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && Object.prototype.hasOwnProperty.call(changes, 'isActive')) {
    updateBadge(Boolean(changes.isActive.newValue));
  }
});

async function bootstrapBadge() {
  try {
    const { isActive = false } = await chrome.storage.sync.get({ isActive: false });
    updateBadge(Boolean(isActive));
  } catch (error) {
    const message = error?.message || error;
    console.error('Failed to initialize badge', message);
  }
}

bootstrapBadge();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SEND_WEBHOOK') {
    sendWebhook(message.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
  return false;
});

async function sendWebhook(payload) {
  if (!payload) {
    throw new Error('Missing webhook payload.');
  }

  const { webhookUrl, body, token } = payload;

  if (!webhookUrl) {
    throw new Error('Webhook URL is not configured. Please set it in the Options page.');
  }

  if (!body) {
    throw new Error('Missing request body.');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      ...(token ? { 'X-Webhook-Token': token } : {}),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Webhook responded with ${response.status}: ${responseText || response.statusText}`);
  }

  return {
    status: response.status,
    statusText: response.statusText,
    responseText
  };
}
