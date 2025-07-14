package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"path"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	helper "github.com/opendatahub-io/llama-stack-modular-ui/internal/helpers"
)

const (
	Version = "1.0.0"

	ApiPathPrefix   = "/api/v1"
	HealthCheckPath = "/healthcheck"
)

type App struct {
	config config.EnvConfig
	logger *slog.Logger
}

func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	logger.Debug("Initializing app with config", slog.Any("config", cfg))

	// Validate OAuth configuration
	if cfg.OAuthEnabled {
		if cfg.OAuthServerURL == "" {
			return nil, fmt.Errorf("OAUTH_SERVER_URL is required when OAuth is enabled")
		}
		if cfg.OAuthClientID == "" {
			return nil, fmt.Errorf("OAUTH_CLIENT_ID is required when OAuth is enabled")
		}
		if cfg.OAuthClientSecret == "" {
			return nil, fmt.Errorf("OAUTH_CLIENT_SECRET is required when OAuth is enabled")
		}
		if cfg.OAuthRedirectURI == "" {
			return nil, fmt.Errorf("OAUTH_REDIRECT_URI is required when OAuth is enabled")
		}
		logger.Info("OAuth configuration validated",
			slog.String("oauth_server_url", cfg.OAuthServerURL),
			slog.String("openshift_api_server_url", cfg.OpenShiftApiServerUrl))
	}

	app := &App{
		config: cfg,
		logger: logger,
	}
	return app, nil
}

func (app *App) Routes() http.Handler {
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// OAuth routes
	apiRouter.POST("/auth/callback", app.HandleOAuthCallback)
	apiRouter.GET("/auth/state", app.HandleOAuthState)

	// Config endpoint (not authenticated)
	apiRouter.GET("/config", app.HandleConfig)

	// App Router
	appMux := http.NewServeMux()

	// Register /api/v1/config as a public endpoint
	appMux.HandleFunc(ApiPathPrefix+"/config", func(w http.ResponseWriter, r *http.Request) {
		app.HandleConfig(w, r, nil)
	})

	// Register /api/v1/auth/callback as a public endpoint
	appMux.HandleFunc(ApiPathPrefix+"/auth/callback", func(w http.ResponseWriter, r *http.Request) {
		app.HandleOAuthCallback(w, r, nil)
	})

	// Register /api/v1/auth/state as a public endpoint
	appMux.HandleFunc(ApiPathPrefix+"/auth/state", func(w http.ResponseWriter, r *http.Request) {
		app.HandleOAuthState(w, r, nil)
	})

	// All other /api/v1/* routes require auth
	appMux.Handle(ApiPathPrefix+"/", app.RequireAuth(apiRouter))

	// Llama Stack proxy handler (unprotected)
	appMux.HandleFunc("/llama-stack/", app.HandleLlamaStackProxy)

	//file server for the frontend file and SPA routes
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	
	// Handle root and other paths
	appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ctxLogger := helper.GetContextLoggerFromReq(r)

		// Check if the requested file exists
		if _, err := staticDir.Open(r.URL.Path); err == nil {
			ctxLogger.Debug("Serving static file", slog.String("path", r.URL.Path))
			// Serve the file if it exists
			fileServer.ServeHTTP(w, r)
			return
		}

		// Fallback to index.html for SPA routes
		ctxLogger.Debug("Static asset not found, serving index.html", slog.String("path", r.URL.Path))
		http.ServeFile(w, r, path.Join(app.config.StaticAssetsDir, "index.html"))
	})

	healthcheckMux := http.NewServeMux()
	healthcheckRouter := httprouter.New()
	healthcheckRouter.GET(HealthCheckPath, app.HealthcheckHandler)
	healthcheckMux.Handle(HealthCheckPath, app.RecoverPanic(app.EnableTelemetry(healthcheckRouter)))

	// Combines the healthcheck endpoint with the rest of the routes
	combinedMux := http.NewServeMux()
	combinedMux.Handle(HealthCheckPath, healthcheckMux)
	combinedMux.Handle("/", app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(appMux))))

	return combinedMux
}
