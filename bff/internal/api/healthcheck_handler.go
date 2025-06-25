package api

import (
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
	"net/http"
)

func (app *App) HealthcheckHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {

	healthCheck := models.HealthCheckModel{
		Status: "available",
		SystemInfo: models.SystemInfo{
			Version: "1.0",
		},
		UserID: "id",
	}

	err := app.WriteJSON(w, http.StatusOK, healthCheck, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}
