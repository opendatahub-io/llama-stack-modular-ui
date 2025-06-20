package auth

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/opendatahub-io/llama-stack-modular-ui/bff/internal/config"
)

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

type OAuthHandler struct {
	config config.EnvConfig
	client *http.Client
}

func NewOAuthHandler(cfg config.EnvConfig) *OAuthHandler {
	return &OAuthHandler{
		config: cfg,
		client: &http.Client{
			Timeout: time.Second * 10,
		},
	}
}

// ExtractToken extracts the bearer token from the Authorization header
func ExtractToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("no authorization header")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return "", fmt.Errorf("invalid authorization header format")
	}

	return parts[1], nil
}

// ValidateToken validates the token with OpenShift OAuth server
func (h *OAuthHandler) ValidateToken(ctx context.Context, token string) error {
	req, err := http.NewRequestWithContext(ctx, "GET", h.config.OAuthServerURL+"/apis/user.openshift.io/v1/users/~", nil)
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := h.client.Do(req)
	if err != nil {
		return fmt.Errorf("error validating token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("invalid token")
	}

	return nil
}

// PropagateToken propagates the token to the backend service
func PropagateToken(token string, req *http.Request) {
	req.Header.Set("Authorization", "Bearer "+token)
}
