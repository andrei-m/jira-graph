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

	fmt.Printf("%v\n", issues)
	return err
}

func getIssues(jc jiraClient, epicKey string) ([]issue, error) {
	result := []issue{}

	getAndClose := func(startAt int) ([]byte, error) {
		q := url.Values{
			"jql":     []string{fmt.Sprintf(`"Epic Link" = %s`, epicKey)},
			"fields":  []string{"summary"},
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
			summary := parsedIssue.Get("fields.summary").String()
			result = append(result, issue{key: key, summary: summary})
		}

		total := parsed.Get("total").Int()
		if len(result) >= int(total) {
			break
		}
	}

	return result, nil
}
