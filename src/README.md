# Azure Blob SAS Downloader

A Grafana app plugin that lets users download PDF documents from Azure Blob Storage without ever handling
storage credentials. An administrator registers one or more storage accounts in the plugin configuration,
and users then pick an account, enter a document UUID, and get a short-lived
[SAS](https://learn.microsoft.com/azure/storage/common/storage-sas-overview) download link.

## Overview

Documents are stored in Azure Blob Storage with a UUID suffix in the blob name (for example
`invoice_196e554f-bf3d-4ace-b2bd-0d5c2f2e8109.pdf`). Users only know the UUID, not the full blob name.

Given an account and a UUID, the plugin:

1. Lists the blobs in the configured container (optionally restricted to a blob prefix).
2. Finds the most recent blob whose name ends with that UUID.
3. Signs a read-only SAS URL for it in the backend and returns it to the browser.

Account keys are stored in Grafana's `secureJsonData` and never leave the backend. The generated SAS URL is
read-only and expires after a configurable number of minutes.

## Requirements

- Grafana 10.0.0 or later.
- One or more Azure Blob Storage accounts, each with a storage account key.
- Network access from the Grafana backend to the storage account endpoint.
- Grafana `Admin` role to configure storage accounts; `Viewer` or above to download documents.

## Getting started

1. Install the plugin and enable it from **Administration → Plugins**.
2. Open the plugin's **Configuration** tab and add a storage account:

   | Field            | Description                                                             |
   | ---------------- | ----------------------------------------------------------------------- |
   | Name             | Display name shown to users in the account picker.                      |
   | Account name     | Azure storage account name.                                             |
   | Account key      | Storage account key. Stored encrypted and write-only.                   |
   | Container name   | Container holding the documents.                                        |
   | Endpoint suffix  | Usually `blob.core.windows.net`.                                        |
   | Blob prefix      | Optional prefix to narrow the search within the container.              |
   | Expiry (minutes) | How long a generated download link stays valid.                         |

3. Save the configuration, then open **Download PDF** from the navigation menu.
4. Select a storage account, enter the document UUID, and select **Generate download link**.

Repeat step 2 for each additional storage account you want to expose.

## Documentation

Source code, issue tracker, and further documentation are available at
[github.com/NeogenDevs/neogen-blobpdf-app](https://github.com/NeogenDevs/neogen-blobpdf-app).

## Contributing

Bug reports and pull requests are welcome via
[GitHub issues](https://github.com/NeogenDevs/neogen-blobpdf-app/issues).

## License

Licensed under the [Apache License 2.0](https://github.com/NeogenDevs/neogen-blobpdf-app/blob/main/LICENSE).
