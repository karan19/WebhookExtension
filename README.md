## Knowledge Dump

Chrome extension that lets you highlight text on any page and send it to your webhook with a custom tag/title payload.

### Setup

1. Open `chrome://extensions`, enable **Developer mode**, and use **Load unpacked** to select this `WebhookExtension` folder.
2. Click **Details → Extension options** (or use the popup’s *Open Options* button) and supply both your Webhook URL and Token. These values are stored in `chrome.storage.sync`.

### Usage

1. Open the extension popup and toggle **Selection capture** to ON. The action badge shows `ON` while active.
2. Reload any tab you already had open (Chrome only injects the content script when the page loads).
3. Highlight text on a regular web page (Chrome system pages such as `chrome://` or the Web Store block extensions). A polished, light/dark-aware Knowledge Dump window slides in with **Tag** and **Title** inputs plus Send/Cancel buttons.
4. After you press **Send**, the background service worker POSTs a JSON payload (with `tagName`, `title`, `content`, page metadata, and timestamp) to the configured webhook URL, using your token in the `X-Webhook-Token` header.

If the webhook, token, or selection is missing, the overlay explains what needs to be fixed. Toggle the popup switch OFF anytime to temporarily disable the selection listener.

### Chrome Web Store Publishing

#### First-time upload

1. Ensure `manifest.json` has the final `name`, `description`, and production `version`.
2. Prepare promo assets: at minimum a 128×128 PNG icon (already in `icons/icon128.png`) plus one or more 1280×800 screenshots showing the popup/overlay.
3. From the repo root, create a clean zip with only the extension files (no `.git`, etc.):
   ```bash
   zip -r knowledge-dump.zip . -x '*.git*' 'node_modules/*'
   ```
4. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole), click **New Item**, upload `knowledge-dump.zip`, and fill in listing details (title, short/long description, category, privacy info).
5. In the “Privacy & Security” section specify that the extension stores user-provided webhook credentials locally via `chrome.storage.sync` and sends highlighted text to the user’s webhook.
6. Choose distribution regions/visibility, complete the compliance questionnaire, and submit for review. Approval usually takes a few hours to a few days.

#### Incremental updates

1. Bump the `version` field in `manifest.json` (e.g., `1.0.1` → `1.0.2`).
2. Rebuild the zip package as above (`zip -r knowledge-dump.zip ...`).
3. In the developer dashboard, open your existing Knowledge Dump item, choose **Package → Upload new package**, and select the new zip.
4. Update release notes/screenshots if needed, then submit for review. Updates publish faster once the extension already exists.
