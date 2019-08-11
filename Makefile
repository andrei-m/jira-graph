build: test preprocess
	npm install
	npm run-script build
	go install github.com/andrei-m/jira-graph/graphcmd

test:
	go test

preprocess:
	js-beautify -r -X src/*
