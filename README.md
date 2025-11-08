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
