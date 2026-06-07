package repository

import (
	"errors"

	"golang.org/x/crypto/bcrypt"
)

type User struct {
	Username string
	Hash     []byte // bcrypt hash of the password, not the password itself
}

// For this project users are stored only in memory using a Go map.
type UserRepository struct {
	users map[string]*User
}

// Creates the repository with a single "admin" user.
func NewUserRepository(adminPasswordHash string) *UserRepository {
    hash := []byte(adminPasswordHash)

    if _, err := bcrypt.Cost(hash); err != nil {
        panic("ADMIN_PASSWORD_HASH is not a valid bcrypt hash: " + err.Error())
    }

	return &UserRepository{
		users: map[string]*User{
			"admin": {Username: "admin", Hash: hash},
		},
	}
}

// Returns the User with the given username.
func (r *UserRepository) FindByUsername(username string) (*User, error) {
	user, ok := r.users[username]
	if !ok {
		return nil, errors.New("user not found")
	}
	return user, nil
}

// Checks whether the provided password matches the stored hash.
func (r *UserRepository) VerifyPassword(user *User, password string) bool {
	return bcrypt.CompareHashAndPassword(user.Hash, []byte(password)) == nil
}
