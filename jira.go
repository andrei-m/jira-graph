package graph

import (
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"

	"github.com/tidwall/gjson"
)

type issue struct {
	Key              string   `json:"key"`
	Type             string   `json:"type"`
	TypeImageURL     string   `json:"typeImageURL"`
	Summary          string   `json:"summary"`
	Status           string   `json:"status"`
	Assignee         string   `json:"assignee"`
	AssigneeImageURL string   `json:"assigneeImageURL"`
	Estimate         float64  `json:"estimate"` // note that this doesn't differentiate between '0' and unset
	Priority         string   `json:"priority"`
	PriorityImageURL string   `json:"priorityImageURL"`
	Labels           []string `json:"labels"`
	Flagged          bool     `json:"flagged"`
	blockedByKeys    []string
}

type jiraClient struct {
	host          string
	user          string
	pass          string
	estimateField string
	flaggedField  string
}

func (j jiraClient) Get(path string, q url.Values) (*http.Response, error) {
	baseURL := url.URL{
		Scheme: "https",
		Host:   j.host,
		Path:   path,
	}
	req, err := http.NewRequest("GET", baseURL.String(), nil)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(j.user, j.pass)
	req.URL.RawQuery = q.Encode()

	client := &http.Client{}
	return client.Do(req)
}

func (j jiraClient) Search(jql string, fields []string, startAt int) ([]byte, error) {
	q := url.Values{
		"jql":     []string{jql},
		"fields":  fields,
		"startAt": []string{strconv.Itoa(startAt)},
	}
	resp, err := j.Get("/rest/api/2/search", q)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return ioutil.ReadAll(resp.Body)
}

func (j jiraClient) getRequestFields() []string {
	return []string{
		"assignee",
		"issuelinks",
		"issuetype",
		"labels",
		"priority",
		"status",
		"summary",
		j.estimateField,
		j.flaggedField,
	}
}

func (j jiraClient) unmarshallIssue(r gjson.Result) issue {
	key := r.Get("key").String()
	fields := r.Get("fields")
	summary := fields.Get("summary").String()
	status := fields.Get("status.name").String()

	assignee := fields.Get("assignee")
	assigneeName := assignee.Get("displayName").String()
	assigneeImageURL := assignee.Get("avatarUrls.24x24").String()

	issueType := fields.Get("issuetype")
	issueTypeName := issueType.Get("name").String()
	issueTypeImageURL := issueType.Get("iconUrl").String()

	priority := fields.Get("priority")
	priorityName := priority.Get("name").String()
	priorityImageURL := priority.Get("iconUrl").String()

	estimate := fields.Get(j.estimateField).Float()

	flaggedObj := fields.Get(j.flaggedField).Array()
	//TODO: the 'Impediment' constant should be configurable alongside the field name
	flagged := len(flaggedObj) == 1 && flaggedObj[0].Get("value").String() == "Impediment"

	rawLabels := fields.Get("labels").Array()
	labels := make([]string, len(rawLabels))
	for i := range rawLabels {
		labels[i] = rawLabels[i].String()
	}

	return issue{
		Key:              key,
		Type:             issueTypeName,
		TypeImageURL:     issueTypeImageURL,
		Summary:          summary,
		Status:           status,
		Assignee:         assigneeName,
		AssigneeImageURL: assigneeImageURL,
		Estimate:         estimate,
		Priority:         priorityName,
		PriorityImageURL: priorityImageURL,
		Labels:           labels,
		Flagged:          flagged,
	}
}
