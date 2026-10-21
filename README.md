# Azure Blob SAS Downloader (neogentest-blobpdf-app)

Grafana app plugin that generates short-lived Azure Blob Storage SAS download links for PDF documents, looked
up by the UUID suffix in the blob name.

For user-facing documentation (the text published to grafana.com), see [src/README.md](src/README.md).

## Plugin identity

| Field     | Value                      |
| --------- | -------------------------- |
| Plugin ID | `neogentest-blobpdf-app`   |
| Type      | `app`                      |
| Org slug  | `neogentest`               |

The plugin ID must stay prefixed with the grafana.com organization slug (`neogentest`) — Grafana rejects a
signature whose access policy token was issued by an account that does not match the first part of the plugin
ID. Changing the ID requires a Grafana server restart and reinstall for any existing deployment.

## Development

```sh
npm install
npm run dev          # frontend watch build
mage -v build:linux  # backend build
npm run server       # Grafana in Docker at http://localhost:3000
```

Other useful targets: `npm run typecheck`, `npm run lint`, `npm run test:ci`, `npm run e2e`.

Note that any change to `src/plugin.json` requires restarting the Grafana server.

## Signing and release

Signing requires an access policy token created under the **neogentest** organization on grafana.com, with the
realm set to `neogentest (all-stacks)` and the `plugins:write` scope:

```sh
export GRAFANA_ACCESS_POLICY_TOKEN=<token>
npm run build
mage -v buildAll
npm run sign
```

In CI, store the token as the `GRAFANA_ACCESS_POLICY_TOKEN` repository secret. The `CI` workflow signs the
build when that secret is present, and the `Release` workflow packages a signed archive on `v*` tags once the
`policy_token` input is enabled in [.github/workflows/release.yml](.github/workflows/release.yml).

The packaged archive must contain a single top-level directory named exactly `neogentest-blobpdf-app`, and
backend binaries inside it must have `0755` permissions.

## Before submitting to the catalog

Validate the archive locally with `npx @grafana/plugin-validator@latest <archive>.zip`. Two warnings are
outstanding:

- **Screenshots** — `info.screenshots` is not set. Add at least one image under `src/img/` and reference it
  from `src/plugin.json` (relative path), otherwise the catalog listing has no preview.
- **Unsigned plugin** — expected for a first submission; Grafana signs the plugin after review.

## License

[Apache License 2.0](LICENSE)
