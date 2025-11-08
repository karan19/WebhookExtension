const defaults = {
  webhookUrl: '',
  token: ''
};

const form = document.getElementById('options-form');
const webhookInput = document.getElementById('webhook-url');
const tokenInput = document.getElementById('token');
const statusEl = document.getElementById('status');
const saveBtn = document.getElementById('save-btn');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b00020' : '#1d7bf2';
}

async function restoreOptions() {
  try {
    const stored = await chrome.storage.sync.get(defaults);
    webhookInput.value = stored.webhookUrl || '';
    tokenInput.value = stored.token || '';
    setStatus('Loaded saved values.');
  } catch (error) {
    console.error('Failed to restore options', error);
    setStatus('Unable to load saved values.', true);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const webhookUrl = webhookInput.value.trim();
  const token = tokenInput.value.trim();

  if (!webhookUrl || !token) {
    setStatus('Webhook URL and token are required.', true);
    return;
  }

  saveBtn.disabled = true;
  setStatus('Saving...');

  try {
    await chrome.storage.sync.set({ webhookUrl, token });
    setStatus('Configuration saved successfully.');
  } catch (error) {
    console.error('Failed to save options', error);
    setStatus('Failed to save. Check console for details.', true);
  } finally {
    saveBtn.disabled = false;
  }
});

restoreOptions();
