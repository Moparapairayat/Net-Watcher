package objectstore

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"path"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Config struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Region    string
	Bucket    string
	Prefix    string
	UseSSL    bool
}

type Client struct {
	client *minio.Client
	cfg    Config
}

func Open(cfg Config) (*Client, error) {
	if strings.TrimSpace(cfg.Endpoint) == "" {
		return nil, nil
	}
	if strings.TrimSpace(cfg.Bucket) == "" {
		return nil, fmt.Errorf("s3 bucket is required")
	}
	if strings.TrimSpace(cfg.Region) == "" {
		cfg.Region = "us-east-1"
	}

	mc, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	exists, err := mc.BucketExists(ctx, cfg.Bucket)
	if err != nil {
		return nil, err
	}
	if !exists {
		if err := mc.MakeBucket(ctx, cfg.Bucket, minio.MakeBucketOptions{Region: cfg.Region}); err != nil {
			return nil, err
		}
	}

	return &Client{client: mc, cfg: cfg}, nil
}

func (c *Client) Close() error {
	return nil
}

func (c *Client) Ping(ctx context.Context) error {
	if c == nil || c.client == nil {
		return nil
	}
	_, err := c.client.BucketExists(ctx, c.cfg.Bucket)
	return err
}

func (c *Client) UploadJSON(ctx context.Context, key string, value any) (string, error) {
	if c == nil || c.client == nil {
		return "", fmt.Errorf("object storage not configured")
	}
	raw, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return "", err
	}
	return c.upload(ctx, key, "application/json", bytes.NewReader(raw), int64(len(raw)))
}

func (c *Client) UploadCSV(ctx context.Context, key string, rows [][]string) (string, error) {
	if c == nil || c.client == nil {
		return "", fmt.Errorf("object storage not configured")
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	if err := w.WriteAll(rows); err != nil {
		return "", err
	}
	return c.upload(ctx, key, "text/csv", bytes.NewReader(buf.Bytes()), int64(buf.Len()))
}

func (c *Client) PresignedGetURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	if c == nil || c.client == nil {
		return "", fmt.Errorf("object storage not configured")
	}
	url, err := c.client.PresignedGetObject(ctx, c.cfg.Bucket, c.objectKey(key), ttl, nil)
	if err != nil {
		return "", err
	}
	return url.String(), nil
}

func (c *Client) upload(ctx context.Context, key, contentType string, r io.Reader, size int64) (string, error) {
	objectKey := c.objectKey(key)
	_, err := c.client.PutObject(ctx, c.cfg.Bucket, objectKey, r, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", err
	}
	return objectKey, nil
}

func (c *Client) objectKey(key string) string {
	key = strings.TrimLeft(key, "/")
	if strings.TrimSpace(c.cfg.Prefix) == "" {
		return key
	}
	return path.Join(strings.Trim(c.cfg.Prefix, "/"), key)
}
