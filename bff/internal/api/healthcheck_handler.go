package api

import (
	"github.com/alexcreasy/modarch-quickstart/internal/models"
	"github.com/julienschmidt/httprouter"
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
