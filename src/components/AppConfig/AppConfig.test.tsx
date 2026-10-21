import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PluginType } from '@grafana/data';
import AppConfig, { AppConfigProps } from './AppConfig';

describe('Components/AppConfig', () => {
  let props: AppConfigProps;

  beforeEach(() => {
    jest.resetAllMocks();

    // jsdom does not implement scrollIntoView, which the account form calls when it opens.
    Element.prototype.scrollIntoView = jest.fn();

    props = {
      plugin: {
        meta: {
          id: 'neogentest-blobpdf-app',
          name: 'Azure Blob SAS Downloader',
          type: PluginType.app,
          enabled: true,
          jsonData: {},
        },
      },
    } as unknown as AppConfigProps;
  });

  test('renders the storage accounts section with an empty state', () => {
    render(<AppConfig plugin={props.plugin} />);

    expect(screen.getByText('Storage Accounts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add account/i })).toBeInTheDocument();
    expect(screen.getByText(/no storage accounts configured yet/i)).toBeInTheDocument();
  });

  test('lists the configured storage accounts', () => {
    const plugin = {
      meta: {
        ...props.plugin.meta,
        jsonData: {
          accounts: [
            {
              id: 'account-1',
              name: 'Production EU',
              accountName: 'mystorageaccount',
              containerName: 'pdfs',
            },
          ],
        },
      },
    };

    render(<AppConfig plugin={plugin} />);

    expect(screen.getByText('Production EU')).toBeInTheDocument();
    expect(screen.getByText(/mystorageaccount \/ pdfs/)).toBeInTheDocument();
    expect(screen.queryByText(/no storage accounts configured yet/i)).not.toBeInTheDocument();
  });

  test('opens the account form with the storage account fields', () => {
    render(<AppConfig plugin={props.plugin} />);

    fireEvent.click(screen.getByRole('button', { name: /add account/i }));

    expect(screen.getByText('Add storage account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Production EU')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., mystorageaccount')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., pdfs')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste account key')).toBeInTheDocument();
  });
});
