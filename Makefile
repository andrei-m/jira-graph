.PHONY: frontend
frontend:
	npm install
	npm run-script build

build: test preprocess
	go install -tags=nomsgpack -ldflags="-s -w" github.com/andrei-m/jira-graph/graphcmd

dev: test
	go install -tags=nomsgpack,dev github.com/andrei-m/jira-graph/graphcmd

test: frontend
	go test

preprocess:
	js-beautify -r -X src/*
