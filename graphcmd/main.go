package main

import (
	"flag"
	"log"
	"os"

	graph "github.com/andrei-m/jira-graph"
)

var (
	jiraHost             = flag.String("jira-host", "", "JIRA hostname")
	initialEstimateField = flag.String("initial-estimate-field", "timeoriginalestimate", "the name of the custom field an epic's initial estimate (story points, etc.)")
	estimateField        = flag.String("estimate-field", "customfield_10031", "the name of the custom field for work estimation (story points, etc.)")
	flaggedField         = flag.String("flagged-field", "customfield_10002", "the name of the custom field for impediment flagging")
	sprintsField         = flag.String("sprints-field", "Sprint", "the name of the custom field for Greenhopper sprints")
	epicLinkField        = flag.String("epic-link-field", "Epic Link", "the name of the custom field for Epic Link")
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

	fc := graph.FieldConfig{
		InitialEstimate: *initialEstimateField,
		Estimate:        *estimateField,
		Flagged:         *flaggedField,
		Sprints:         *sprintsField,
		EpicLink:        *epicLinkField,
	}

	if err := graph.StartServer(user, pass, *jiraHost, fc); err != nil {
		log.Fatalf("server failed with error: %v", err)
	}
}
