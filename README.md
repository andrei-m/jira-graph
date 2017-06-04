jira-graph
==========

Render a graph view of blocking -> blocked relationships from JIRA epics.

Installation:
```
go get -u github.com/andrei-m/jira-graph
```

Sample usage:
```
JIRA_USER=foo JIRA_PASS=bar ./bin/graphcmd -jira-host=subdomain.atlassian.net -default-project=PROJ
```
