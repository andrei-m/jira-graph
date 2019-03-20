import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import React from 'react';
import ReactDOM from 'react-dom';
import {
    pushRecentIssue
} from './recent';
import {
    colors
} from './colors';

cytoscape.use(dagre);

const statuses = {
    Backlog: 'Backlog',
    ReadyForDev: 'Ready for Dev',
    InProgress: 'In Progress',
    OnFeatureBranch: 'In QA on feature branch',
    InCodeReview: 'In Code Review',
    ResolvedOnStaging: 'Resolved, on staging',
    Closed: 'Closed'
}

function categorizeStatus(s) {
    if (s == statuses.Backlog || s == statuses.ReadyForDev) {
        return statuses.Backlog;
    }
    if (s == statuses.InProgress || s == statuses.OnFeatureBranch || s == statuses.InCodeReview) {
        return statuses.InProgress;
    }
    return s;
}

function statusToRGB(s) {
    const categorized = categorizeStatus(s);
    if (categorized == statuses.Backlog) {
        return '#ffffff';
    }
    if (categorized == statuses.InProgress) {
        return '#35e82c';
    }
    if (categorized == statuses.ResolvedOnStaging) {
        return '#2C35E8';
    }
    if (categorized == statuses.Closed) {
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
            issueGraph: {},
            selectedEpics: new Map(),
        };
    }

    initSelectedEpics(issueGraph) {
        const issues = issueGraph.issues;
        var selectedEpics = new Map();
        for (var i = 0; i < issues.length; i++) {
            selectedEpics.set(issues[i].epicKey, true);
        }
        return selectedEpics;
    }

    handleEpicSelection(val) {
        const epicKey = val.target.value;
        const selected = val.target.checked;
        this.setState(prevState => ({
            selectedEpics: prevState.selectedEpics.set(epicKey, selected)
        }));
    }

    render() {
        if (this.state.error) {
            return <div>Error: failed to fetch the issue</div>
        } else if (!this.state.isLoaded) {
            return <div>Loading...</div>
        } else {
            return (
                <div>
					<Graph epic={this.state.issueGraph} toggleMenu={this.props.toggleMenu} />
					<EpicStats initialEstimate={this.props.initialEstimate} issueGraph={this.state.issueGraph} />
                    <Legend issueGraph={this.state.issueGraph}
                      selectedEpics={this.state.selectedEpics}
                      handleEpicSelection={(epic) => this.handleEpicSelection(epic)} />
				</div>
            );
        }
    }

    componentDidMount() {
        const issueKey = this.props.issueKey;
        console.log('loading ' + issueKey);
        const uriPrefix = this.props.issueType == "Milestone" ? "/api/milestones/" : "/api/epics/";

        fetch(uriPrefix + issueKey)
            .then(res => {
                if (!res.ok) {
                    throw new Error('not ok');
                }
                return res.json();
            }).then(result => {
                this.setState({
                    isLoaded: true,
                    issueGraph: result,
                    selectedEpics: this.initSelectedEpics(result),
                });
                console.log('loaded ' + issueKey);
            }).catch(() => {
                console.log('failed to load ' + issueKey);
                this.setState({
                    isLoaded: false,
                    error: true,
                });
            });
    }
}

class Menu extends React.Component {
    render() {
        var labelStyle = {
            "background-color": colors[this.props.issueColor]
        };

        return (
            <span className="menu-container">
      <label htmlFor="menu-toggle" className={`menu-toggle-label ${this.props.issueColor}`} style={labelStyle} >&#9776;</label>
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

const epicStatuses = {
    Backlog: 'Backlog',
    OnHold: 'On Hold',
    DevelopmentActive: 'Development Active',
    Resolved: 'Resolved'
}

//TODO: parent prop should include the key and the type; call a different related API if the type is Milestone
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
        }
        const epics = this.state.epics;
        if (epics.length == 0) {
            return <div>none!</div>;
        }

        var statusToEpics = {};

        for (var i = 0; i < epics.length; i++) {
            const epicStatus = epics[i].status;
            if (statusToEpics[epicStatus] === undefined) {
                statusToEpics[epicStatus] = [epics[i]];
                continue
            }
            statusToEpics[epicStatus].push(epics[i]);
        }

        if (Object.keys(statusToEpics).length == 1) {
            return <RelatedEpicsSection epics={epics} />;
        }

        var sections = [];
        var statusOrder = [epicStatuses.DevelopmentActive, epicStatuses.OnHold, epicStatuses.Backlog, epicStatuses.Resolved];
        for (var i = 0; i < statusOrder.length; i++) {
            const epicStatus = statusOrder[i];
            if (statusToEpics[epicStatus]) {
                sections.push(<RelatedEpicsSection epics={statusToEpics[epicStatus]} header={epicStatus} />);
            }
        }
        return <div>{sections}</div>;
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

class RelatedEpicsSection extends React.Component {
    render() {
        var epics = this.props.epics;

        var elements = [];
        if (this.props.header != undefined) {
            elements.push(<span className="subHeader">{this.props.header}</span>);
        }

        for (var i = 0; i < epics.length; i++) {
            const url = '/epics/' + epics[i].key;
            elements.push(
                <a href={url}>
				<img src={epics[i].typeImageURL} />
				{epics[i].key} - {epics[i].summary}
			  </a>
            );
        }
        return <div className="relatedEpicsSection">{elements}</div>;
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

        var allColors = data.issues.map(function(elem) {
            return elem.color;
        })
        var distinctColors = Array.from(new Set(allColors));

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
                                        return 5;
                                    }
                                }
                            }
                            return 2;
                        },
                        'border-color': function(ele) {
                            if (ele.data('flagged')) {
                                return '#e82c35';
                            }
                            if (distinctColors.length <= 1) {
                                return '#000000';
                            }
                            if (ele.data('color') in colors) {
                                return colors[ele.data('color')];
                            }
                            return '#000000';
                        },
                        'shape': function(ele) {
                            const labels = ele.data('labels');
                            if (labels.indexOf('devops') > -1) {
                                return 'octagon';
                            }
                            if (labels.indexOf('platform') > -1) {
                                return 'square';
                            }
                            if (labels.indexOf('ui') > -1) {
                                return 'ellipse';
                            }
                            return 'diamond';

                        }
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
        const issueURL = "https://" + this.props.jiraHost + "/browse/" + this.props.issueKey;
        const issueLabel = this.props.issueKey + " - " + this.props.issueSummary;
        return (
            <div>
				<h1>
                    <a className="home" href="/">&#8962;</a>
					<Menu epicKey={this.props.issueKey}
						issueColor={this.props.issueColor}
						toggleMenu={(show) => this.toggleMenu(show)} showMenu={this.state.showMenu} />
					<a href={issueURL} target="_blank">{issueLabel}</a>
				</h1>
				<GraphApp issueKey={this.props.issueKey}
                    issueType={this.props.issueType}
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
        if (this.props.initialEstimate != 0) {
            rows.push(<tr class="initialEstimate"><td>Initial Estimate</td><td className="points">{this.props.initialEstimate}</td></tr>);
        }

        var totalPoints = 0;
        var statusOrder = [statuses.Backlog, statuses.InProgress, statuses.Closed];
        for (var i = 0; i < statusOrder.length; i++) {
            var status = statusOrder[i];
            if (byStatus[status]) {
                rows.push(<tr><td>{status}</td><td className="points">{byStatus[status]}</td></tr>);
                totalPoints += byStatus[status];
            }
        }

        if (totalPoints > 0) {
            rows.push(<tr className="total"><td>Total</td><td className="points">{totalPoints}</td></tr>);
            var closedPoints = byStatus['Closed'] ? byStatus['Closed'] : 0;
            const closedPercent = Math.round(closedPoints / totalPoints * 100);
            rows.push(<tr className="total"><td colspan="2">{closedPoints}/{totalPoints} Closed ({closedPercent}%)</td></tr>)
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
        var issueGraph = this.props.issueGraph;
        var result = {};
        for (var i = 0; i < issueGraph.issues.length; i++) {
            var status = categorizeStatus(issueGraph.issues[i].status);
            if (status == statuses.ResolvedOnStaging) {
                status = statuses.InProgress;
            }
            if (result[status]) {
                result[status] += issueGraph.issues[i].estimate;
                continue;
            }
            result[status] = issueGraph.issues[i].estimate;
        }
        return result;
    }
}

class Legend extends React.Component {
    render() {
        const issues = this.props.issueGraph.issues;
        const selectedEpics = this.props.selectedEpics;

        //TODO: flatten the epics once in GraphApp to resolve a prop of epic->color code and state for epic->selected
        var epicToColor = {};
        for (var i = 0; i < issues.length; i++) {
            epicToColor[issues[i].epicKey] = issues[i].color;
        }
        if (Object.keys(epicToColor).length <= 1) {
            return null;
        }

        var elements = [];
        for (var epicKey in epicToColor) {
            var highlightStyle = {
                "color": colors[epicToColor[epicKey]]
            };

            elements.push(
                <div>
                  <label>
                    <input type="checkbox"
                      checked={selectedEpics.get(epicKey)} value={epicKey}
                      onChange={(val) => this.props.handleEpicSelection(val)} />
                    <span className="epicHighlight" style={highlightStyle}>&#9679;</span> {epicKey}
                  </label>
                </div>
            );
        }
        return (
            <div className="legend">
          <div className="legendHeader">Legend</div>
          {elements}
        </div>
        );
    }
}

var root = document.getElementById('root');
ReactDOM.render(<App issueKey={root.dataset.issueKey}
        issueType={root.dataset.issueType}
		issueColor={root.dataset.issueColor}
		issueSummary={root.dataset.issueSummary}
		initialEstimate={root.dataset.issueInitialEstimate}
		jiraHost={root.dataset.jiraHost} />, root);

var issue = {
    key: root.dataset.issueKey,
    summary: root.dataset.issueSummary
};
pushRecentIssue(issue);