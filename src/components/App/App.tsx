import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { PluginPage } from '@grafana/runtime';

import { DownloadPage } from '../../pages/DownloadPage';
import { AzureBlobSasAppJsonData } from '../../types';

export function App(props: AppRootProps) {
  const pluginId = props.meta.id;
  const cfg = (props.meta.jsonData ?? {}) as AzureBlobSasAppJsonData;

  return (
    <PluginPage>
      <Routes>
        <Route path="download" element={<DownloadPage pluginId={pluginId} config={cfg} />} />
        <Route path="*" element={<Navigate to="download" replace />} />
      </Routes>
    </PluginPage>
  );
}

export default App;