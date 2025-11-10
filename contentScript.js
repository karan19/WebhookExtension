(() => {
  const storageDefaults = {
    isActive: false,
    snippetWebhookUrl: '',
    snippetToken: '',
    pageWebhookUrl: '',
    pageToken: '',
    webhookUrl: '',
    token: ''
  };
  let isActive = false;
  let currentSelection = '';
  let overlayHost;
  let overlayElements = null;
  let isSending = false;
  let currentMode = 'snippet';

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
      if (overlayIsVisible()) {
        console.debug('[Knowledge Dump] Selection cleared but overlay is open; waiting for explicit dismiss.');
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
        .hidden {
          display: none !important;
        }
        .mode-toggle {
          display: inline-flex;
          align-self: flex-start;
          border-radius: 999px;
          background: rgba(248, 250, 252, 0.08);
          padding: 3px;
          margin-bottom: 6px;
        }
        .mode-btn {
          border: none;
          background: transparent;
          color: rgba(248, 250, 252, 0.8);
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 0.82rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .mode-btn.active {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 600;
        }
        .field {
          position: relative;
        }
        .field input,
        .field textarea {
          width: 100%;
          padding: 18px 13px 10px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          font-size: 0.95rem;
          background: rgba(15, 23, 42, 0.65);
          color: #f8fafc;
          outline: none;
        }
        .field textarea {
          resize: vertical;
          min-height: 110px;
        }
        .field input::placeholder,
        .field textarea::placeholder {
          color: transparent;
        }
        .field input:focus,
        .field textarea:focus {
          outline: 2px solid #38bdf8;
          border-color: transparent;
          background: rgba(15, 23, 42, 0.85);
        }
        .field input[readonly] {
          cursor: default;
          color: rgba(248, 250, 252, 0.8);
        }
        .field input[readonly]:focus {
          outline: none;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: rgba(15, 23, 42, 0.45);
        }
        .field label {
          position: absolute;
          left: 16px;
          top: 16px;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(248, 250, 252, 0.76);
          pointer-events: none;
          background: #0f172a;
          padding: 0 6px;
          transition: transform 0.16s ease, font-size 0.16s ease, color 0.16s ease, top 0.16s ease;
        }
        .field input:focus + label,
        .field input:not(:placeholder-shown) + label,
        .field textarea:focus + label,
        .field textarea:not(:placeholder-shown) + label {
          top: 6px;
          font-size: 0.63rem;
          color: #38bdf8;
        }
        .actions {
          display: flex;
          gap: 10px;
          margin-top: 4px;
          order: 9;
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
          <div class="mode-toggle" role="group" aria-label="Capture mode">
            <button type="button" class="mode-btn active" data-mode="snippet">Snippet</button>
            <button type="button" class="mode-btn" data-mode="page">Page</button>
          </div>
          <div class="field" id="content-field">
            <textarea id="content-input" placeholder=" "></textarea>
            <label for="content-input">Content *</label>
          </div>
          <div class="field" id="tag-field">
            <input type="text" id="tag-input" autocomplete="off" placeholder=" ">
            <label for="tag-input">Tag *</label>
          </div>
          <div class="field" id="title-field">
            <input type="text" id="title-input" autocomplete="off" placeholder=" ">
            <label for="title-input">Title *</label>
          </div>
          <div class="field" id="url-field">
            <input type="url" id="url-input" autocomplete="off" placeholder=" " readonly>
            <label for="url-input">URL</label>
          </div>
          <div class="feedback" id="feedback"></div>
          <div class="actions">
            <button type="button" class="cancel" id="cancel-btn">Cancel</button>
            <button type="submit" class="send" id="send-btn">Send</button>
          </div>
        </form>
      </div>
    `;

      overlayElements = {
        form: shadow.getElementById('overlay-form'),
        contentInput: shadow.getElementById('content-input'),
        contentField: shadow.getElementById('content-field'),
        tagInput: shadow.getElementById('tag-input'),
        tagField: shadow.getElementById('tag-field'),
        titleInput: shadow.getElementById('title-input'),
        titleField: shadow.getElementById('title-field'),
        urlInput: shadow.getElementById('url-input'),
        urlField: shadow.getElementById('url-field'),
        urlLabel: shadow.querySelector('label[for="url-input"]'),
        contentLabel: shadow.querySelector('label[for="content-input"]'),
        modeButtons: Array.from(shadow.querySelectorAll('.mode-btn')),
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
      overlayElements.modeButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const targetMode = button.dataset.mode === 'page' ? 'page' : 'snippet';
          if (targetMode !== currentMode) {
            setMode(targetMode);
          }
        });
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
    overlayElements.contentInput.value = currentSelection || '';
    overlayElements.tagInput.value = '';
    overlayElements.titleInput.value = document.title || '';
    overlayElements.urlInput.value = window.location.href || '';
    overlayElements.sendButton.disabled = false;
    overlayElements.sendButton.textContent = 'Send';
    isSending = false;

    setMode(currentMode);
    requestAnimationFrame(() => positionOverlay(anchorRect));
    overlayElements.contentInput.focus();
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

  function setMode(mode) {
    if (mode !== 'snippet' && mode !== 'page') {
      return;
    }
    currentMode = mode;
    if (!overlayElements) {
      return;
    }
    const isPageMode = mode === 'page';
    overlayElements.modeButtons?.forEach((button) => {
      const isActive = button.dataset.mode === mode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    if (overlayElements.contentLabel) {
      overlayElements.contentLabel.textContent = mode === 'snippet' ? 'Content *' : 'Notes (optional)';
    }
    if (overlayElements.contentField) {
      overlayElements.contentField.classList.toggle('hidden', isPageMode);
    }
    if (overlayElements.urlLabel) {
      overlayElements.urlLabel.textContent = isPageMode ? 'URL *' : 'URL';
    }
    if (overlayElements.urlInput) {
      overlayElements.urlInput.required = isPageMode;
    }

    const orders = {
      snippet: {
        contentField: 1,
        tagField: 2,
        titleField: 3,
        urlField: 4
      },
      page: {
        urlField: 1,
        titleField: 2,
        tagField: 3,
        contentField: 4
      }
    };

    const orderMap = orders[mode];
    Object.entries(orderMap).forEach(([key, order]) => {
      const element = overlayElements[key];
      if (element) {
        element.style.order = order;
      }
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSending) {
      return;
    }

    const contentValue = overlayElements.contentInput.value.trim();
    const tag = overlayElements.tagInput.value.trim();
    const title = overlayElements.titleInput.value.trim();
    const urlValue = overlayElements.urlInput.value.trim();
    const isSnippetMode = currentMode === 'snippet';

    if (isSnippetMode && !contentValue) {
      setFeedback('Content is required. Paste or type your snippet.', true);
      return;
    }

    if (!tag) {
      setFeedback('Tag is required.', true);
      return;
    }

    if (!title) {
      setFeedback('Title is required.', true);
      return;
    }

    const urlToSend = urlValue || window.location.href || '';
    if (!isSnippetMode && !urlToSend) {
      setFeedback('URL is required when saving pages.', true);
      return;
    }

    let config;
    try {
      config = await getFromStorage(storageDefaults);
    } catch (error) {
      console.error('Knowledge Dump: unable to load config', error);
      setFeedback('Unable to read saved settings.', true);
      return;
    }

    const snippetWebhookUrl = config.snippetWebhookUrl || config.webhookUrl || '';
    const snippetToken = config.snippetToken || config.token || '';
    const pageWebhookUrl = config.pageWebhookUrl || '';
    const pageToken = config.pageToken || '';

    let targetWebhookUrl = '';
    let targetToken = '';
    if (isSnippetMode) {
      targetWebhookUrl = snippetWebhookUrl;
      targetToken = snippetToken;
      if (!targetWebhookUrl) {
        setFeedback('Snippet webhook URL missing. Use the Options page to set it.', true);
        return;
      }
      if (!targetToken) {
        setFeedback('Snippet token missing. Use the Options page to set it.', true);
        return;
      }
    } else {
      targetWebhookUrl = pageWebhookUrl;
      targetToken = pageToken;
      if (!targetWebhookUrl || !targetToken) {
        setFeedback('Page webhook URL and token are required. Configure them in Options.', true);
        return;
      }
    }

    isSending = true;
    overlayElements.sendButton.disabled = true;
    overlayElements.sendButton.textContent = 'Sending...';
    setFeedback('Sending...', false);

    let payload;
    if (isSnippetMode) {
      payload = {
        content: contentValue,
        title,
        tag
      };
      if (urlToSend) {
        payload.url = urlToSend;
      }
    } else {
      payload = {
        title,
        tag,
        url: urlToSend
      };
    }
    try {
      const response = await sendMessage({
        type: 'SEND_WEBHOOK',
        payload: {
          webhookUrl: targetWebhookUrl,
          token: targetToken,
          body: payload
        }
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Unknown error sending webhook.');
      }
      setFeedback('Saved successfully.', false, true);
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
