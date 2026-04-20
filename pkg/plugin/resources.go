package plugin

import (
	"encoding/json"
	"net/http"
)

func (a *App) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/generate-sas", a.handleGenerateSAS)
}

type generateSasRequest struct {
	AccountID string `json:"accountId"`
	ID        string `json:"id"`
}

type generateSasResponse struct {
	URL       string `json:"url"`
	BlobName  string `json:"blobName"`
	ExpiresAt string `json:"expiresAt"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}