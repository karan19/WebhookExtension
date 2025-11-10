## Knowledge Dump

Chrome extension that lets you highlight text on any page and send it to your webhook with a custom tag/title payload.

### Setup

1. Open `chrome://extensions`, enable **Developer mode**, and use **Load unpacked** to select this `WebhookExtension` folder.
2. Click **Details → Extension options** (or use the popup’s *Open Options* button) and supply your Snippet webhook URL/token (required) plus the Page webhook URL/token if you plan to save whole pages. These values are stored in `chrome.storage.sync`.

### Usage

1. Open the extension popup and toggle **Selection capture** to ON. The action badge shows `ON` while active.
2. Reload any tab you already had open (Chrome only injects the content script when the page loads).
3. Highlight text on a regular web page (Chrome system pages such as `chrome://` or the Web Store block extensions). A polished, light/dark-aware Knowledge Dump window slides in with a **Snippet/Page** toggle. Snippet mode shows the captured **Content** plus required **Tag**/**Title** fields and optional URL/Tags. Page mode focuses purely on saving the current URL (fields shown in the order **URL → Title → Tag**); no content/notes are collected.
4. After you press **Send**, the background service worker POSTs a JSON payload to the appropriate endpoint: Snippet mode uses the snippet webhook, Page mode uses the page webhook. Your selected token is sent via the `X-Webhook-Token` header.

If a webhook, token, or required fields for the chosen mode are missing, the overlay explains what needs to be fixed. Toggle the popup switch OFF anytime to temporarily disable the selection listener.

### Payload formats

#### Snippet mode

```json
{
  "content": "Coordinate creative with the agency.",
  "title": "Q4 launch prep",
  "tag": "marketing",
  "url": "https://example.com/launch-plan",
  "tags": ["marketing", "launch", "agency"]
}
```

#### Page mode

```json
{
  "url": "https://example.com/full-article",
  "title": "AI trends to watch",
  "tag": "research"
}
```

Configure the page webhook/token in the Options page to enable this mode.

### API examples

Use these cURL snippets to test your endpoints (replace `X-Webhook-Token` with your token).

#### Page endpoint

```bash
curl -X POST \
  https://7aom0b2xpd.execute-api.us-west-2.amazonaws.com/prod/pages \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: <WEBHOOK_TOKEN>" \
  -d '{
    "author": "Karan",
    "mood": "Curious",
    "url": "https://example.com/full-article",
    "title": "AI trends to watch",
    "tag": "research",
    "notes": "Save for team reading list",
    "customField": "any extra key/value will be stored"
  }'
```

#### Snippet endpoint

```bash
curl -X POST \
  https://7aom0b2xpd.execute-api.us-west-2.amazonaws.com/prod/snippets \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: <WEBHOOK_TOKEN>" \
  -d '{
    "content": "Coordinate creative with the agency.",
    "author": "Karan",
    "mood": "Inspired",
    "url": "https://example.com/launch-plan",
    "title": "Q4 launch prep",
    "tag": "marketing",
    "tags": ["marketing", "launch", "agency"],
    "metadata": {
      "campaign": "Q4-2025",
      "priority": "high"
    }
  }'
```

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
