package repositories

import (
	"encoding/json"
	"fmt"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
)

const vectorDBsPath = "/v1/vector-dbs"

// Used on the FE side to interact with the vectorDB API.
type VectorDBInterface interface {
	GetAllVectorDBs(client integrations.HTTPClientInterface) (*llamastack.VectorDBList, error)
}

type UIVectorDB struct {
}

func (m UIVectorDB) GetAllVectorDBs(client integrations.HTTPClientInterface) (*llamastack.VectorDBList, error) {
	response, err := client.GET(vectorDBsPath)

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve vectorDBs: %w", err)
	}

	var vectorDBList llamastack.VectorDBList
	if err := json.Unmarshal(response, &vectorDBList); err != nil {
		return nil, fmt.Errorf("error decoding response data: %w", err)
	}

	return &vectorDBList, nil
}
