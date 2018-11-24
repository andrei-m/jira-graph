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
	q := url.Values{"fields": jc.getRequestFields()}
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
	return jc.unmarshallIssue(parsed), nil
}

func getEpicColorCode(jc jiraClient, key string) (string, error) {
	resp, err := jc.Get(fmt.Sprintf("/rest/agile/1.0/epic/%s", key), url.Values{})
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	resultBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	parsed := gjson.ParseBytes(resultBytes)

	color := parsed.Get("color.key").String()
	return color, nil
}

func getIssues(jc jiraClient, epicKey string) ([]issue, error) {
	jql := fmt.Sprintf(`"Epic Link" = %s`, epicKey)

	result := []issue{}
	for {
		b, err := jc.Search(jql, jc.getRequestFields(), len(result))
		if err != nil {
			return nil, err
		}
		parsed := gjson.ParseBytes(b)

		for _, parsedIssue := range parsed.Get("issues").Array() {
			iss := jc.unmarshallIssue(parsedIssue)

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
