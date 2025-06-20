package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/bff/internal/auth"
)

type OAuthCallbackRequest struct {
	Code string `json:"code"`
}

func (app *App) HandleOAuthCallback(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var req OAuthCallbackRequest
	err := app.ReadJSON(w, r, &req)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Exchange code for token
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", req.Code)
	data.Set("client_id", app.config.OAuthClientID)
	data.Set("client_secret", app.config.OAuthClientSecret)
	data.Set("redirect_uri", app.config.OAuthRedirectURI)

	tokenURL := fmt.Sprintf("%s/oauth/token", app.config.OAuthServerURL)
	tokenReq, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	tokenReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	resp, err := client.Do(tokenReq)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		app.serverErrorResponse(w, r, fmt.Errorf("oauth token exchange failed: %s", body))
		return
	}

	var tokenResponse auth.TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return the token to the frontend
	err = app.WriteJSON(w, http.StatusOK, tokenResponse, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
