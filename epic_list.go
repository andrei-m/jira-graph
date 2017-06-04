package graph

import (
	"fmt"
	"io/ioutil"
	"net/url"
	"strconv"

	"github.com/tidwall/gjson"
)

func getEpics(jc jiraClient, project string) ([]epic, error) {
	result := []epic{}

	getAndClose := func(startAt int) ([]byte, error) {
		q := url.Values{
			"jql":     []string{fmt.Sprintf(`type=epic AND project="%s" AND status != Resolved ORDER BY key DESC`, project)},
			"fields":  []string{"summary", "assignee", "status"},
			"startAt": []string{strconv.Itoa(startAt)},
		}
		resp, err := jc.Get("/rest/api/2/search", q)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		return ioutil.ReadAll(resp.Body)
	}

	for {
		b, err := getAndClose(len(result))
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
