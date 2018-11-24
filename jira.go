package graph

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

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
	InitialEstimate  float64  `json:"initialEstimate"`
	Estimate         float64  `json:"estimate"` // note that this doesn't differentiate between '0' and unset
	Priority         string   `json:"priority"`
	PriorityImageURL string   `json:"priorityImageURL"`
	Labels           []string `json:"labels"`
	Flagged          bool     `json:"flagged"`
	Sprints          []sprint `json:"sprints"`
	Color            string   `json:"color"`
	blockedByKeys    []string
}

type jiraClient struct {
	host                 string
	user                 string
	pass                 string
	initialEstimateField string
	estimateField        string
	flaggedField         string
	sprintsField         string
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
		j.initialEstimateField,
		j.estimateField,
		j.flaggedField,
		j.sprintsField,
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

	initialEstimate := fields.Get(j.initialEstimateField).Float()
	estimate := fields.Get(j.estimateField).Float()

	flaggedObj := fields.Get(j.flaggedField).Array()
	//TODO: the 'Impediment' constant should be configurable alongside the field name
	flagged := len(flaggedObj) == 1 && flaggedObj[0].Get("value").String() == "Impediment"

	rawLabels := fields.Get("labels").Array()
	labels := make([]string, len(rawLabels))
	for i := range rawLabels {
		labels[i] = rawLabels[i].String()
	}

	sprintsResults := fields.Get(j.sprintsField).Array()
	sprints := parseSprints(sprintsResults)

	return issue{
		Key:              key,
		Type:             issueTypeName,
		TypeImageURL:     issueTypeImageURL,
		Summary:          summary,
		Status:           status,
		Assignee:         assigneeName,
		AssigneeImageURL: assigneeImageURL,
		InitialEstimate:  initialEstimate,
		Estimate:         estimate,
		Priority:         priorityName,
		PriorityImageURL: priorityImageURL,
		Labels:           labels,
		Flagged:          flagged,
		Sprints:          sprints,
	}
}

func parseSprints(sprintsResults []gjson.Result) []sprint {
	sprints := make([]sprint, len(sprintsResults))
	for i := range sprintsResults {
		sprint, err := parseSprint(sprintsResults[i].String())
		if err != nil {
			log.Printf("bad sprint: %v", err)
			continue
		}
		sprints[i] = sprint
	}
	sort.Slice(sprints, func(i, j int) bool { return sprints[i].Sequence < sprints[j].Sequence })
	return sprints
}

type sprint struct {
	ID        int       `json:"id"`
	State     string    `json:"state"`
	Name      string    `json:"name"`
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
	Sequence  int       `json:"sequence"`
}

func parseSprint(rawSprint string) (sprint, error) {
	bracketIdx := strings.Index(rawSprint, "[")
	if bracketIdx == -1 {
		return sprint{}, fmt.Errorf("couldn't find opening '[' in: %s", rawSprint)
	}
	trimmed := rawSprint[bracketIdx+1 : len(rawSprint)-1]

	rawKeyVals := strings.Split(trimmed, ",")
	keyVals := map[string]string{}
	for _, raw := range rawKeyVals {
		keyAndVal := strings.Split(raw, "=")
		if len(keyAndVal) != 2 {
			return sprint{}, fmt.Errorf("malformed key=val entry %s in: %s", keyAndVal, rawSprint)
		}
		keyVals[keyAndVal[0]] = keyAndVal[1]
	}

	id, err := strconv.Atoi(keyVals["id"])
	if err != nil {
		return sprint{}, fmt.Errorf("malformed id %s in: %s", keyVals["id"], rawSprint)
	}
	startDate, err := parseDate(keyVals["startDate"])
	if err != nil {
		return sprint{}, fmt.Errorf("malformed startDate %s in: %s", keyVals["startDate"], rawSprint)
	}
	endDate, err := parseDate(keyVals["endDate"])
	if err != nil {
		return sprint{}, fmt.Errorf("malformed endDate %s in: %s", keyVals["endDate"], rawSprint)
	}
	sequence, err := strconv.Atoi(keyVals["sequence"])
	if err != nil {
		return sprint{}, fmt.Errorf("malformed sequence %s in: %s", keyVals["sequence"], rawSprint)
	}

	return sprint{
		ID:        id,
		State:     keyVals["state"],
		Name:      keyVals["name"],
		StartDate: startDate,
		EndDate:   endDate,
		Sequence:  sequence,
	}, nil
}

func parseDate(raw string) (time.Time, error) {
	if raw == "<null>" {
		return time.Time{}, nil
	}
	date, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return time.Time{}, fmt.Errorf("malformed date %s", raw)
	}
	return date, nil
}
