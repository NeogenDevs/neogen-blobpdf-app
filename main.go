package main

import (
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend/app"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"

	"github.com/neogen/blob-pdf/pkg/plugin"
)

func main() {
	const pluginID = "neogen-azure-blob-sas-downloader-app"

	if err := app.Manage(pluginID, plugin.NewApp, app.ManageOpts{}); err != nil {
		log.DefaultLogger.Error("failed to start app", "error", err)
		os.Exit(1)
	}
}