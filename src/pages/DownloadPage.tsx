import React, { useState } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';
import { Alert, Button, Card, Field, Input, LinkButton, Select, Stack } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { AzureBlobSasAppJsonData } from '../types';

interface Props {
  pluginId: string;
  config: AzureBlobSasAppJsonData;
}

interface GenerateSasResponse {
  url: string;
  blobName: string;
  expiresAt: string;
}

export function DownloadPage({ pluginId, config }: Props) {
  const accounts = config.accounts ?? [];

  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? '');
  const [uuid, setUuid] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateSasResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accountOptions: Array<SelectableValue<string>> = accounts.map((a) => ({
    label: a.name || a.accountName,
    value: a.id,
    description: `${a.accountName} / ${a.containerName}`,
  }));

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await lastValueFrom(
        getBackendSrv().fetch<GenerateSasResponse>({
          url: `/api/plugins/${pluginId}/resources/generate-sas`,
          method: 'POST',
          data: { accountId, id: uuid },
        })
      );

      setResult(resp.data);
    } catch (e: any) {
      const msg =
        e?.data?.message ||
        e?.data?.error ||
        e?.message ||
        'Failed to generate SAS link. Check plugin configuration and backend logs.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <Card>
        <Card.Heading>Azure Blob PDF Download</Card.Heading>
        <Card.Description>
          No storage accounts configured. Go to the plugin configuration page and add at least one account.
        </Card.Description>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Heading>Azure Blob PDF Download</Card.Heading>
      <Card.Description>Generate a short-lived SAS link and download the PDF.</Card.Description>
      <Card.Actions>
        <Stack direction="column" gap={2}>
          <Field label="Storage account" description="Select the Azure Blob Storage account to search.">
            <Select
              options={accountOptions}
              value={accountId}
              onChange={(v: SelectableValue<string>) => {
                setAccountId(v.value ?? '');
                setResult(null);
                setError(null);
              }}
              width={40}
            />
          </Field>

          {selectedAccount && (
            <div>
              <strong>Container:</strong> {selectedAccount.containerName}
            </div>
          )}

          <Field
            label="Document UUID"
            description="The UUID at the end of the blob name. The plugin finds the matching blob and downloads it without the UUID suffix."
          >
            <Input
              value={uuid}
              onChange={(e) => setUuid(e.currentTarget.value)}
              placeholder="e.g., 196e554f-bf3d-4ace-b2bd-0d5c2f2e8109"
              width={44}
            />
          </Field>

          <Button onClick={generate} disabled={!uuid.trim() || !accountId || loading}>
            {loading ? 'Searching…' : 'Generate download link'}
          </Button>

          {error && (
            <Alert title="Error" severity="error">
              {error}
            </Alert>
          )}

          {result && (
            <Alert title="Download ready" severity="success">
              <div>
                <strong>File:</strong> <code>{result.blobName}</code>
              </div>
              <div>
                <strong>Expires:</strong> {result.expiresAt}
              </div>
              <div style={{ marginTop: 8 }}>
                <LinkButton href={result.url} target="_blank" rel="noreferrer noopener" icon="download-alt">
                  Download PDF
                </LinkButton>
              </div>
            </Alert>
          )}
        </Stack>
      </Card.Actions>
    </Card>
  );
}
