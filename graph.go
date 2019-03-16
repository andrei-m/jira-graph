package graph

import (
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"strings"

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
	issue := jc.unmarshallIssue(parsed)

	if issue.Type == "Epic" {
		colorCode, err := getEpicColorCode(jc, key)
		if err != nil {
			log.Printf("failed to get epic color code: %v", err)
		}
		issue.Color = colorCode
	}

	return issue, nil
}

func getEpicColorCodes(jc jiraClient, keys []string) map[string]string {
	type singleEpicResult struct {
		key       string
		colorCode string
	}
	ch := make(chan singleEpicResult)

	for _, key := range keys {
		go func(key string) {
			code, err := getEpicColorCode(jc, key)
			if err != nil {
				log.Printf("failed to get epic color code: %v", err)
				ch <- singleEpicResult{key: key}
				return
			}
			ch <- singleEpicResult{key: key, colorCode: code}
		}(key)
	}

	result := map[string]string{}
	for _ = range keys {
		r := <-ch
		result[r.key] = r.colorCode
	}
	return result
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

func getIssues(jc jiraClient, epicKeys ...string) ([]issue, error) {
	if len(epicKeys) == 0 {
		return nil, errors.New("at least one epic key is required")
	}
	jql := fmt.Sprintf(`"Epic Link" IN (%s)`, strings.Join(epicKeys, ","))
	return getIssuesJQL(jc, jql)
}

func getMilestoneEpics(jc jiraClient, milestoneKey string) ([]issue, error) {
	jql := fmt.Sprintf(`issue IN linkedIssues("%s") AND type=epic`, milestoneKey)
	return getIssuesJQL(jc, jql)
}

func getIssuesJQL(jc jiraClient, jql string) ([]issue, error) {
	result := []issue{}
	epicKeys := map[string]struct{}{}

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
			epicKeys[iss.EpicKey] = struct{}{}
		}

		total := parsed.Get("total").Int()
		if len(result) >= int(total) {
			break
		}
	}

	dedupedEpicKeys := make([]string, 0, len(epicKeys))
	for k := range epicKeys {
		dedupedEpicKeys = append(dedupedEpicKeys, k)
	}

	epicToColorCode := getEpicColorCodes(jc, dedupedEpicKeys)
	for i := range result {
		result[i].Color = epicToColorCode[result[i].EpicKey]
	}

	return result, nil
}
