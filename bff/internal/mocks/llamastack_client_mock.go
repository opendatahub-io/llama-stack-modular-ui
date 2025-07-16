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
				Id:      "default-model-id-1",
				Created: 1646099200,
				OwnedBy: "default-owner",
			},
			{
				Id:      "default-model-id-2",
				Created: 1646099222,
				OwnedBy: "default-owner",
			},
		},
	}

	return &data, nil
}
