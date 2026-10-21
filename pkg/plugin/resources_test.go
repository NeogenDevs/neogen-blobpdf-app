package plugin

import (
	"bytes"
	"context"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"net/http"
	"testing"
)

// mockCallResourceResponseSender implements backend.CallResourceResponseSender
// for use in tests.
type mockCallResourceResponseSender struct {
	response *backend.CallResourceResponse
}

// Send sets the received *backend.CallResourceResponse to s.response
func (s *mockCallResourceResponseSender) Send(response *backend.CallResourceResponse) error {
	s.response = response
	return nil
}

// TestCallResource tests CallResource calls, using backend.CallResourceRequest and backend.CallResourceResponse.
// This ensures the httpadapter for CallResource works correctly.
func TestCallResource(t *testing.T) {
	// Initialize app
	inst, err := NewApp(context.Background(), backend.AppInstanceSettings{})
	if err != nil {
		t.Fatalf("new app: %s", err)
	}
	if inst == nil {
		t.Fatal("inst must not be nil")
	}
	app, ok := inst.(*App)
	if !ok {
		t.Fatal("inst must be of type *App")
	}

	// Set up and run test cases
	for _, tc := range []struct {
		name string

		method string
		path   string
		body   []byte

		expStatus int
		expBody   []byte
	}{
		{
			name:      "get generate-sas 405",
			method:    http.MethodGet,
			path:      "generate-sas",
			expStatus: http.StatusMethodNotAllowed,
		},
		{
			name:      "post generate-sas invalid body 400",
			method:    http.MethodPost,
			path:      "generate-sas",
			body:      []byte(`not json`),
			expStatus: http.StatusBadRequest,
		},
		{
			name:      "post generate-sas missing accountId 400",
			method:    http.MethodPost,
			path:      "generate-sas",
			body:      []byte(`{"id":"196e554f-bf3d-4ace-b2bd-0d5c2f2e8109"}`),
			expStatus: http.StatusBadRequest,
		},
		{
			name:      "post generate-sas missing id 400",
			method:    http.MethodPost,
			path:      "generate-sas",
			body:      []byte(`{"accountId":"account-1"}`),
			expStatus: http.StatusBadRequest,
		},
		{
			name:      "get non existing handler 404",
			method:    http.MethodGet,
			path:      "not_found",
			expStatus: http.StatusNotFound,
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			// Request by calling CallResource. This tests the httpadapter.
			var r mockCallResourceResponseSender
			err = app.CallResource(context.Background(), &backend.CallResourceRequest{
				Method: tc.method,
				Path:   tc.path,
				Body:   tc.body,
			}, &r)
			if err != nil {
				t.Fatalf("CallResource error: %s", err)
			}
			if r.response == nil {
				t.Fatal("no response received from CallResource")
			}
			if tc.expStatus > 0 && tc.expStatus != r.response.Status {
				t.Errorf("response status should be %d, got %d", tc.expStatus, r.response.Status)
			}
			if len(tc.expBody) > 0 {
				if tb := bytes.TrimSpace(r.response.Body); !bytes.Equal(tb, tc.expBody) {
					t.Errorf("response body should be %s, got %s", tc.expBody, tb)
				}
			}
		})
	}
}
