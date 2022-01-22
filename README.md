jira-graph
==========

Render a graph view of blocking -> blocked relationships from JIRA epics.

Installation:
```
go get -u github.com/andrei-m/jira-graph
```

Sample usage:
```
JIRA_USER=foo JIRA_PASS=bar ./bin/graphcmd -jira-host=subdomain.atlassian.net -initial-estimate-field=timeoriginalestimate -estimate-field=customfield_10001
```
JIRA_PASS can be a password or API Token

To discover field IDs for passing as flag values, your JIRA instance's [issue fields](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-group-issue-fields) can be found like:
```
curl https://subdomain.atlassian.net/rest/api/2/field --user <JIRA_USER>:<JIRA_PASS>
```