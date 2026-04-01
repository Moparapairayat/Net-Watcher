package store

import (
	"context"
	"database/sql"
	"errors"
	"net/mail"
	"strings"
	"time"
)

var (
	ErrUserExists         = errors.New("user already exists")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailNotVerified   = errors.New("email not verified")
	ErrSessionNotFound    = errors.New("session not found")
	ErrResetTokenNotFound = errors.New("reset token not found")
	ErrVerificationCode   = errors.New("verification code is invalid or expired")
)

type User struct {
	ID                   int64      `json:"id"`
	Name                 string     `json:"name"`
	Email                string     `json:"email"`
	VerificationRequired bool       `json:"verification_required"`
	EmailVerifiedAt      *time.Time `json:"email_verified_at,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
}

func NormalizeEmail(value string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "", errors.New("email is required")
	}
	addr, err := mail.ParseAddress(value)
	if err != nil || !strings.EqualFold(strings.TrimSpace(addr.Address), value) {
		return "", errors.New("email is invalid")
	}
	return value, nil
}

func (s *Store) CreateUser(ctx context.Context, name, email, passwordHash string, verificationRequired bool) (User, error) {
	email, err := NormalizeEmail(email)
	if err != nil {
		return User{}, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return User{}, errors.New("name is required")
	}

	var user User
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO users (name, email, password_hash, verification_required)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, email, verification_required, email_verified_at, created_at
	`, name, email, passwordHash, verificationRequired).Scan(&user.ID, &user.Name, &user.Email, &user.VerificationRequired, &user.EmailVerifiedAt, &user.CreatedAt)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "idx_users_email_lower") {
			return User{}, ErrUserExists
		}
		return User{}, err
	}
	return user, nil
}

func (s *Store) AuthenticateUser(ctx context.Context, email string) (User, string, error) {
	email, err := NormalizeEmail(email)
	if err != nil {
		return User{}, "", err
	}

	var user User
	var passwordHash string
	err = s.db.QueryRowContext(ctx, `
		SELECT id, name, email, password_hash, verification_required, email_verified_at, created_at
		FROM users
		WHERE email = $1
	`, email).Scan(&user.ID, &user.Name, &user.Email, &passwordHash, &user.VerificationRequired, &user.EmailVerifiedAt, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return User{}, "", ErrInvalidCredentials
	}
	if err != nil {
		return User{}, "", err
	}
	return user, passwordHash, nil
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (User, error) {
	email, err := NormalizeEmail(email)
	if err != nil {
		return User{}, err
	}

	var user User
	err = s.db.QueryRowContext(ctx, `
		SELECT id, name, email, verification_required, email_verified_at, created_at
		FROM users
		WHERE email = $1
	`, email).Scan(&user.ID, &user.Name, &user.Email, &user.VerificationRequired, &user.EmailVerifiedAt, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return User{}, ErrUserNotFound
	}
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *Store) CreateSession(ctx context.Context, userID int64, tokenHash string, expiresAt time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO sessions (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt.UTC())
	return err
}

func (s *Store) GetUserBySessionToken(ctx context.Context, tokenHash string) (User, error) {
	var user User
	err := s.db.QueryRowContext(ctx, `
		SELECT u.id, u.name, u.email, u.verification_required, u.email_verified_at, u.created_at
		FROM sessions s
		INNER JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > NOW()
	`, tokenHash).Scan(&user.ID, &user.Name, &user.Email, &user.VerificationRequired, &user.EmailVerifiedAt, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return User{}, ErrSessionNotFound
	}
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *Store) DeleteSession(ctx context.Context, tokenHash string) error {
	if tokenHash == "" {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	return err
}

func (s *Store) DeleteExpiredSessions(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE expires_at <= NOW()`)
	return err
}

func (s *Store) CreateEmailVerificationCode(ctx context.Context, userID int64, codeHash string, expiresAt time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO email_verification_codes (user_id, code_hash, expires_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id)
		DO UPDATE
		SET code_hash = EXCLUDED.code_hash,
			expires_at = EXCLUDED.expires_at,
			created_at = NOW()
	`, userID, codeHash, expiresAt.UTC())
	return err
}

func (s *Store) DeleteExpiredEmailVerificationCodes(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM email_verification_codes
		WHERE expires_at <= NOW()
	`)
	return err
}

func (s *Store) HasRecentEmailVerificationCode(ctx context.Context, userID int64, since time.Time) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM email_verification_codes
			WHERE user_id = $1
				AND created_at >= $2
				AND expires_at > NOW()
		)
	`, userID, since.UTC()).Scan(&exists)
	return exists, err
}

func (s *Store) DeleteEmailVerificationCode(ctx context.Context, userID int64) error {
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM email_verification_codes
		WHERE user_id = $1
	`, userID)
	return err
}

func (s *Store) VerifyUserEmailCode(ctx context.Context, email string, codeHash string) (User, error) {
	email, err := NormalizeEmail(email)
	if err != nil {
		return User{}, err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return User{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var user User
	err = tx.QueryRowContext(ctx, `
		SELECT u.id, u.name, u.email, u.verification_required, u.email_verified_at, u.created_at
		FROM users u
		INNER JOIN email_verification_codes evc ON evc.user_id = u.id
		WHERE u.email = $1
			AND u.verification_required = TRUE
			AND evc.code_hash = $2
			AND evc.expires_at > NOW()
		FOR UPDATE
	`, email, codeHash).Scan(&user.ID, &user.Name, &user.Email, &user.VerificationRequired, &user.EmailVerifiedAt, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return User{}, ErrVerificationCode
	}
	if err != nil {
		return User{}, err
	}

	var verifiedAt time.Time
	if err := tx.QueryRowContext(ctx, `
		UPDATE users
		SET verification_required = FALSE, email_verified_at = NOW()
		WHERE id = $1
		RETURNING email_verified_at
	`, user.ID).Scan(&verifiedAt); err != nil {
		return User{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM email_verification_codes
		WHERE user_id = $1
	`, user.ID); err != nil {
		return User{}, err
	}

	user.VerificationRequired = false
	user.EmailVerifiedAt = &verifiedAt

	return user, tx.Commit()
}

func (s *Store) CreatePasswordResetToken(ctx context.Context, userID int64, tokenHash string, expiresAt time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at)
		VALUES ($1, $2, $3, NULL)
		ON CONFLICT (user_id)
		DO UPDATE
		SET token_hash = EXCLUDED.token_hash,
			expires_at = EXCLUDED.expires_at,
			used_at = NULL,
			created_at = NOW()
	`, userID, tokenHash, expiresAt.UTC())
	return err
}

func (s *Store) HasRecentPasswordResetToken(ctx context.Context, userID int64, since time.Time) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM password_reset_tokens
			WHERE user_id = $1
				AND created_at >= $2
				AND used_at IS NULL
				AND expires_at > NOW()
		)
	`, userID, since.UTC()).Scan(&exists)
	return exists, err
}

func (s *Store) DeletePasswordResetToken(ctx context.Context, userID int64) error {
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM password_reset_tokens
		WHERE user_id = $1
	`, userID)
	return err
}

func (s *Store) DeleteExpiredPasswordResetTokens(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM password_reset_tokens
		WHERE expires_at <= NOW() OR used_at IS NOT NULL
	`)
	return err
}

func (s *Store) ResetPasswordWithToken(ctx context.Context, tokenHash string, passwordHash string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var userID int64
	err = tx.QueryRowContext(ctx, `
		SELECT user_id
		FROM password_reset_tokens
		WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
		FOR UPDATE
	`, tokenHash).Scan(&userID)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrResetTokenNotFound
	}
	if err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE users
		SET password_hash = $1
		WHERE id = $2
	`, passwordHash, userID); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE password_reset_tokens
		SET used_at = NOW()
		WHERE token_hash = $1
	`, tokenHash); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM sessions WHERE user_id = $1`, userID); err != nil {
		return err
	}

	return tx.Commit()
}
