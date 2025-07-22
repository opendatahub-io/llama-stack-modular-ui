package models

import "time"

type Model struct {
	Id      string    `json:"id"`
	Created time.Time `json:"created"`
	OwnedBy string    `json:"owned_by"`
}

// Note: Always create a bespoke type for list types, this creates minimal work later if implementing pagination
// as the necessary metadata can be added at a later date without breaking the API.

type ModelList struct {
	Items []Model `json:"items"`
}
