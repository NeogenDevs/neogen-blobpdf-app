package plugin

type StorageAccount struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	AccountName    string `json:"accountName"`
	ContainerName  string `json:"containerName"`
	EndpointSuffix string `json:"endpointSuffix"`
	BlobPrefix     string `json:"blobPrefix"`
	ExpiryMinutes  int    `json:"expiryMinutes"`
}

type pluginConfig struct {
	Accounts []StorageAccount `json:"accounts"`
}
