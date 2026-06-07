package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"auth-service/internal/handler"
	"auth-service/internal/repository"
	"auth-service/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	var missingVars []string

	if os.Getenv("JWT_SECRET") == "" {
		missingVars = append(missingVars, "JWT_SECRET")
	}
	if os.Getenv("ADMIN_PASSWORD_HASH") == "" {
		missingVars = append(missingVars, "ADMIN_PASSWORD_HASH")
	}
	if os.Getenv("ALLOWED_ORIGINS") == "" {
		missingVars = append(missingVars, "ALLOWED_ORIGINS")
	}
	if len(missingVars) > 0 {
		log.Fatalf("missingVars required environment variables: %s", strings.Join(missingVars, ", "))
	}

	// Environment variables
	jwtSecret := os.Getenv("JWT_SECRET")
	adminPasswordHash := os.Getenv("ADMIN_PASSWORD_HASH")
	allowedOrigins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // default if not set
	}

	// Dependency injection
	userRepo := repository.NewUserRepository(adminPasswordHash)
	authService := service.NewAuthService(userRepo, jwtSecret)
	authHandler := handler.NewAuthHandler(authService)

	// Router setup
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: allowedOrigins,
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
	}))

	// Routes
	r.Post("/login", authHandler.Login)

	// Debug
	log.Printf("Auth service starting on :%s", port)

	// Start the HTTP server
	err := http.ListenAndServe(":"+port, r)

	// Only returns on startup error
	if err != nil {
		log.Fatal(err)
	}
}
