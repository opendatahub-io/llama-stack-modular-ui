package repositories

type LlamaStackClientInterface interface {
	ModelsInterface
	VectorDBInterface
}

type LlamaStackClient struct {
	UIModels
	UIVectorDB
}

func NewLlamaStackClient() (LlamaStackClientInterface, error) {
	return &LlamaStackClient{}, nil
}
