# Testing guidance

Testing instructions for the Azure Blob SAS Downloader app plugin (`neogentest-blobpdf-app`).

## What the plugin does

An administrator registers one or more Azure Blob Storage accounts on the plugin's configuration page. A user
then opens the **Download PDF** page, picks an account, enters a document UUID, and receives a short-lived,
read-only SAS link to the matching blob. Account keys are held in Grafana's `secureJsonData` and are only ever
used by the plugin backend.

## Prerequisites

An Azure Blob Storage account is required — the plugin authenticates with a storage account key and signs SAS
tokens against the real Blob endpoint, so it cannot be exercised against the Azurite emulator.

In the container, upload at least one PDF whose name ends with an underscore and a UUID, for example:

```
invoice_196e554f-bf3d-4ace-b2bd-0d5c2f2e8109.pdf
```

## Setup

1. Install the plugin and enable it under **Administration → Plugins → Azure Blob SAS Downloader**.
2. Open the plugin's **Configuration** tab, select **Add account**, and fill in:
   - **Display name** — any label, e.g. `Test Account`
   - **Storage account name** — the Azure storage account
   - **Container name** — the container holding the PDFs
   - **Blob endpoint suffix** — `blob.core.windows.net`
   - **Storage account key** — the account key
   - **SAS expiry (minutes)** — leave at `15`
3. Select **Add account** to save.

Alternatively, uncomment and fill in the `jsonData` / `secureJsonData` block in
[provisioning/plugins/apps.yaml](provisioning/plugins/apps.yaml) and run `docker compose up` — the account is
then configured with no manual steps.

## Test cases

| # | Action | Expected result |
| - | ------ | --------------- |
| 1 | Open **Download PDF** with no accounts configured | Message prompting you to add an account on the configuration page |
| 2 | Open **Download PDF** with an account configured | Account selector pre-filled, showing the container name |
| 3 | Enter the UUID of an uploaded PDF, select **Generate download link** | Success panel showing the resolved filename (UUID suffix stripped) and an expiry timestamp |
| 4 | Select **Download PDF** in the success panel | The PDF downloads as an attachment under its original name |
| 5 | Enter a UUID that does not exist | Error: `no blob found for UUID <uuid>` |
| 6 | Wait past the expiry, then reuse the link | Azure rejects the request — the SAS token has expired |
| 7 | Configure a second account and switch between them in the selector | Each account searches only its own container |
| 8 | Reopen the configuration page after saving | The key shows as already configured, with a **Reset key** button instead of the input |

## Notes for reviewers

- The generated SAS grants read permission only, is restricted to HTTPS, and expires after the account's
  configured window (default 15 minutes).
- Blob lookup matches on the `_<uuid>` suffix within the configured container, optionally narrowed by a blob
  prefix; the download filename has that suffix stripped.
- The **Download PDF** page is available to `Viewer` and above; configuring accounts requires `Admin`.
