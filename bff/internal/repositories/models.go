package repositories

import (
	"encoding/json"
	"fmt"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
)

const modelsPath = "/v1/openai/v1/models"

type ModelsInterface interface {
	GetAllModels(client integrations.HTTPClientInterface) (*llamastack.ModelList, error)
}

type Models struct {
}

func (m Models) GetAllModels(client integrations.HTTPClientInterface) (*llamastack.ModelList, error) {
	response, err := client.GET(modelsPath)

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve models: %w", err)
	}

	var models llamastack.ModelList
	if err := json.Unmarshal(response, &models); err != nil {
		return nil, fmt.Errorf("error decoding response data: %w", err)
	}

	return &models, nil
}
