package graph

import (
	"fmt"
	"log"
	"strings"

	"github.com/tidwall/gjson"
)

func getRelatedEpics(jc jiraClient, epicKey string) ([]issue, error) {
	milestoneKeys := []string{}
	//TODO: make 'Milestone' configurable; pretty sure it's installation-specific
	milestoneJQL := fmt.Sprintf("issue IN linkedIssues(%s) AND type=Milestone", epicKey)
	fields := []string{"key"}

	for {
		b, err := jc.Search(milestoneJQL, fields, len(milestoneKeys))
		if err != nil {
			return nil, err
		}
		parsed := gjson.ParseBytes(b)

		for _, parsedIssue := range parsed.Get("issues").Array() {
			milestoneKeys = append(milestoneKeys, parsedIssue.Get("key").String())
		}

		total := parsed.Get("total").Int()
		if len(milestoneKeys) >= int(total) {
			break
		}
	}
	log.Println("related milestones:", milestoneKeys)

	milestoneClauses := make([]string, len(milestoneKeys))
	for i := range milestoneKeys {
		milestoneClauses[i] = fmt.Sprintf("issue IN linkedIssues(%s)", milestoneKeys[i])
	}

	epicJQL := fmt.Sprintf("(%s) AND type=Epic AND key != %s ORDER BY key", strings.Join(milestoneClauses, " OR "), epicKey)
	fields = jc.getRequestFields()
	result := []issue{}
	for {
		b, err := jc.Search(epicJQL, fields, len(result))
		if err != nil {
			return nil, err
		}
		//TODO: DRY consistent creation of an 'issue' from a gson result
		parsed := gjson.ParseBytes(b)

		for _, parsedIssue := range parsed.Get("issues").Array() {
			result = append(result, jc.unmarshallIssue(parsedIssue))
		}

		total := parsed.Get("total").Int()
		if len(result) >= int(total) {
			break
		}
	}
	return result, nil
}
