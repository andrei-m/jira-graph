jira-graph
==========

Resolve a macro view of blocking -> blocked relationships from JIRA.

Installation:
```
go get -u github.com/andrei-m/jira-graph
```

Sample usage (dump the graph for a single epic):
```
JIRA_USER=foo JIRA_PASS=bar ./bin/graphcmd -jira-host=subdomain.atlassian.net -epic=PROJECT-1234
```

Daemon mode:
```
JIRA_USER=foo JIRA_PASS=bar ./bin/graphcmd -jira-host=subdomain.atlassian.net -server
```
