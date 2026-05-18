package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
)

func main() {
	// Usage: checksha <filePath>
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: checksha <filePath>")
		os.Exit(2)
	}

	path := os.Args[1]
	f, err := os.Open(path)
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}

	fmt.Print(hex.EncodeToString(h.Sum(nil)))
}

