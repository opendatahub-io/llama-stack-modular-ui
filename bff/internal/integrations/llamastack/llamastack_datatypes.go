// This package temporarily holds definitions of the llamastack API datatypes. This will be
// replaced by a separate golang SDK at some point in the future.
package llamastack

const (
	LLMModelType       = "llm"
	EmbeddingModelType = "embedding"
)

type ModelModelType string

type Model struct {
	Identifier         string         `json:"identifier"`
	ModelType          ModelModelType `json:"model_type"`
	ProviderID         string         `json:"provider_id"`
	ProviderResourceID string         `json:"provider_resource_id"`
}

type ModelList struct {
	Data []Model `json:"data"`
}

type VectorDB struct {
	EmbeddingDimension int64  `json:"embedding_dimension"`
	EmbeddingModel     string `json:"embedding_model"`
	Identifier         string `json:"identifier"`
	ProviderID         string `json:"provider_id"`
	ProviderResourceID string `json:"provider_resource_id"`
}

type VectorDBList struct {
	Data []VectorDB `json:"data"`
}
