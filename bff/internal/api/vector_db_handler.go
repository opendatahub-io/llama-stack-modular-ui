package api

import (
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
)

type VectorDBEnvelope Envelope[models.VectorDB, None]
type VectorDBListEnvelope Envelope[models.VectorDBList, None]

func (app *App) GetAllVectorDBsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	client, ok := r.Context().Value(constants.LlamaStackHttpClientKey).(integrations.HTTPClientInterface)

	if !ok {
		app.serverErrorResponse(w, r, errors.New("REST client not found"))
		return
	}

	vectorDBList, err := app.repositories.LlamaStackClient.GetAllVectorDBs(client)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	result := VectorDBListEnvelope{
		Data: convertVectorDBList(vectorDBList),
	}

	err = app.WriteJSON(w, http.StatusOK, result, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func convertVectorDB(vectorDB *llamastack.VectorDB) models.VectorDB {
	return models.VectorDB{
		Identifier:         vectorDB.Identifier,
		ProviderID:         vectorDB.ProviderID,
		ProviderResourceID: vectorDB.ProviderResourceID,
		EmbeddingDimension: vectorDB.EmbeddingDimension,
		EmbeddingModel:     vectorDB.EmbeddingModel,
	}
}

func convertVectorDBList(vectorDBList *llamastack.VectorDBList) models.VectorDBList {
	var items []models.VectorDB

	for _, vectorDB := range vectorDBList.Data {
		items = append(items, convertVectorDB(&vectorDB))
	}

	return models.VectorDBList{
		Items: items,
	}
}
