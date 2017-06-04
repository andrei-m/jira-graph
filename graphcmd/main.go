package main

import (
	"flag"
	"log"
	"os"

	graph "github.com/andrei-m/jira-graph"
)

var (
	jiraHost       = flag.String("jira-host", "", "JIRA hostname")
	defaultProject = flag.String("default-project", "MAIN", "the default JIRA project to use for the index page")
)

func main() {
	user := os.Getenv("JIRA_USER")
	if len(user) == 0 {
		log.Fatal("JIRA_USER is required")
	}
	pass := os.Getenv("JIRA_PASS")
	if len(pass) == 0 {
		log.Fatal("JIRA_PASS is required")
	}

	flag.Parse()
	if len(*jiraHost) == 0 {
		log.Fatal("-jira-host flag is required")
	}

	if err := graph.StartServer(user, pass, *jiraHost, *defaultProject); err != nil {
		log.Fatalf("server failed with error: %v", err)
	}
}
