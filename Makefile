.PHONY: frontend
frontend:
	npm install
	npm run-script build

build: test
	go install -tags=nomsgpack -ldflags="-s -w" github.com/andrei-m/jira-graph/graphcmd

dev: test
	go install -tags=nomsgpack,dev github.com/andrei-m/jira-graph/graphcmd

test: frontend
	go test
