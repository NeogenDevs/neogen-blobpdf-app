import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppRootProps, PluginType } from '@grafana/data';
import { render, waitFor } from '@testing-library/react';
import App from './App';

describe('Components/App', () => {
  let props: AppRootProps;

  beforeEach(() => {
    jest.resetAllMocks();

    props = {
      basename: 'a/neogentest-blobpdf-app',
      meta: {
        id: 'neogentest-blobpdf-app',
        name: 'Azure Blob SAS Downloader',
        type: PluginType.app,
        enabled: true,
        jsonData: {},
      },
      query: {},
      path: '',
      onNavChanged: jest.fn(),
    } as unknown as AppRootProps;
  });

  test('redirects to the download page and renders it', async () => {
    const { queryByText } = render(
      <MemoryRouter>
        <App {...props} />
      </MemoryRouter>
    );

    // Application is lazy loaded, so we need to wait for the component and routes to be rendered
    await waitFor(() => expect(queryByText(/azure blob pdf download/i)).toBeInTheDocument(), { timeout: 2000 });
  });

  test('prompts for configuration when no storage accounts are configured', async () => {
    const { queryByText } = render(
      <MemoryRouter>
        <App {...props} />
      </MemoryRouter>
    );

    await waitFor(() => expect(queryByText(/no storage accounts configured/i)).toBeInTheDocument(), { timeout: 2000 });
  });
});
