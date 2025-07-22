// This package temporarily holds definitions of the llamastack API datatypes. This will be
// replaced by a separate golang SDK at some point in the future.
package llamastack

type Model struct {
	Id      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	OwnedBy string `json:"owned_by"`
}

type ModelList struct {
	Data []Model `json:"data"`
}
