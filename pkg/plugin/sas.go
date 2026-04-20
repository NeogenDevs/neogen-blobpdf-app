package plugin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/sas"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
)

func (a *App) handleGenerateSAS(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body generateSasRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json body", http.StatusBadRequest)
		return
	}

	accountID := strings.TrimSpace(body.AccountID)
	if accountID == "" {
		http.Error(w, "accountId is required", http.StatusBadRequest)
		return
	}

	uuid := strings.TrimSpace(body.ID)
	if uuid == "" {
		http.Error(w, "id (uuid) is required", http.StatusBadRequest)
		return
	}

	pCtx := httpadapter.PluginConfigFromContext(req.Context())

	var cfg pluginConfig
	if err := json.Unmarshal(pCtx.AppInstanceSettings.JSONData, &cfg); err != nil {
		http.Error(w, "failed to parse plugin configuration", http.StatusInternalServerError)
		return
	}

	// Find the requested storage account
	var account *StorageAccount
	for i := range cfg.Accounts {
		if cfg.Accounts[i].ID == accountID {
			account = &cfg.Accounts[i]
			break
		}
	}
	if account == nil {
		http.Error(w, fmt.Sprintf("storage account %q not found", accountID), http.StatusBadRequest)
		return
	}

	if err := validateAccount(*account); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Secure secret: each account's key is stored as "accountKey_{id}"
	accountKey, ok := pCtx.AppInstanceSettings.DecryptedSecureJSONData["accountKey_"+accountID]
	if !ok || strings.TrimSpace(accountKey) == "" {
		http.Error(w, "storage account key not configured for this account", http.StatusBadRequest)
		return
	}

	endpointSuffix := strings.TrimSpace(account.EndpointSuffix)
	if endpointSuffix == "" {
		endpointSuffix = "blob.core.windows.net"
	}

	cred, err := azblob.NewSharedKeyCredential(account.AccountName, accountKey)
	if err != nil {
		http.Error(w, "failed to create shared key credential", http.StatusInternalServerError)
		return
	}

	serviceURL := fmt.Sprintf("https://%s.%s", account.AccountName, endpointSuffix)
	client, err := azblob.NewClientWithSharedKeyCredential(serviceURL, cred, nil)
	if err != nil {
		http.Error(w, "failed to create blob client", http.StatusInternalServerError)
		return
	}

	blobName, err := findBlobByUUID(req.Context(), client, account.ContainerName, strings.TrimSpace(account.BlobPrefix), uuid)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if blobName == "" {
		http.Error(w, fmt.Sprintf("no blob found for UUID %s", uuid), http.StatusNotFound)
		return
	}

	expiryMinutes := account.ExpiryMinutes
	if expiryMinutes <= 0 {
		expiryMinutes = 15
	}

	expiry := time.Duration(expiryMinutes) * time.Minute
	now := time.Now().UTC()

	downloadFilename := filenameWithoutUUID(blobName, uuid)

	sv := sas.BlobSignatureValues{
		Protocol:           sas.ProtocolHTTPS,
		StartTime:          now.Add(-5 * time.Minute),
		ExpiryTime:         now.Add(expiry),
		ContainerName:      account.ContainerName,
		BlobName:           blobName,
		Permissions:        (&sas.BlobPermissions{Read: true}).String(),
		ContentType:        "application/pdf",
		ContentDisposition: fmt.Sprintf(`attachment; filename="%s"`, downloadFilename),
	}

	qp, err := sv.SignWithSharedKey(cred)
	if err != nil {
		http.Error(w, "failed to sign sas token", http.StatusInternalServerError)
		return
	}

	downloadURL := fmt.Sprintf(
		"https://%s.%s/%s/%s?%s",
		account.AccountName,
		endpointSuffix,
		account.ContainerName,
		blobName,
		qp.Encode(),
	)

	writeJSON(w, http.StatusOK, generateSasResponse{
		URL:       downloadURL,
		BlobName:  downloadFilename,
		ExpiresAt: sv.ExpiryTime.Format(time.RFC3339),
	})
}

// findBlobByUUID lists blobs (optionally filtered by prefix) and returns the
// name of the first blob whose name ends with "_<uuid>".
func findBlobByUUID(ctx context.Context, client *azblob.Client, containerName, prefix, uuid string) (string, error) {
	suffix := "_" + uuid
	opts := &azblob.ListBlobsFlatOptions{}
	if prefix != "" {
		opts.Prefix = &prefix
	}

	pager := client.NewListBlobsFlatPager(containerName, opts)
	for pager.More() {
		page, err := pager.NextPage(ctx)
		if err != nil {
			return "", fmt.Errorf("listing blobs: %w", err)
		}
		for _, item := range page.Segment.BlobItems {
			if item.Name != nil && strings.HasSuffix(*item.Name, suffix) {
				return *item.Name, nil
			}
		}
	}
	return "", nil
}

func validateAccount(a StorageAccount) error {
	if strings.TrimSpace(a.AccountName) == "" {
		return errors.New("accountName not configured")
	}
	if strings.TrimSpace(a.ContainerName) == "" {
		return errors.New("containerName not configured")
	}
	return nil
}

// filenameWithoutUUID strips the "_<uuid>" suffix from a blob name for use as the download filename.
func filenameWithoutUUID(blobName, uuid string) string {
	parts := strings.Split(blobName, "/")
	name := parts[len(parts)-1]

	suffix := "_" + uuid
	if strings.HasSuffix(name, suffix) {
		name = name[:len(name)-len(suffix)]
	}

	name = strings.ReplaceAll(name, `"`, "")
	name = strings.ReplaceAll(name, "\n", "")
	name = strings.ReplaceAll(name, "\r", "")

	if strings.TrimSpace(name) == "" {
		return "download.pdf"
	}
	return name
}
