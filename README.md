jira-graph
==========

Render a graph view of blocking -> blocked relationships from JIRA epics.

This app consists of two components:

- a backend API server responsible for pulling data from Jira
- a frontend single page application that talks to the API server

When built, the backend API server binary, `graphcmd`, will embed all frontend assets. The app can be deployed as a single `graphcmd` binary.

Local Development
-----------------

1. Build the frontend first, so that the 'dist' folder can be embedded when the backend is compiled:
```
npm install
npm run build
```
2. Build the backend:
```
go install github.com/andrei-m/jira-graph/graphcmd
```
3. Start up the backend API server. Override any field mappings as needed (see instructions for how to discover your Jira instance's field keys below)
```
JIRA_USER=your_jira_username JIRA_PASS=your_jira_password $GOPATH/bin/graphcmd -jira-host=your.jira.host -estimate-field=your_customfield_id_override
```
JIRA_PASS can be a password or API token.
4. Start up the frontend in dev mode for quick iteration
```
npm run dev
```

Access the API server on port 8080 and the SPA on port 3000.

To discover field IDs for passing as flag values, your JIRA instance's [issue fields](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-group-issue-fields) can be found like:
```
curl https://subdomain.atlassian.net/rest/api/2/field --user <JIRA_USER>:<JIRA_PASS>
```
