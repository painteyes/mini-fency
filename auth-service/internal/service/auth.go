package service

import (
	"errors"
	"time"

	"auth-service/internal/repository"

	"github.com/golang-jwt/jwt/v5"
)

// Handles user authentication and JWT token generation. 
type AuthService struct {
	repo      *repository.UserRepository
	jwtSecret []byte // secret key used to sign JWT, read from JWT_SECRET
}

// Holds the data embedded inside the JWT.
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims // contains standard JWT fields
}

func NewAuthService(repo *repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		repo:      repo,
		jwtSecret: []byte(jwtSecret),
	}
}

func (s *AuthService) Login(username, password string) (string, error) {
	user, err := s.repo.FindByUsername(username)
	if err != nil {
		// always return "invalid credentials" without specifying whether
		// the issue is the username or the password, to avoid leaking 
		// information to anyone probing for valid usernames
		return "", errors.New("invalid credentials")
	}

	if !s.repo.VerifyPassword(user, password) {
		return "", errors.New("invalid credentials")
	}

	// Build the claims to embed in the token
	claims := Claims{
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "mini-fency",
		},
	}

	// Builds the token (header + payload)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Signs the token with jwtSecret
	return token.SignedString(s.jwtSecret)
}
