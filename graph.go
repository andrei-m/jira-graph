package graph

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"

	"github.com/tidwall/gjson"
)

func issuesToBlocksGraph(issues []issue) map[string][]string {
	blocksGraph := map[string][]string{}
	for _, iss := range issues {
		for _, blockedBy := range iss.blockedByKeys {
			blocksGraph[blockedBy] = append(blocksGraph[blockedBy], iss.Key)
		}

		_, exists := blocksGraph[iss.Key]
		if !exists {
			blocksGraph[iss.Key] = []string{}
		}
	}
	return blocksGraph
}

type errBadStatus struct {
	statusCode int
}

func (e errBadStatus) Error() string {
	return fmt.Sprintf("code: %d", e.statusCode)
}

func getSingleIssue(jc jiraClient, key string) (issue, error) {
	q := url.Values{
		"fields": []string{"summary", "status", "issuetype"},
	}
	resp, err := jc.Get(fmt.Sprintf("/rest/api/2/issue/%s", key), q)
	if err != nil {
		return issue{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return issue{}, errBadStatus{resp.StatusCode}
	}

	resultBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return issue{}, err
	}
	parsed := gjson.ParseBytes(resultBytes)

	fields := parsed.Get("fields")
	summary := fields.Get("summary").String()
	status := fields.Get("status.name").String()
	issueType := fields.Get("issuetype")
	issueTypeName := issueType.Get("name").String()
	issueTypeImageURL := fields.Get("issuetype.iconUrl").String()

	iss := issue{
		Key:          key,
		Type:         issueTypeName,
		TypeImageURL: issueTypeImageURL,
		Summary:      summary,
		Status:       status,
	}
	return iss, nil
}

func getIssues(jc jiraClient, epicKey string) ([]issue, error) {
	result := []issue{}

	jql := fmt.Sprintf(`"Epic Link" = %s`, epicKey)
	fields := []string{"summary", "issuelinks", "assignee", "status", "issuetype", jc.estimateField}

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

			assignee := fields.Get("assignee")
			assigneeName := assignee.Get("displayName").String()
			assigneeImageURL := assignee.Get("avatarUrls.24x24").String()

			issueType := fields.Get("issuetype")
			issueTypeName := issueType.Get("name").String()
			issueTypeImageURL := issueType.Get("iconUrl").String()
			estimate := int(fields.Get(jc.estimateField).Int())
			iss := issue{
				Key:              key,
				Type:             issueTypeName,
				TypeImageURL:     issueTypeImageURL,
				Summary:          summary,
				Status:           status,
				Assignee:         assigneeName,
				AssigneeImageURL: assigneeImageURL,
				Estimate:         estimate,
			}

			parsedBlocks := fields.Get(`issuelinks.#[type.name=="Blocks"]#.inwardIssue.key`).Array()
			iss.blockedByKeys = make([]string, len(parsedBlocks))
			for i := range parsedBlocks {
				iss.blockedByKeys[i] = parsedBlocks[i].String()
			}
			result = append(result, iss)
		}

		total := parsed.Get("total").Int()
		if len(result) >= int(total) {
			break
		}
	}

	return result, nil
}
