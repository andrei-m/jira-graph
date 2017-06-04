package graph

import (
	"fmt"

	"github.com/tidwall/gjson"
)

func getEpics(jc jiraClient, project string) ([]epic, error) {
	result := []epic{}

	jql := fmt.Sprintf(`type=epic AND project="%s" AND status != Resolved ORDER BY key DESC`, project)
	fields := []string{"summary", "assignee", "status"}

	for {
		b, err := jc.Search(jql, fields, len(result))
		if err != nil {
			return nil, err
		}
		parsed := gjson.ParseBytes(b)

		for _, parsedIssue := range parsed.Get("issues").Array() {
			key := parsedIssue.Get("key").String()
			fields := parsedIssue.Get("fields")
			summary := fields.Get("summary").String()
			status := fields.Get("status.name").String()
			assignee := fields.Get("assignee.displayName").String()
			e := epic{
				Key:      key,
				Type:     "Epic",
				Summary:  summary,
				Status:   status,
				Assignee: assignee,
			}

			result = append(result, e)
		}

		total := parsed.Get("total").Int()
		if len(result) >= int(total) {
			break
		}
	}

	return result, nil
}
