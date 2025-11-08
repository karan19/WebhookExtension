const defaults = { isActive: false };

const toggle = document.getElementById('active-toggle');
const statusText = document.getElementById('status-text');
const optionsBtn = document.getElementById('options-btn');

function renderStatus(isActive) {
  statusText.textContent = isActive
    ? 'Active: select text to open the send window.'
    : 'Inactive: toggle on to enable selection capture.';
}

async function init() {
  try {
    const stored = await chrome.storage.sync.get(defaults);
    const isActive = Boolean(stored.isActive);
    toggle.checked = isActive;
    renderStatus(isActive);
  } catch (error) {
    console.error('Failed to read activation state', error);
    statusText.textContent = 'Unable to read activation state. See console.';
  }
}

toggle.addEventListener('change', async (event) => {
  const isActive = event.target.checked;
  renderStatus(isActive);
  try {
    await chrome.storage.sync.set({ isActive });
  } catch (error) {
    console.error('Failed to save activation state', error);
    statusText.textContent = 'Failed to update state. See console.';
  }
});

optionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

init();
