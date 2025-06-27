package api

import (
	"io"
	"log/slog"
	"net/http"
	"os"
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

	// HTTP client routes

	// App Router
	appMux := http.NewServeMux()

	// handler for api calls
	appMux.Handle(ApiPathPrefix+"/", apiRouter)

	// --- PROXY HANDLER FOR /api/llama-stack/* ---
	appMux.HandleFunc("/api/llama-stack/", func(w http.ResponseWriter, r *http.Request) {
		llamaStackURL := os.Getenv("LLAMA_STACK_URL")
		if llamaStackURL == "" {
			http.Error(w, "LLAMA_STACK_URL not set", http.StatusInternalServerError)
			return
		}
		proxyPath := r.URL.Path[len("/api/llama-stack"):]
		proxyURL := llamaStackURL + proxyPath
		if r.URL.RawQuery != "" {
			proxyURL += "?" + r.URL.RawQuery
		}

		// Log the proxied call
		app.logger.Info("Proxying llama-stack call", slog.String("method", r.Method), slog.String("original_path", r.URL.Path), slog.String("proxy_url", proxyURL))

		// Create new request
		req, err := http.NewRequest(r.Method, proxyURL, r.Body)
		if err != nil {
			http.Error(w, "Failed to create proxy request: "+err.Error(), http.StatusInternalServerError)
			return
		}
		// Copy headers
		for k, v := range r.Header {
			req.Header[k] = v
		}
		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			http.Error(w, "Proxy error: "+err.Error(), http.StatusBadGateway)
			return
		}
		defer func() {
			if err := resp.Body.Close(); err != nil {
				app.logger.Error("Failed to close response body", slog.String("error", err.Error()))
			}
		}()
		// Log the response status
		app.logger.Info("Llama-stack response", slog.String("proxy_url", proxyURL), slog.Int("status_code", resp.StatusCode))
		// Copy response headers
		for k, v := range resp.Header {
			w.Header()[k] = v
		}
		w.WriteHeader(resp.StatusCode)
		if _, err := io.Copy(w, resp.Body); err != nil {
			app.logger.Error("Failed to copy response body", slog.String("error", err.Error()))
		}
	})
	// --- END PROXY HANDLER ---

	//file server for the frontend file and SPA routes
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)

	// Handle assets directory explicitly
	//appMux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(path.Join(app.config.StaticAssetsDir, "assets")))))

	// Handle root and other paths
	appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ctxLogger := helper.GetContextLoggerFromReq(r)

		// Log all incoming requests to help debug
		ctxLogger.Debug("Received request",
			slog.String("path", r.URL.Path),
			slog.String("method", r.Method))

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
