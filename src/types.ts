export interface StorageAccount {
  id: string;
  name: string;
  accountName: string;
  containerName: string;
  endpointSuffix?: string;
  blobPrefix?: string;
  expiryMinutes?: number;
}

export interface AzureBlobSasAppJsonData {
  accounts?: StorageAccount[];
}

export interface AzureBlobSasAppSecureJsonData {
  // Keys are stored as "accountKey_{id}" per storage account
  [key: string]: string | undefined;
}
