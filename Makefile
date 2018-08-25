build:
	js-beautify -r -X src/*
	npx webpack
	go install github.com/andrei-m/jira-graph/graphcmd
