package store

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
)

func TestCreateUserAndSessionFlow(t *testing.T) {
	st := openTestStore(t, Config{
		BatchSize:     1,
		FlushInterval: 5 * time.Millisecond,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	email := fmt.Sprintf("auth_%d@example.com", time.Now().UnixNano())
	user, err := st.CreateUser(ctx, "Auth Tester", email, "hashed-password", false)
	if err != nil {
		t.Fatalf("CreateUser returned error: %v", err)
	}
	if user.Email != email {
		t.Fatalf("expected email %q, got %q", email, user.Email)
	}

	tokenHash := fmt.Sprintf("token-%d", time.Now().UnixNano())
	if err := st.CreateSession(ctx, user.ID, tokenHash, time.Now().Add(time.Hour)); err != nil {
		t.Fatalf("CreateSession returned error: %v", err)
	}

	sessionUser, err := st.GetUserBySessionToken(ctx, tokenHash)
	if err != nil {
		t.Fatalf("GetUserBySessionToken returned error: %v", err)
	}
	if sessionUser.ID != user.ID {
		t.Fatalf("expected session user id %d, got %d", user.ID, sessionUser.ID)
	}
}

func TestCreateUserRejectsDuplicateEmail(t *testing.T) {
	st := openTestStore(t, Config{
		BatchSize:     1,
		FlushInterval: 5 * time.Millisecond,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	email := fmt.Sprintf("dupe_%d@example.com", time.Now().UnixNano())
	if _, err := st.CreateUser(ctx, "First User", email, "hash-1", false); err != nil {
		t.Fatalf("first CreateUser returned error: %v", err)
	}
	if _, err := st.CreateUser(ctx, "Second User", email, "hash-2", false); !errors.Is(err, ErrUserExists) {
		t.Fatalf("expected ErrUserExists, got %v", err)
	}
}

func TestPasswordResetTokenFlow(t *testing.T) {
	st := openTestStore(t, Config{
		BatchSize:     1,
		FlushInterval: 5 * time.Millisecond,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	email := fmt.Sprintf("reset_%d@example.com", time.Now().UnixNano())
	user, err := st.CreateUser(ctx, "Reset Tester", email, "hash-1", false)
	if err != nil {
		t.Fatalf("CreateUser returned error: %v", err)
	}

	tokenHash := fmt.Sprintf("reset-token-%d", time.Now().UnixNano())
	if err := st.CreatePasswordResetToken(ctx, user.ID, tokenHash, time.Now().Add(time.Hour)); err != nil {
		t.Fatalf("CreatePasswordResetToken returned error: %v", err)
	}

	if err := st.ResetPasswordWithToken(ctx, tokenHash, "hash-2"); err != nil {
		t.Fatalf("ResetPasswordWithToken returned error: %v", err)
	}

	_, passwordHash, err := st.AuthenticateUser(ctx, email)
	if err != nil {
		t.Fatalf("AuthenticateUser returned error: %v", err)
	}
	if passwordHash != "hash-2" {
		t.Fatalf("expected updated password hash, got %q", passwordHash)
	}

	if err := st.ResetPasswordWithToken(ctx, tokenHash, "hash-3"); !errors.Is(err, ErrResetTokenNotFound) {
		t.Fatalf("expected ErrResetTokenNotFound on reused token, got %v", err)
	}
}

func TestEmailVerificationCodeFlow(t *testing.T) {
	st := openTestStore(t, Config{
		BatchSize:     1,
		FlushInterval: 5 * time.Millisecond,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	email := fmt.Sprintf("verify_%d@example.com", time.Now().UnixNano())
	user, err := st.CreateUser(ctx, "Verify Tester", email, "hash-1", true)
	if err != nil {
		t.Fatalf("CreateUser returned error: %v", err)
	}

	codeHash := fmt.Sprintf("verify-code-%d", time.Now().UnixNano())
	if err := st.CreateEmailVerificationCode(ctx, user.ID, codeHash, time.Now().Add(time.Hour)); err != nil {
		t.Fatalf("CreateEmailVerificationCode returned error: %v", err)
	}

	verifiedUser, err := st.VerifyUserEmailCode(ctx, email, codeHash)
	if err != nil {
		t.Fatalf("VerifyUserEmailCode returned error: %v", err)
	}
	if verifiedUser.VerificationRequired {
		t.Fatal("expected user to be marked verified")
	}
	if verifiedUser.EmailVerifiedAt == nil {
		t.Fatal("expected verification timestamp")
	}

	if _, err := st.VerifyUserEmailCode(ctx, email, codeHash); !errors.Is(err, ErrVerificationCode) {
		t.Fatalf("expected ErrVerificationCode on reused code, got %v", err)
	}
}

func TestCreatePasswordResetTokenKeepsSingleActiveRowPerUser(t *testing.T) {
	st := openTestStore(t, Config{
		BatchSize:     1,
		FlushInterval: 5 * time.Millisecond,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	email := fmt.Sprintf("reset_single_%d@example.com", time.Now().UnixNano())
	user, err := st.CreateUser(ctx, "Reset Single User", email, "hash-1", false)
	if err != nil {
		t.Fatalf("CreateUser returned error: %v", err)
	}

	var wg sync.WaitGroup
	errCh := make(chan error, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			tokenHash := fmt.Sprintf("reset-token-%d", i)
			if err := st.CreatePasswordResetToken(ctx, user.ID, tokenHash, time.Now().Add(time.Hour)); err != nil {
				errCh <- err
			}
		}(i)
	}
	wg.Wait()
	close(errCh)

	for err := range errCh {
		t.Fatalf("CreatePasswordResetToken returned error: %v", err)
	}

	var count int
	if err := st.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM password_reset_tokens
		WHERE user_id = $1
	`, user.ID).Scan(&count); err != nil {
		t.Fatalf("count password reset tokens: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected exactly 1 password reset row, got %d", count)
	}
}

func TestCreateEmailVerificationCodeKeepsSingleActiveRowPerUser(t *testing.T) {
	st := openTestStore(t, Config{
		BatchSize:     1,
		FlushInterval: 5 * time.Millisecond,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	email := fmt.Sprintf("verify_single_%d@example.com", time.Now().UnixNano())
	user, err := st.CreateUser(ctx, "Verify Single User", email, "hash-1", true)
	if err != nil {
		t.Fatalf("CreateUser returned error: %v", err)
	}

	var wg sync.WaitGroup
	errCh := make(chan error, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			codeHash := fmt.Sprintf("verify-code-%d", i)
			if err := st.CreateEmailVerificationCode(ctx, user.ID, codeHash, time.Now().Add(time.Hour)); err != nil {
				errCh <- err
			}
		}(i)
	}
	wg.Wait()
	close(errCh)

	for err := range errCh {
		t.Fatalf("CreateEmailVerificationCode returned error: %v", err)
	}

	var count int
	if err := st.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM email_verification_codes
		WHERE user_id = $1
	`, user.ID).Scan(&count); err != nil {
		t.Fatalf("count verification codes: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected exactly 1 email verification row, got %d", count)
	}
}
