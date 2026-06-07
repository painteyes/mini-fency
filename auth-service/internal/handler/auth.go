package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"auth-service/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
}

// Creates and returns a pointer to a new AuthHandler.
func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// POST /login request body
type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// POST /login response body
type loginResponse struct {
	Token string `json:"token"`
}

type errorResponse struct {
	Error string `json:"error"`
}

// Login handles POST /login, returns a JWT on success.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	// Sanitize username and reject blank credentials
	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "username and password are required"})
		return
	}

	// Delegate auth to service layer; returns a signed JWT on success
	token, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid credentials"})
		return
	}

	// Return the token to the client
	writeJSON(w, http.StatusOK, loginResponse{Token: token})
}

// Writes a JSON response with a given HTTP status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
