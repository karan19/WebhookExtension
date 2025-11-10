const defaults = {
  snippetWebhookUrl: '',
  snippetToken: '',
  pageWebhookUrl: '',
  pageToken: '',
  webhookUrl: '',
  token: ''
};

const form = document.getElementById('options-form');
const snippetWebhookInput = document.getElementById('snippet-webhook-url');
const snippetTokenInput = document.getElementById('snippet-token');
const pageWebhookInput = document.getElementById('page-webhook-url');
const pageTokenInput = document.getElementById('page-token');
const statusEl = document.getElementById('status');
const saveBtn = document.getElementById('save-btn');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b00020' : '#1d7bf2';
}

async function restoreOptions() {
  try {
    const stored = await chrome.storage.sync.get(defaults);
    const snippetWebhookUrl = stored.snippetWebhookUrl || stored.webhookUrl || '';
    const snippetToken = stored.snippetToken || stored.token || '';
    snippetWebhookInput.value = snippetWebhookUrl;
    snippetTokenInput.value = snippetToken;
    pageWebhookInput.value = stored.pageWebhookUrl || '';
    pageTokenInput.value = stored.pageToken || '';
    setStatus('Loaded saved values.');
  } catch (error) {
    console.error('Failed to restore options', error);
    setStatus('Unable to load saved values.', true);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const snippetWebhookUrl = snippetWebhookInput.value.trim();
  const snippetToken = snippetTokenInput.value.trim();
  const pageWebhookUrl = pageWebhookInput.value.trim();
  const pageToken = pageTokenInput.value.trim();

  if (!snippetWebhookUrl || !snippetToken) {
    setStatus('Snippet webhook URL and token are required.', true);
    return;
  }

  const pageFieldsProvided = Boolean(pageWebhookUrl || pageToken);
  if (pageFieldsProvided && (!pageWebhookUrl || !pageToken)) {
    setStatus('Page webhook URL and token must both be provided.', true);
    return;
  }

  saveBtn.disabled = true;
  setStatus('Saving...');

  try {
    await chrome.storage.sync.set({
      snippetWebhookUrl,
      snippetToken,
      pageWebhookUrl,
      pageToken,
      // legacy keys for backward compatibility
      webhookUrl: snippetWebhookUrl,
      token: snippetToken
    });
    setStatus('Configuration saved successfully.');
  } catch (error) {
    console.error('Failed to save options', error);
    setStatus('Failed to save. Check console for details.', true);
  } finally {
    saveBtn.disabled = false;
  }
});

restoreOptions();
