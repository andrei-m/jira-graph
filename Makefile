build:
	js-beautify -r -X src/index.js
	npx webpack
	go install github.com/andrei-m/jira-graph/graphcmd
