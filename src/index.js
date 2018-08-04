import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import React from 'react';
import ReactDOM from 'react-dom';

cytoscape.use(dagre);

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

class Popup extends React.Component {
    render() {
        if (this.props.selectedEpic == null) {
            return <div className="empty"></div>
        }

        //TODO: a hack until offsetHeight can be figured out
        const yOffset = 45

        const style = {
            left: this.props.selectedEpic.popupPosition.x + 'px',
            top: (this.props.selectedEpic.popupPosition.y + yOffset) + 'px',
        }

        return (
          <div className="popup" style={style}>
            <div className="popup-summary">{this.props.selectedEpic.epic.summary}</div>
            <div className="popup-container">
              <PopupType type={this.props.selectedEpic.epic.type} typeImageURL={this.props.selectedEpic.epic.typeImageURL} />
              <span className="popup popup-priority"></span>
              <span className="popup popup-flagged"></span>
              <span className="popup-estimate"></span>
              <PopupKey epicKey={this.props.selectedEpic.epic.key} />
              <span className="popup-avatar"></span>
              <div className="popup-status-text">{this.props.selectedEpic.epic.status}</div>
              <div className="popup-labels"></div>
            </div>
            <div className="popup-status"></div>
          </div>
        )
    }
}

class PopupType extends React.Component {
  render() {
    const alt = 'IssueType: ' + this.props.type;
    return (
      <span className="popup popup-type">
        <img src={this.props.typeImageURL} alt={alt} title={alt} />
      </span>
    )
  }
}

class PopupKey extends React.Component {
  render() {
      const url = '/epics/' + this.props.epicKey + '/details';

      return (
        <span className="popup-key">
          <a href={url} target="_blank">{this.props.epicKey}</a>
        </span>
      );
  }
}

function showPopup(pos, issue) {
    var popupStatus = document.getElementById('popup-status');
    popupStatus.style.backgroundColor = statusToRGB(issue.status);

    var popupType = document.getElementById('popup-type');
    popupType.innerHTML = '<img src="' + issue.typeImageURL + '" alt="Issue Type: ' + issue.type + '" title="Issue Type: ' + issue.type + '">';

    var popupPriority = document.getElementById('popup-priority');
    popupPriority.innerHTML = '<img src="' + issue.priorityImageURL + '" alt="Priority: ' + issue.priority + '" title="Priority: ' + issue.priority + '">';

    var popupEstimate = document.getElementById('popup-estimate');
    popupEstimate.textContent = issue.estimate === 0 ? '-' : issue.estimate;

    var popupAvatar = document.getElementById('popup-avatar');
    if (issue.assignee != "") {
        popupAvatar.innerHTML = '<img src="' + issue.assigneeImageURL + '" alt="Assignee: ' + issue.assignee + '" title="Assignee: ' + issue.assignee + '">';
    } else {
        popupAvatar.innerHTML = '';
    }

    var popupLabels = document.getElementById('popup-labels');
    if (issue.labels != null) {
        var labelsHTML = '<ul>';

        for (var i = 0; i < issue.labels.length; i++) {
            labelsHTML += '<li>' + issue.labels[i] + '</li>';
        }

        labelsHTML += '</ul>';
        popupLabels.innerHTML = labelsHTML;
    } else {
        popupLabels.innerHTML = '';
    }

    var popup = document.getElementById('popup');

    var popupFlagged = document.getElementById('popup-flagged')
    if (issue.flagged === true) {
        popupFlagged.innerHTML = '⚑';
        popup.classList.add('flagged');
    } else {
        popupFlagged.innerHTML = '';
        popup.classList.remove('flagged');
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            isLoaded: false,
            epic: {},
        };
    }

    render() {
        const {
            error,
            isLoaded,
            epic
        } = this.state;
        if (error) {
            return <div>Error: failed to fetch the epic</div>
        } else if (!isLoaded) {
            return <div>Loading...</div>
        } else {
            return <Graph epic={epic} />
        }
    }

    componentDidMount() {
        var pathparts = window.location.pathname.split('/');
        var epicKey = pathparts[pathparts.length - 1];

        console.log('loading ' + epicKey);
        fetch("/api/epics/" + epicKey)
            .then(res => res.json())
            .then(
                (result) => {
                    this.setState({
                        isLoaded: true,
                        epic: result,
                    });
                    console.log('loaded ' + epicKey);
                },
                (error) => {
                    this.setState({
                        isLoaded: false,
                        error: true,
                    });
                }
            )
    }
}

class Graph extends React.Component {
    constructor(props) {
        super(props);
        this.myRef = React.createRef();
        this.state = {
            selectedEpic: null,
        };
    }

    render() {
        return (
            <div>
          <div className = "cy" ref = {this.myRef} />
          <Popup selectedEpic={this.state.selectedEpic} />
        </div>
        );
    }

    componentDidMount() {
        this.renderGraph(this.props.epic);
    }

    renderGraph(data) {
        const root = this.myRef.current;
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
            container: root,

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

        cy.on('tap', (evt) => {
            if (evt.target === cy) {
                this.setState({
                    selectedEpic: null,
                });
            }
        });

        cy.on('tap', 'node', (evt) => {
            const epic = evt.target.data();
            const position = evt.renderedPosition;
            console.log(position);
            this.setState({
                selectedEpic: {
                    epic: epic,
                    popupPosition: position,
                }
            });
        });

        cy.on('mouseover', 'node', function(evt) {
            document.body.style.cursor = 'pointer';
        });

        cy.on('mouseout', 'node', function() {
            document.body.style.cursor = 'default';
        });
    }
}

ReactDOM.render(<App />, document.getElementById('root'));
