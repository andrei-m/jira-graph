//go:build dev
// +build dev

package main

import "flag"

var devServer = flag.Bool("use-live-files", false, "use live templates and assets instead of embedding, for faster iteration during local development")

func init() {
	flag.Parse()
	useLiveFiles = *devServer
}
