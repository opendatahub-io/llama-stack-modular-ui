package config

import "log/slog"

type EnvConfig struct {
	Port            int
	StaticAssetsDir string
	LogLevel        slog.Level
	AllowedOrigins  []string

	// Llama Stack Configuration
	LlamaStackURL string

	// OAuth Configuration
	OAuthEnabled          bool
	OAuthClientID         string
	OAuthClientSecret     string
	OAuthRedirectURI      string
	OAuthServerURL        string
	OpenShiftApiServerUrl string
	OAuthUserInfoEndpoint string
}

//MockK8Client    bool
//MockMRClient    bool
//DevMode         bool
//StandaloneMode  bool
//DevModePort     int
