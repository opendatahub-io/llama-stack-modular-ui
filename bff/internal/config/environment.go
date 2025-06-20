package config

import "log/slog"

type EnvConfig struct {
	Port            int
	StaticAssetsDir string
	LogLevel        slog.Level
	AllowedOrigins  []string

	// OAuth Configuration
	OAuthEnabled      bool
	OAuthClientID     string
	OAuthClientSecret string
	OAuthRedirectURI  string
	OAuthServerURL    string
}

//MockK8Client    bool
//MockMRClient    bool
//DevMode         bool
//StandaloneMode  bool
//DevModePort     int
