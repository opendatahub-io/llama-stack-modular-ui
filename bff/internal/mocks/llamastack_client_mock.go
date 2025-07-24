package mocks

import (
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
	"github.com/stretchr/testify/mock"
)

type LlamastackClientMock struct {
	mock.Mock
}

func NewLlamastackClientMock() (*LlamastackClientMock, error) {
	return &LlamastackClientMock{}, nil
}

func (l *LlamastackClientMock) GetAllModels(_ integrations.HTTPClientInterface) (*llamastack.ModelList, error) {
	data := llamastack.ModelList{
		Data: []llamastack.Model{
			{
				Identifier:         "default-model-id-1",
				ModelType:          llamastack.LLMModelType,
				ProviderID:         "default-provider-id-1",
				ProviderResourceID: "default-provider-resource-id-1",
			},
			{
				Identifier:         "default-model-id-2",
				ModelType:          llamastack.EmbeddingModelType,
				ProviderID:         "default-provider-id-2",
				ProviderResourceID: "default-provider-resource-id-2",
			},
		},
	}

	return &data, nil
}

func (l *LlamastackClientMock) GetAllVectorDBs(_ integrations.HTTPClientInterface) (*llamastack.VectorDBList, error) {
	data := llamastack.VectorDBList{
		Data: []llamastack.VectorDB{
			{
				Identifier:         "default-vector-db-id-1",
				ProviderID:         "default-provider-id-1",
				ProviderResourceID: "default-provider-resource-id-1",
				EmbeddingDimension: 1536,
				EmbeddingModel:     "default-embedding-model-1",
			},
			{
				Identifier:         "default-vector-db-id-2",
				ProviderID:         "default-provider-id-2",
				ProviderResourceID: "default-provider-resource-id-2",
				EmbeddingDimension: 1536,
				EmbeddingModel:     "default-embedding-model-2",
			},
		},
	}

	return &data, nil
}
