package graph

import (
	"fmt"
	"io/ioutil"
	"net/url"
	"strconv"

	"github.com/tidwall/gjson"
)

func PrintGraph(user, pass, jiraHost, epicKey string) error {
	jc := jiraClient{
		host: jiraHost,
		user: user,
		pass: pass,
	}

	issues, err := getIssues(jc, epicKey)
	if err != nil {
		return err
	}
	blocksGraph := issuesToBlocksGraph(issues)

	for blocking, blocked := range blocksGraph {
		fmt.Printf("%s -> %v\n", blocking, blocked)
	}

	return nil
}

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

func getIssues(jc jiraClient, epicKey string) ([]issue, error) {
	result := []issue{}

	getAndClose := func(startAt int) ([]byte, error) {
		q := url.Values{
			"jql":     []string{fmt.Sprintf(`"Epic Link" = %s`, epicKey)},
			"fields":  []string{"summary", "issuelinks", "assignee", "status", "issuetype"},
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
			issueType := fields.Get("issuetype.name").String()
			iss := issue{
				Key:      key,
				Type:     issueType,
				Summary:  summary,
				Status:   status,
				Assignee: assignee,
			}

			parsedBlocks := parsedIssue.Get(`fields.issuelinks.#[type.name=="Blocks"]#.inwardIssue.key`).Array()
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
