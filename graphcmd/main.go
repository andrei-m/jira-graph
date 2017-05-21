package main

import (
	"flag"
	"log"
	"os"

	graph "github.com/andrei-m/jira-graph"
)

var (
	epicKey  = flag.String("epic", "", "JIRA epic key")
	jiraHost = flag.String("jira-host", "", "JIRA hostname")
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
	if len(*epicKey) == 0 {
		log.Fatal("-epic flag is required")
	}
	if len(*jiraHost) == 0 {
		log.Fatal("-jira-host flag is required")
	}

	if err := graph.PrintGraph(user, pass, *jiraHost, *epicKey); err != nil {
		log.Fatalf("failed to print graph: %v", err)
	}
}
