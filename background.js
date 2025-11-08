const badgeColor = '#1d7bf2';

function updateBadge(isActive) {
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
  chrome.action.setBadgeText({ text: isActive ? 'ON' : '' });
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

function bootstrapBadge() {
  chrome.storage.sync.get({ isActive: false }, (result) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to initialize badge', chrome.runtime.lastError);
      return;
    }
    updateBadge(Boolean(result.isActive));
  });
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

  if (!token) {
    throw new Error('Webhook token is missing. Please save it in the Options page.');
  }

  if (!body) {
    throw new Error('Missing request body.');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Token': token
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
