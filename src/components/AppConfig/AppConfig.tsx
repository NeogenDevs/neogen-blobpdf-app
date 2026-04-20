import React, { useState, useRef, useEffect } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';
import { Alert, Button, Field, Input, Stack, Card, IconButton, Text, Switch } from '@grafana/ui';
import { AzureBlobSasAppJsonData, StorageAccount } from '../../types';

export type AppConfigProps = {
  plugin: any;
};

interface AccountForm {
  id: string;
  name: string;
  accountName: string;
  containerName: string;
  endpointSuffix: string;
  blobPrefix: string;
  expiryMinutes: number;
  accountKey: string;
  isKeyAlreadySet: boolean;
  resetKey: boolean;
}

function emptyForm(secureJsonFields: Record<string, boolean>, id?: string): AccountForm {
  const newId = id ?? '';
  return {
    id: newId,
    name: '',
    accountName: '',
    containerName: '',
    endpointSuffix: 'blob.core.windows.net',
    blobPrefix: '',
    expiryMinutes: 15,
    accountKey: '',
    isKeyAlreadySet: id ? Boolean(secureJsonFields?.[`accountKey_${id}`]) : false,
    resetKey: false,
  };
}

async function updatePluginSettings(pluginId: string, data: object) {
  await lastValueFrom(
    getBackendSrv().fetch({
      url: `/api/plugins/${pluginId}/settings`,
      method: 'POST',
      data,
    })
  );
}

export function AppConfig({ plugin }: AppConfigProps) {
  const meta = plugin.meta;
  const pluginId = meta.id;
  const secureJsonFields: Record<string, boolean> = meta.secureJsonFields ?? {};

  const initialJson = (meta.jsonData ?? {}) as AzureBlobSasAppJsonData;

  const [accounts, setAccounts] = useState<StorageAccount[]>(initialJson.accounts ?? []);
  const [form, setForm] = useState<AccountForm | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const isFormOpen = form !== null;
  useEffect(() => {
    if (isFormOpen) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isFormOpen]);

  const [isEnabled, setIsEnabled] = useState(Boolean(meta.enabled));
  const [isPinned, setIsPinned] = useState(Boolean(meta.pinned));

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const updateEnabled = async (value: boolean) => {
    setSaving(true);
    setSaved(null);
    setError(null);
    try {
      await updatePluginSettings(pluginId, {
        enabled: value,
        pinned: isPinned,
        jsonData: { accounts },
      });
      setIsEnabled(value);
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || 'Failed to save plugin settings.');
    } finally {
      setSaving(false);
    }
  };

  const updatePinned = async (value: boolean) => {
    setSaving(true);
    setSaved(null);
    setError(null);
    try {
      await updatePluginSettings(pluginId, {
        enabled: isEnabled,
        pinned: value,
        jsonData: { accounts },
      });
      setIsPinned(value);
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || 'Failed to save plugin settings.');
    } finally {
      setSaving(false);
    }
  };

  const openAddForm = () => {
    setFormError(null);
    setForm(emptyForm(secureJsonFields));
  };

  const openEditForm = (account: StorageAccount) => {
    setForm({
      id: account.id,
      name: account.name,
      accountName: account.accountName,
      containerName: account.containerName,
      endpointSuffix: account.endpointSuffix ?? 'blob.core.windows.net',
      blobPrefix: account.blobPrefix ?? '',
      expiryMinutes: account.expiryMinutes ?? 15,
      accountKey: '',
      isKeyAlreadySet: Boolean(secureJsonFields?.[`accountKey_${account.id}`]),
      resetKey: false,
    });
  };

  const closeForm = () => {
    setFormError(null);
    setForm(null);
  };

  const saveForm = async () => {
    if (!form) {
      return;
    }

    // Validate and surface specific missing-field errors
    const missing: string[] = [];
    if (!form.name.trim()) {
      missing.push('Display name');
    }
    if (!form.accountName.trim()) {
      missing.push('Storage account name');
    }
    if (!form.containerName.trim()) {
      missing.push('Container name');
    }
    if ((!form.isKeyAlreadySet || form.resetKey) && !form.accountKey.trim()) {
      missing.push('Storage account key');
    }
    if (missing.length > 0) {
      setFormError(`Required fields missing: ${missing.join(', ')}.`);
      return;
    }

    setSaving(true);
    setSaved(null);
    setFormError(null);

    try {
      const isNew = !form.id || !accounts.find((a) => a.id === form.id);
      const accountId = isNew
        ? (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
        : form.id;

      const updatedAccount: StorageAccount = {
        id: accountId,
        name: form.name.trim(),
        accountName: form.accountName.trim(),
        containerName: form.containerName.trim(),
        endpointSuffix: form.endpointSuffix.trim() || 'blob.core.windows.net',
        blobPrefix: form.blobPrefix.trim(),
        expiryMinutes: form.expiryMinutes,
      };

      const updatedAccounts = isNew
        ? [...accounts, updatedAccount]
        : accounts.map((a) => (a.id === accountId ? updatedAccount : a));

      const needsKey = isNew || form.resetKey;
      const newSecureJsonData =
        needsKey && form.accountKey.trim()
          ? { [`accountKey_${accountId}`]: form.accountKey.trim() }
          : undefined;

      await updatePluginSettings(pluginId, {
        enabled: isEnabled,
        pinned: isPinned,
        jsonData: { accounts: updatedAccounts },
        ...(newSecureJsonData ? { secureJsonData: newSecureJsonData } : {}),
      });

      setAccounts(updatedAccounts);
      setForm(null);
      setSaved('Account saved successfully.');
    } catch (e: any) {
      const msg = e?.data?.message || e?.data?.error || e?.message || 'Failed to save. Check that you have admin permissions in Grafana.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (id: string) => {
    const updatedAccounts = accounts.filter((a) => a.id !== id);

    setSaving(true);
    setSaved(null);
    setError(null);

    try {
      await updatePluginSettings(pluginId, {
        enabled: isEnabled,
        pinned: isPinned,
        jsonData: { accounts: updatedAccounts },
      });

      setAccounts(updatedAccounts);
      setSaved('Account deleted.');
    } catch (e: any) {
      setError(e?.message || 'Failed to save plugin settings.');
    } finally {
      setSaving(false);
    }
  };

  const isNew = form !== null && !accounts.find((a) => a.id === form.id);

  return (
    <Stack direction="column" gap={3}>
      <Card>
        <Card.Heading>Plugin controls</Card.Heading>
        <Card.Description>
          <Stack direction="column" gap={2}>
            <Field label="Enabled" description="Activates or deactivates the plugin across Grafana.">
              <Switch
                value={isEnabled}
                onChange={(e) => updateEnabled(e.currentTarget.checked)}
                disabled={saving}
              />
            </Field>
            <Field label="Pinned" description="Pins the plugin shortcut to the left navigation bar for quick access.">
              <Switch
                value={isPinned}
                onChange={(e) => updatePinned(e.currentTarget.checked)}
                disabled={saving}
              />
            </Field>
          </Stack>
        </Card.Description>
      </Card>

      {saved && (
        <Alert title="Success" severity="success">
          {saved}
        </Alert>
      )}
      {error && (
        <Alert title="Error" severity="error">
          {error}
        </Alert>
      )}

      <Card>
        <Card.Heading>Storage Accounts</Card.Heading>
        <Card.Description>
          Configure one or more Azure Blob Storage accounts. Each account can be selected on the download page.
        </Card.Description>
      </Card>

      <Button icon="plus" variant="secondary" onClick={openAddForm} disabled={form !== null}>
        Add account
      </Button>

      {form !== null && (
        <div ref={formRef}>
          <Card>
            <Card.Heading>{isNew ? 'Add storage account' : `Edit: ${form.name || form.accountName}`}</Card.Heading>
            <Card.Description>
              <Stack direction="column" gap={2}>
                <Field label="Display name" description="A friendly name shown in the account selector." required>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
                    placeholder="e.g., Production EU"
                    width={40}
                  />
                </Field>

                <Field label="Storage account name" required>
                  <Input
                    value={form.accountName}
                    onChange={(e) => setForm({ ...form, accountName: e.currentTarget.value })}
                    placeholder="e.g., mystorageaccount"
                    width={40}
                  />
                </Field>

                <Field label="Container name" required>
                  <Input
                    value={form.containerName}
                    onChange={(e) => setForm({ ...form, containerName: e.currentTarget.value })}
                    placeholder="e.g., pdfs"
                    width={40}
                  />
                </Field>

                <Field label="Blob endpoint suffix" description='Default is "blob.core.windows.net". Override for national clouds.'>
                  <Input
                    value={form.endpointSuffix}
                    onChange={(e) => setForm({ ...form, endpointSuffix: e.currentTarget.value })}
                    width={40}
                  />
                </Field>

                <Field
                  label="Blob prefix filter (optional)"
                  description='Narrows blob search to a folder or name prefix (e.g., "reports/").'
                >
                  <Input
                    value={form.blobPrefix}
                    onChange={(e) => setForm({ ...form, blobPrefix: e.currentTarget.value })}
                    width={40}
                  />
                </Field>

                <Field label="SAS expiry (minutes)">
                  <Input
                    type="number"
                    value={form.expiryMinutes}
                    min={1}
                    max={1440}
                    onChange={(e) => setForm({ ...form, expiryMinutes: Number(e.currentTarget.value) })}
                    width={20}
                  />
                </Field>

                <Field
                  label="Storage account key"
                  description={
                    form.isKeyAlreadySet && !form.resetKey
                      ? 'A key is already configured for this account.'
                      : 'Stored securely by Grafana — never exposed to the browser after saving.'
                  }
                  required={!form.isKeyAlreadySet || form.resetKey}
                >
                  {form.isKeyAlreadySet && !form.resetKey ? (
                    <Button
                      variant="secondary"
                      onClick={() => setForm({ ...form, resetKey: true, accountKey: '' })}
                    >
                      Reset key
                    </Button>
                  ) : (
                    <Input
                      type="password"
                      value={form.accountKey}
                      onChange={(e) => setForm({ ...form, accountKey: e.currentTarget.value })}
                      placeholder="Paste account key"
                      width={60}
                    />
                  )}
                </Field>

                {formError && (
                  <Alert title="Save failed" severity="error">
                    {formError}
                  </Alert>
                )}
              </Stack>
            </Card.Description>
          </Card>

          <Stack direction="row" gap={2}>
            <Button onClick={saveForm} disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Add account' : 'Save changes'}
            </Button>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
          </Stack>
        </div>
      )}

      {accounts.length === 0 && form === null && (
        <Text color="secondary">No storage accounts configured yet. Click &quot;Add account&quot; to get started.</Text>
      )}

      {accounts.map((account) => (
        <Card key={account.id}>
          <Card.Heading>{account.name || account.accountName}</Card.Heading>
          <Card.Description>
            {account.accountName} / {account.containerName}
            {account.endpointSuffix && account.endpointSuffix !== 'blob.core.windows.net'
              ? ` (${account.endpointSuffix})`
              : ''}
          </Card.Description>
          <Card.SecondaryActions>
            <IconButton
              name="pen"
              tooltip="Edit"
              onClick={() => openEditForm(account)}
              disabled={form !== null}
            />
            <IconButton
              name="trash-alt"
              tooltip="Delete"
              onClick={() => deleteAccount(account.id)}
              disabled={saving || form !== null}
            />
          </Card.SecondaryActions>
        </Card>
      ))}
    </Stack>
  );
}

export default AppConfig;
