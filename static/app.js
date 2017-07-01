(function() {
    function statusToRGB(s) {
        if (s == 'Backlog' || s == 'Ready for Dev') {
            return '#ffffff';
        }
        if (s == 'In Progress' || s == 'In QA on feature branch' || s == 'In Code Review' || s == 'Resolved, on staging') {
            return '#35e82c';
        }
        if (s == 'Closed') {
            return '#959595';
        }
        return '#000000';
    }

    function showPopup(pos, issue) {
        var popupKey = document.getElementById('popup-key');
        popupKey.innerHTML = '<a href="/epics/' + issue.key + '/details">' + issue.key + '</a>';

        var popupSummary = document.getElementById('popup-summary');
        popupSummary.textContent = issue.summary;

        var popupStatus = document.getElementById('popup-status');
        popupStatus.style.backgroundColor = statusToRGB(issue.status);

        var popupEstimate = document.getElementById('popup-estimate');
        popupEstimate.textContent = issue.estimate === 0 ? '-' : issue.estimate;

        var popupAvatar = document.getElementById('popup-avatar');
        if (issue.assignee != "") {
            popupAvatar.innerHTML = '<img src="' + issue.assigneeImageURL + '" alt="Assignee: ' + issue.assignee + '" title="Assignee: ' + issue.assignee + '">';
        } else {
            popupAvatar.innerHTML = '';
        }

        var popup = document.getElementById('popup');
        popup.style.left = pos.x + 'px';
        var y = pos.y - popup.offsetHeight;
        popup.style.top = y + 'px';
        popup.style.visibility = 'visible';
    }

    function hidePopup() {
        var popup = document.getElementById('popup');
        popup.style.visibility = 'hidden';
    }

    function renderGraph(data) {
        var issues = data.issues.map(function(elem) {
            return {
                data: Object.assign({
                    id: elem.key
                }, elem)
            }
        });

        var issueEdges = [];
        for (var i = 0; i < issues.length; i++) {
            var blockingIssue = issues[i].data.id;
            var blockedIssues = data.graph[blockingIssue];
            for (var j = 0; j < blockedIssues.length; j++) {
                var id = blockingIssue + '_blocks_' + blockedIssues[j];
                issueEdges.push({
                    data: {
                        id: id,
                        source: blockingIssue,
                        target: blockedIssues[j]
                    }
                });
            }
        }

        var cy = cytoscape({
            container: document.getElementById('cy'),

            boxSelectionEnabled: false,
            autounselectify: true,

            layout: {
                name: 'dagre',
                directed: true
            },

            style: [{
                    selector: 'node',
                    style: {
                        'content': 'data(id)',
                        'text-opacity': 0.8,
                        'color': '#000000',
                        'font-size': 18,
                        'font-weight': 'bold',
                        'background-color': function(ele) {
                            return statusToRGB(ele.data('status'))
                        },
                        'border-width': 1,
                        'border-color': '#000000'
                    }
                },

                {
                    selector: 'edge',
                    style: {
                        'curve-style': 'bezier',
                        'width': 4,
                        'target-arrow-shape': 'triangle',
                        'line-color': '#9dbaea',
                        'target-arrow-color': '#9dbaea'
                    }
                }
            ],

            elements: {
                nodes: issues,
                edges: issueEdges,
            },
        });

        cy.on('tap', function(evt) {
            if (evt.target === cy) {
                hidePopup();
            }
        });

        cy.on('tap', 'node', function(evt) {
            showPopup(evt.renderedPosition, {
                key: this.data('id'),
                summary: this.data('summary'),
                status: this.data('status'),
                estimate: this.data('estimate'),
                assignee: this.data('assignee'),
                assigneeImageURL: this.data('assigneeImageURL')
            });
        });

        cy.on('mouseover', 'node', function(evt) {
            document.body.style.cursor = 'pointer';
        });

        cy.on('mouseout', 'node', function() {
            document.body.style.cursor = 'default';
        });
    }

    window.onload = function() {
        var pathparts = window.location.pathname.split('/');
        var epicKey = pathparts[pathparts.length - 1];
        console.log('loading ' + epicKey);

        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var resp = JSON.parse(this.responseText);
                renderGraph(resp);
                console.log('loaded ' + epicKey);
            }
        }
        xhr.open('GET', '/api/epics/' + epicKey, true);
        xhr.send();
    }
})();