(() => {
  const storageDefaults = { isActive: false };
  let isActive = false;
  let currentSelection = '';
  let overlayHost;
  let overlayElements = null;
  let isSending = false;

  console.debug('[Knowledge Dump] content script loaded.');

  loadActivationState();
  chrome.storage.onChanged.addListener(handleStorageChange);
  document.addEventListener('mouseup', handleSelectEvent);
  document.addEventListener('touchend', handleSelectEvent);
  document.addEventListener('selectionchange', handleSelectionChange);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleDocumentClick, true);

  async function loadActivationState() {
    try {
      const stored = await getFromStorage(storageDefaults);
      isActive = Boolean(stored.isActive);
      console.debug('[Knowledge Dump] Activation state loaded:', isActive);
      if (!isActive) {
        hideOverlay();
      }
    } catch (error) {
      console.error('Knowledge Dump: unable to load activation state', error);
    }
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== 'sync' || !changes.isActive) {
      return;
    }
    isActive = Boolean(changes.isActive.newValue);
    console.debug('[Knowledge Dump] Activation updated via storage change:', isActive);
    if (!isActive) {
      hideOverlay();
    }
  }

  function handleSelectionChange() {
    if (!isActive) {
      return;
    }
    const selectionText = (window.getSelection()?.toString() || '').trim();
    if (!selectionText) {
      if (overlayHasFocus()) {
        console.debug('[Knowledge Dump] Selection cleared because overlay took focus; keeping window open.');
        return;
      }
      currentSelection = '';
      hideOverlay();
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      hideOverlay();
    }
  }

  function handleDocumentClick(event) {
    if (!overlayHost || overlayHost.style.display === 'none') {
      return;
    }
    if (eventInsideOverlay(event)) {
      return;
    }
    // Ignore clicks that are selecting text (mouse down -> mouse up) to avoid hiding early.
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      return;
    }
    hideOverlay();
  }

  function eventInsideOverlay(event) {
    if (!overlayHost) {
      return false;
    }
    if (overlayHost.contains(event.target)) {
      return true;
    }
    if (typeof event.composedPath === 'function') {
      return event.composedPath().includes(overlayHost);
    }
    return false;
  }

  function overlayIsVisible() {
    return Boolean(overlayHost && overlayHost.style.display !== 'none');
  }

  function overlayHasFocus() {
    if (!overlayIsVisible()) {
      return false;
    }
    const activeElement = document.activeElement;
    if (!activeElement) {
      return false;
    }
    if (activeElement === overlayHost) {
      return true;
    }
    if (overlayHost.contains(activeElement)) {
      return true;
    }
    const shadowActive = overlayHost.shadowRoot?.activeElement;
    return Boolean(shadowActive);
  }

  function handleSelectEvent(event) {
    if (!isActive) {
      console.debug('[Knowledge Dump] Ignoring selection: extension inactive.');
      return;
    }
    if (overlayHost && eventInsideOverlay(event)) {
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        hideOverlay();
        return;
      }

      const selectionText = selection.toString().trim();
      if (!selectionText) {
        console.debug('[Knowledge Dump] Selection collapsed or whitespace; dismissing overlay.');
        hideOverlay();
        return;
      }

      console.debug('[Knowledge Dump] Selection captured, showing overlay.');
      currentSelection = selectionText;
      const rect = getSelectionRect(selection) || {
        right: window.innerWidth / 2,
        bottom: window.innerHeight / 2
      };
      showOverlay(rect);
    }, 0);
  }

  function getSelectionRect(selection) {
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect && rect.width === 0 && rect.height === 0) {
      return range.startContainer.parentElement?.getBoundingClientRect() || null;
    }
    return rect;
  }

  function ensureOverlay() {
    if (!overlayHost) {
      overlayHost = document.createElement('div');
      overlayHost.id = 'knowledge-dump-overlay';
      overlayHost.style.position = 'fixed';
      overlayHost.style.zIndex = '2147483647';
      overlayHost.style.display = 'none';
      overlayHost.style.left = '0';
      overlayHost.style.top = '0';
      overlayHost.style.pointerEvents = 'auto';
      overlayHost.style.margin = '0';
      overlayHost.style.padding = '0';
      overlayHost.style.border = 'none';
      overlayHost.style.background = 'transparent';
      overlayHost.style.width = 'max-content';
      overlayHost.style.maxWidth = '100%';
      overlayHost.style.boxSizing = 'border-box';
      overlayHost.setAttribute('aria-hidden', 'true');

      const shadow = overlayHost.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
      <style>
        :host {
          all: initial;
        }
        :host, * {
          box-sizing: border-box;
          font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
        }
        .card {
          width: 320px;
          border-radius: 18px;
          padding: 20px 22px 18px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.04);
          box-shadow: 0 26px 60px rgba(3, 7, 18, 0.55);
          color: #f8fafc;
        }
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .brand {
          font-size: 1.05rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .close-btn {
          border: none;
          background: rgba(248, 250, 252, 0.12);
          color: #f8fafc;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1rem;
          line-height: 1;
        }
        .close-btn:hover {
          background: rgba(248, 250, 252, 0.18);
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        label {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(248, 250, 252, 0.8);
          margin-bottom: 6px;
          display: block;
        }
        input {
          width: 100%;
          padding: 11px 13px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          font-size: 0.95rem;
          background: rgba(15, 23, 42, 0.65);
          color: #f8fafc;
        }
        input::placeholder {
          color: rgba(226, 232, 240, 0.6);
        }
        input:focus {
          outline: 2px solid #38bdf8;
          border-color: transparent;
          background: rgba(15, 23, 42, 0.85);
        }
        .hint-row {
          font-size: 0.78rem;
          color: rgba(248, 250, 252, 0.7);
          margin-top: -6px;
        }
        .actions {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }
        .actions button {
          flex: 1;
          border: none;
          border-radius: 999px;
          padding: 11px 12px;
          font-size: 0.95rem;
          cursor: pointer;
        }
        button.cancel {
          background: rgba(148, 163, 184, 0.2);
          color: #f8fafc;
        }
        button.send {
          background: linear-gradient(120deg, #38bdf8, #6366f1);
          color: #0f172a;
          font-weight: 600;
          box-shadow: 0 12px 22px rgba(56, 189, 248, 0.45);
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .feedback {
          margin-top: 6px;
          font-size: 0.8rem;
          min-height: 1rem;
          color: rgba(248, 250, 252, 0.8);
        }
        .feedback.error {
          color: #f87171;
        }
        .feedback.success {
          color: #34d399;
        }
      </style>
      <div class="card" role="dialog" aria-modal="false" aria-live="polite">
        <div class="card-header">
          <div class="brand">Knowledge Dump</div>
          <button type="button" class="close-btn" id="close-btn" aria-label="Close window">&times;</button>
        </div>
        <form id="overlay-form">
          <div>
            <label for="tag-input">Tag</label>
            <input type="text" id="tag-input" autocomplete="off" placeholder="e.g. marketing, idea">
          </div>
          <div>
            <label for="title-input">Title</label>
            <input type="text" id="title-input" autocomplete="off" placeholder="Give this highlight a title">
          </div>
          <div class="hint-row">
            Send the selected text to your webhook with these details.
          </div>
          <div class="actions">
            <button type="button" class="cancel" id="cancel-btn">Cancel</button>
            <button type="submit" class="send" id="send-btn">Send</button>
          </div>
          <div class="feedback" id="feedback"></div>
        </form>
      </div>
    `;

      overlayElements = {
        form: shadow.getElementById('overlay-form'),
        tagInput: shadow.getElementById('tag-input'),
        titleInput: shadow.getElementById('title-input'),
        feedback: shadow.getElementById('feedback'),
        sendButton: shadow.getElementById('send-btn'),
        cancelButton: shadow.getElementById('cancel-btn'),
        closeButton: shadow.getElementById('close-btn')
      };

      overlayElements.form.addEventListener('submit', handleSubmit);
      overlayElements.cancelButton.addEventListener('click', (event) => {
        event.preventDefault();
        hideOverlay();
      });
      overlayElements.closeButton.addEventListener('click', (event) => {
        event.preventDefault();
        hideOverlay();
      });

      overlayHost.addEventListener('mousedown', (event) => {
        event.stopPropagation();
      });
      overlayHost.addEventListener('mouseup', (event) => {
        event.stopPropagation();
      });
    }

    if (!overlayHost.isConnected) {
      const parent = document.documentElement || document.body;
      if (parent) {
        parent.appendChild(overlayHost);
      }
    }
  }

  function showOverlay(anchorRect) {
    ensureOverlay();
    if (!overlayHost || !overlayElements) {
      return;
    }

    overlayHost.style.display = 'block';
    overlayHost.setAttribute('aria-hidden', 'false');

    overlayElements.feedback.textContent = '';
    overlayElements.feedback.className = 'feedback';
    overlayElements.tagInput.value = '';
    overlayElements.titleInput.value = document.title || '';
    overlayElements.sendButton.disabled = false;
    overlayElements.sendButton.textContent = 'Send';
    isSending = false;

    requestAnimationFrame(() => positionOverlay(anchorRect));
    overlayElements.tagInput.focus();
  }

  function positionOverlay(anchorRect) {
    if (!overlayHost) {
      return;
    }
    const margin = 8;
    const rect = overlayHost.getBoundingClientRect();
    let targetX = (anchorRect?.right ?? window.innerWidth / 2) + margin;
    let targetY = (anchorRect?.bottom ?? window.innerHeight / 2) + margin;

    if (targetX + rect.width > window.innerWidth - margin) {
      targetX = window.innerWidth - rect.width - margin;
    }
    if (targetY + rect.height > window.innerHeight - margin) {
      targetY = window.innerHeight - rect.height - margin;
    }

    targetX = Math.max(margin, targetX);
    targetY = Math.max(margin, targetY);

    overlayHost.style.left = `${targetX}px`;
    overlayHost.style.top = `${targetY}px`;
  }

  function hideOverlay() {
    if (!overlayHost) {
      return;
    }
    overlayHost.style.display = 'none';
    overlayHost.setAttribute('aria-hidden', 'true');
    currentSelection = '';
    isSending = false;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSending) {
      return;
    }

    if (!currentSelection) {
      setFeedback('Selection expired. Please highlight text again.', true);
      return;
    }

    const tag = overlayElements.tagInput.value.trim();
    const title = overlayElements.titleInput.value.trim();

    let config;
    try {
      config = await getFromStorage({ webhookUrl: '', token: '' });
    } catch (error) {
      console.error('Knowledge Dump: unable to load config', error);
      setFeedback('Unable to read saved settings.', true);
      return;
    }

    if (!config.token) {
      setFeedback('Token missing. Use the Options page to set it.', true);
      return;
    }

    if (!config.webhookUrl) {
      setFeedback('Webhook URL missing. Use the Options page to set it.', true);
      return;
    }

    isSending = true;
    overlayElements.sendButton.disabled = true;
    overlayElements.sendButton.textContent = 'Sending...';
    setFeedback('Sending...', false);

    const payload = {
      tagName: tag,
      title,
      content: currentSelection,
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await sendMessage({
        type: 'SEND_WEBHOOK',
        payload: {
          webhookUrl: config.webhookUrl,
          token: config.token,
          body: payload
        }
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Unknown error sending webhook.');
      }
      setFeedback('Selection sent successfully.', false, true);
      setTimeout(() => hideOverlay(), 900);
    } catch (error) {
      console.error('Knowledge Dump: failed to send webhook', error);
      setFeedback(error.message || 'Failed to send selection.', true);
      overlayElements.sendButton.disabled = false;
      overlayElements.sendButton.textContent = 'Send';
      isSending = false;
      return;
    }
  }

  function setFeedback(message, isError = false, isSuccess = false) {
    if (!overlayElements) {
      return;
    }
    overlayElements.feedback.textContent = message;
    overlayElements.feedback.className = 'feedback';
    if (isError) {
      overlayElements.feedback.classList.add('error');
    }
    if (isSuccess) {
      overlayElements.feedback.classList.add('success');
    }
  }

  function getFromStorage(defaultValues) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(defaultValues, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(result);
      });
    });
  }

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(response);
      });
    });
  }
})();
