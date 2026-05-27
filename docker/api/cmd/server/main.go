package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"imageflux-live-streaming-simulator/internal/server"
)

func main() {
	allowedOrigins := parseAllowedOrigins(os.Getenv("ALLOWED_ORIGINS"))
	client := &http.Client{Timeout: 20 * time.Second}
	app := server.New(client, allowedOrigins)

	addr := os.Getenv("PORT")
	if addr == "" {
		addr = "8080"
	}
	if !strings.HasPrefix(addr, ":") {
		addr = ":" + addr
	}

	log.Printf("ImageFlux Live Streaming向けの中継サーバを%s番ポートで起動しました", addr)
	if err := http.ListenAndServe(addr, app.Router()); err != nil {
		log.Fatal(err)
	}
}

/***
クロスオリジン許可用のドメインを環境変数からカンマ区切りで取得する関数
***/
func parseAllowedOrigins(value string) []string {
	if value == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := normalizeAllowedOrigin(strings.TrimSpace(part))
		if origin != "" {
			origins = append(origins, origin)
		}
	}

	return origins
}
/***
ALLOWED_ORIGINS環境変数の値を正規化する関数
- 空文字列や"*"はそのまま返す
- それ以外の値は末尾のスラッシュを削除して返す
***/
func normalizeAllowedOrigin(origin string) string {
	if origin == "" || origin == "*" {
		return origin
	}

	return strings.TrimSuffix(origin, "/")
}