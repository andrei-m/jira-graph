import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import React from 'react';
import ReactDOM from 'react-dom';

cytoscape.use(dagre);

//TODO: DRY 'recent-epics' related access between graph.js & index.js
function pushRelatedEpic(epic) {
    if (typeof(Storage) === "undefined") {
        return
    }
    var epics = [];

    const rawRecentEpics = localStorage.getItem('recent-epics');
    if (rawRecentEpics) {
        try {
            var parsed = JSON.parse(rawRecentEpics);
            if (parsed && parsed.constructor === Array) {
                epics = parsed;
            }
        } catch (err) {
            console.log('failed to parse recent-epics from local storage: ' + err);
        }
    }
    for (var i = 0; i < epics.length; i++) {
        if (epics[i].key === epic.key) {
            epics.splice(i, 1);
        }
    }
    epics.unshift(epic);
    if (epics.length > 10) {
        epics.pop();
    }
    localStorage.setItem('recent-epics', JSON.stringify(epics));
}

function categorizeStatus(s) {
    if (s == 'Backlog' || s == 'Ready for Dev') {
        return 'Backlog';
    }
    if (s == 'In Progress' || s == 'In QA on feature branch' || s == 'In Code Review' || s == 'Resolved, on staging') {
        return 'In Progress';
    }
    return s;
}

function statusToRGB(s) {
    const categorized = categorizeStatus(s);
    if (categorized == 'Backlog') {
        return '#ffffff';
    }
    if (categorized == 'In Progress') {
        return '#35e82c';
    }
    if (categorized == 'Closed') {
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
        const yOffset = 45;

        const style = {
            left: this.props.selectedEpic.popupPosition.x + 'px',
            top: (this.props.selectedEpic.popupPosition.y + yOffset) + 'px',
        }

        const epic = this.props.selectedEpic.epic;

        var className = 'popup';
        if (epic.flagged) {
            className = className + ' flagged';
        }

        return (
            <div className={className} style={style}>
            <div className="popup-summary">{epic.summary}</div>
            <div className="popup-container">
              <PopupIcon alt={'Type: ' + epic.type} imageURL={epic.typeImageURL} />
              <PopupIcon alt={'Priority: ' + epic.priority} imageURL={epic.priorityImageURL} />
              <span className="popup popup-flagged">{epic.flagged ? '⚑' : ''}</span>
              <PopupEstimate estimate={epic.estimate} />
              <PopupKey epicKey={epic.key} />
              <PopupAssignee assignee={epic.assignee} assigneeImageURL={epic.assigneeImageURL} />
              <div className="popup-status-text">
                  {epic.status}
                  <PopupSprint sprints={epic.sprints} />
              </div>
              <PopupLabels labels={epic.labels} />
            </div>
            <PopupStatus status={epic.status} />
          </div>
        )
    }
}

class PopupSprint extends React.Component {
    render() {
        const sprints = this.props.sprints;
        if (sprints.length == 0) {
            return null;
        }
        return <span> {sprints[sprints.length-1].name}</span>;
    }
}

class PopupIcon extends React.Component {
    render() {
        return (
            <span className="popup">
        <img src={this.props.imageURL} alt={this.props.alt} title={this.props.alt} />
      </span>
        )
    }
}

class PopupAssignee extends React.Component {
    render() {
        if (this.props.assignee === '') {
            return <span className="popup-avatar" />
        }

        const alt = 'Assignee: ' + this.props.assignee;
        return (
            <span className="popup-avatar">
        <img src={this.props.assigneeImageURL} alt={alt} title={alt} />
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

class PopupEstimate extends React.Component {
    render() {
        return (
            <span className="popup-estimate">{this.props.estimate === 0 ? "-" : this.props.estimate}</span>
        );
    }
}

class PopupStatus extends React.Component {
    render() {
        const style = {
            backgroundColor: statusToRGB(this.props.status),
        }
        return <div className="popup-status" style={style} />
    }
}

class PopupLabels extends React.Component {
    render() {
        var labelListItems = [];
        for (var i = 0; i < this.props.labels.length; i++) {
            labelListItems.push(<li>{this.props.labels[i]}</li>);
        }
        return (
            <div className="popup-labels">
        <ul>{labelListItems}</ul>
      </div>
        );
    }
}

class GraphApp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            isLoaded: false,
            epic: {},
        };
    }

    render() {
        if (this.state.error) {
            return <div>Error: failed to fetch the epic</div>
        } else if (!this.state.isLoaded) {
            return <div>Loading...</div>
        } else {
            return (
                <div>
					<Graph epic={this.state.epic} toggleMenu={this.props.toggleMenu} />
					<EpicStats initialEstimate={this.props.initialEstimate} epic={this.state.epic} />
				</div>
            );
        }
    }

    componentDidMount() {
        const epicKey = this.props.epicKey;
        console.log('loading ' + epicKey);

        fetch("/api/epics/" + epicKey)
            .then(res => {
                if (!res.ok) {
                    throw new Error('not ok');
                }
                return res.json();
            }).then(result => {
                this.setState({
                    isLoaded: true,
                    epic: result,
                });
                console.log('loaded ' + epicKey);
            }).catch(() => {
                console.log('failed to load ' + epicKey);
                this.setState({
                    isLoaded: false,
                    error: true,
                });
            });
    }
}

class Menu extends React.Component {
    render() {
        return (
            <span className="menu-container">
      <label htmlFor="menu-toggle">&#9776;</label>
		<input type="checkbox" id="menu-toggle" checked={this.props.showMenu} onChange={() => this.props.toggleMenu()} />
		<div className="menu">
			Related epics
			<hr />
            <RelatedEpics epicKey={this.props.epicKey} />
		</div>
      </span>
        )
    }
}

class RelatedEpics extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            isLoaded: false,
            epics: [],
        };
    }

    render() {
        if (this.state.error) {
            return <div>Error: failed to fetch related epics</div>;
        } else if (!this.state.isLoaded) {
            return <div>Loading...</div>;
        } else {
            const epics = this.state.epics;
            if (epics.length == 0) {
                return <div>none!</div>;
            }

            var anchors = [];
            for (var i = 0; i < epics.length; i++) {
                const url = '/epics/' + epics[i].key;
                anchors.push(
                    <a href={url}>
                    <img src={epics[i].typeImageURL} />
                    {epics[i].key} - {epics[i].summary}
                  </a>
                );
            }

            return <div>{anchors}</div>;
        }
    }

    componentDidMount() {
        const epicKey = this.props.epicKey

        console.log('loading related epics for ' + epicKey);
        fetch("/api/epics/" + epicKey + "/related")
            .then(res => {
                if (!res.ok) {
                    throw new Error('not ok');
                }
                return res.json();
            })
            .then(result => {
                this.setState({
                    isLoaded: true,
                    epics: result,
                });
                console.log('loaded related epics for ' + epicKey);
            }).catch(
                () => {
                    console.log('failed to load related epics for ' + epicKey);
                    this.setState({
                        isLoaded: false,
                        error: true,
                        epics: [],
                    });
                });
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
                        'border-width': function(ele) {
                            const sprints = ele.data('sprints');
                            if (sprints) {
                                for (var i = 0; i < sprints.length; i++) {
                                    if (sprints[i].state == 'ACTIVE' || sprints[i].state == 'CLOSED') {
                                        return 3;
                                    }
                                }
                            }
                            return 1;
                        },
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
                this.props.toggleMenu(false);
            }
        });

        cy.on('tap', 'node', (evt) => {
            const epic = evt.target.data();
            const position = evt.renderedPosition;
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

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showMenu: false,
        }
    }

    render() {
        const issueURL = "https://" + this.props.jiraHost + "/browse/" + this.props.epicKey;
        const issueLabel = this.props.epicKey + " - " + this.props.issueSummary;
        return (
            <div>
				<h1>
                    <a className="home" href="/">&#8962;</a>
					<Menu epicKey={this.props.epicKey} toggleMenu={(show) => this.toggleMenu(show)} showMenu={this.state.showMenu} />
					<a href={issueURL} target="_blank">{issueLabel}</a>
				</h1>
				<GraphApp epicKey={this.props.epicKey} 
					initialEstimate={this.props.initialEstimate} 
					toggleMenu={(show) => this.toggleMenu(show)} />
			</div>
        )
    }

    toggleMenu(show) {
        if (show === undefined) {
            this.setState({
                showMenu: !this.state.showMenu,
            });
            return;
        }
        this.setState({
            showMenu: show,
        });
    }
}

class EpicStats extends React.Component {
    render() {
        var byStatus = this.getBreakdownByStatus();
        var rows = [];

        var statusOrder = ['Backlog', 'In Progress', 'Closed'];
        for (var i = 0; i < statusOrder.length; i++) {
            var status = statusOrder[i];
            if (byStatus[status]) {
                rows.push(<tr><td>{status}</td><td className="points">{byStatus[status]}</td></tr>);
            }
        }

        if (this.props.initialEstimate != 0) {
            rows.push(<tr class="initialEstimate"><td>Initial Estimate</td><td className="points">{this.props.initialEstimate}</td></tr>);
        }

        return (
            <div className="epicStats">
                <table>
                  <thead>
                    <tr><th colspan="2">Point Breakdown</th></tr>
                  </thead>
                  <tbody>{rows}</tbody>
                </table>
			</div>
        );
    }

    getBreakdownByStatus() {
        var epic = this.props.epic;
        var result = {};
        for (var i = 0; i < epic.issues.length; i++) {
            var status = categorizeStatus(epic.issues[i].status);
            if (result[status]) {
                result[status] += epic.issues[i].estimate;
                continue;
            }
            result[status] = epic.issues[i].estimate;
        }
        return result;
    }
}

var root = document.getElementById('root');
ReactDOM.render(<App epicKey={root.dataset.issueKey}
		issueSummary={root.dataset.issueSummary}
		initialEstimate={root.dataset.issueInitialEstimate}
		jiraHost={root.dataset.jiraHost} />, root);

var epic = {
    key: root.dataset.issueKey,
    summary: root.dataset.issueSummary
};
pushRelatedEpic(epic);