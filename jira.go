package graph

import (
	"net/http"
	"net/url"
)

type issue struct {
	key, summary string
}

type jiraClient struct {
	host, user, pass string
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
