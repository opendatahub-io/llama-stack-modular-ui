package repositories

type LlamaStackClientInterface interface {
	ModelsInterface
}

type LlamaStackClient struct {
	Models
}

func NewLlamaStackClient() (LlamaStackClientInterface, error) {
	return &LlamaStackClient{}, nil
}
