import cytoscape from 'cytoscape';
import React from 'react';
import {
    useParams
} from 'react-router-dom';
import {
    pushRecentIssue
} from './recent';
import {
    colors
} from './colors';
import './graph.css';

//TODO: these statuses are all implementation-specific and should be made customizable.
const statuses = {
    Backlog: 'Backlog',
    ReadyForDev: 'Ready for Dev',
    InProgress: 'In Progress',
    OnFeatureBranch: 'In QA on feature branch',
    InCodeReview: 'In Code Review',
    ResolvedOnStaging: 'Resolved, on staging',
    Closed: 'Closed',
};

const epicAndMilestoneStatuses = {
    DevelopmentActive: 'Development Active',
    OnHold: 'On Hold',
    Backlog: 'Backlog',
    Resolved: 'Resolved',
};

function categorizeStatus(s) {
    if (s === statuses.Backlog || s === statuses.ReadyForDev) {
        return statuses.Backlog;
    }
    if (s === statuses.InProgress || s === statuses.OnFeatureBranch || s === statuses.InCodeReview) {
        return statuses.InProgress;
    }
    return s;
}

function statusToRGB(s) {
    const categorized = categorizeStatus(s);
    if (categorized === statuses.Backlog) {
        return '#ffffff';
    }
    if (categorized === statuses.InProgress) {
        return '#35e82c';
    }
    if (categorized === statuses.ResolvedOnStaging) {
        return '#2C35E8';
    }
    if (categorized === statuses.Closed) {
        return '#959595';
    }
    return '#000000';
}

class Popup extends React.Component {
    render() {
        if (this.props.selectedEpic == null) {
            return <div className="empty"></div>;
        }

        //TODO: a hack until offsetHeight can be figured out
        const yOffset = 45;

        const style = {
            left: this.props.selectedEpic.popupPosition.x + 'px',
            top: (this.props.selectedEpic.popupPosition.y + yOffset) + 'px',
        };

        const epic = this.props.selectedEpic.epic;

        let className = 'popup';
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
        );
    }
}

class PopupSprint extends React.Component {
    render() {
        const sprints = this.props.sprints;
        if (sprints.length === 0) {
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
        );
    }
}

class PopupAssignee extends React.Component {
    render() {
        if (this.props.assignee === '') {
            return <span className="popup-avatar" />;
        }

        const alt = 'Assignee: ' + this.props.assignee;
        return (
            <span className="popup-avatar">
                <img src={this.props.assigneeImageURL} alt={alt} title={alt} />
            </span>
        );
    }
}

class PopupKey extends React.Component {
    render() {
        const url = '/api/issues/' + this.props.epicKey + '/details';

        return (
            <span className="popup-key">
                <a href={url} target="_blank" rel='noreferrer'>{this.props.epicKey}</a>
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
        };
        return <div className="popup-status" style={style} />;
    }
}

class PopupLabels extends React.Component {
    render() {
        const labelListItems = this.props.labels.map(label => <li key={label}>{label}</li>);
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
        return new Map(issueGraph.issues.map(({ epicKey }) => [epicKey, true]));
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
            return <div>Error: failed to fetch the issue</div>;
        } else if (!this.state.isLoaded) {
            return <div>Loading...</div>;
        } else {
            return (
                <div>
					<Graph issueGraph={this.state.issueGraph} selectedEpics={new Map(this.state.selectedEpics)} toggleMenu={this.props.toggleMenu} />
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
        const uriPrefix = this.props.issueType === "Milestone" ? "/api/milestones/" : "/api/epics/";

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
            }).catch((err) => {
                console.log('failed to load ' + issueKey + ' error: ' + err);
                this.setState({
                    isLoaded: false,
                    error: true,
                });
            });
    }
}

class Menu extends React.Component {
    render() {
        const labelStyle = {
            "backgroundColor": colors[this.props.issueColor]
        };

        return (
            <span className="menu-container">
                <label htmlFor="menu-toggle" className={`menu-toggle-label ${this.props.issueColor}`} style={labelStyle} >&#9776;</label>
                <input type="checkbox" id="menu-toggle" checked={this.props.showMenu} onChange={() => this.props.toggleMenu()} />
                <div className="menu">
                    Related issues
                    <hr />
                    <RelatedIssues issueKey={this.props.issueKey} />
                </div>
            </span>
        );
    }
}

class RelatedIssues extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            isLoaded: false,
            issues: [],
        };
    }

    render() {
        if (this.state.error) {
            return <div>Error: failed to fetch related issues</div>;
        } else if (!this.state.isLoaded) {
            return <div>Loading...</div>;
        }
        const issues = this.state.issues;
        if (issues.length === 0) {
            return <div>none!</div>;
        }

        const statusToEpics = issues.reduce((acc, issue) => ({
            ...acc,
            [issue.status]: (acc[issue.status] ?? []).concat(issue),
        }), {});

        if (Object.keys(statusToEpics).length === 1) {
            return <RelatedIssuesSection issues={issues} />;
        }

        const sections = [];
        for (const issueStatus in epicAndMilestoneStatuses) {
            const statusString = epicAndMilestoneStatuses[issueStatus];
            if (statusToEpics[statusString]) {
                sections.push(<RelatedIssuesSection issues={statusToEpics[statusString]} header={statusString} />);
            }
        }
        return <div>{sections}</div>;
    }

    componentDidMount() {
        const issueKey = this.props.issueKey;

        console.log('loading related issues for ' + issueKey);
        fetch("/api/issues/" + issueKey + "/related")
            .then(res => {
                if (!res.ok) {
                    throw new Error('not ok');
                }
                return res.json();
            })
            .then(result => {
                this.setState({
                    isLoaded: true,
                    issues: result,
                });
                console.log('loaded related issues for ' + issueKey);
            }).catch(
                () => {
                    console.log('failed to load related issues for ' + issueKey);
                    this.setState({
                        isLoaded: false,
                        error: true,
                        issues: [],
                    });
                });
    }
}

class RelatedIssuesSection extends React.Component {
    render() {
        const issues = this.props.issues;

        const header = this.props.header === undefined
            ? undefined
            : (<span className="subHeader">{this.props.header}</span>);

        const issueLinks = issues.map(iss => (
            <a key={iss.key} href={`/issues/${iss.key}`}>
                <img src={iss.typeImageURL} />
                {iss.key} - {iss.summary}
            </a>
        ));
        return (
            <div className="relatedIssuesSection">
                {header}
                {issueLinks}
            </div>
        );
    }
}

class Graph extends React.Component {
    myRef = React.createRef();
    state = {
        selectedEpic: null,
        cy: null,
    };

    render() {
        return (
            <div>
                <div className="cy" ref={this.myRef} />
                <Popup selectedEpic={this.state.selectedEpic} />
            </div>
        );
    }

    componentDidMount() {
        this.initCy(this.myRef.current);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.cy === null || this.shouldUpdateGraph(prevProps.selectedEpics, this.props.selectedEpics)) {
            this.renderGraph(this.props.issueGraph, this.props.selectedEpics);
        }
    }

    shouldUpdateGraph(prevSelectedEpics, selectedEpics) {
        for (let key of selectedEpics.keys()) {
            if (prevSelectedEpics.get(key) !== selectedEpics.get(key)) {
                return true;
            }
        }
        return false;
    }

    initCy(root) {
        const multipleEpics = this.props.selectedEpics.size > 1;
        const cy = cytoscape({
            container: root,
            boxSelectionEnabled: false,
            autounselectify: true,
            layout: {
                name: 'breadthfirst',
                directed: true,
                padding: 100
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
                            return statusToRGB(ele.data('status'));
                        },
                        'border-width': function(ele) {
                            const sprints = ele.data('sprints');
                            if (sprints) {
                                for (let i = 0; i < sprints.length; i++) {
                                    if (sprints[i].state === 'ACTIVE' || sprints[i].state === 'CLOSED') {
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
                            if (!multipleEpics) {
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
                            if (labels.indexOf('platform') > -1 || labels.indexOf('gillnet') > -1) {
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

        cy.on('mouseover', 'node', function() {
            document.body.style.cursor = 'pointer';
        });

        cy.on('mouseout', 'node', function() {
            document.body.style.cursor = 'default';
        });

        this.setState({
            cy: cy
        });
    }

    renderGraph(issueGraph, selectedEpics) {
        const filteredIssues = issueGraph.issues.filter(issue => selectedEpics.get(issue.epicKey));

        const issueKeys = new Map(filteredIssues.map(({ key }) => [key, true]));

        const issuesToGraph = filteredIssues.map(issue => ({
            data: Object.assign({
                id: issue.key
            }, issue)
        }));

        const issueEdges = issuesToGraph.flatMap(iss => {
            const blockingIssue = iss.data.id;
            return issueGraph.graph[blockingIssue].flatMap(blockedIssue => {
                if (!issueKeys.has(blockedIssue)) {
                    console.log('skipping edge for unselected epic issue ' + blockedIssue);
                    return [];
                }
                return [{
                    data: {
                        id: `${blockingIssue}_blocks_${blockedIssue}`,
                        source: blockingIssue,
                        target: blockedIssue,
                    }
                }];
            });
        });

        this.state.cy.json({
            elements: {
                nodes: issuesToGraph,
                edges: issueEdges
            }
        });
        this.state.cy.layout({
            name: 'breadthfirst',
            directed: true,
            padding: 100,
        }).run();
    }
}

function RoutedIssueGraph() {
    let params = useParams();
    return <IssueGraph issueKey={params.issueKey} />;
}

class IssueGraph extends React.Component {
    state = {
        showMenu: false,
        error: null,
        issue: null,
        jiraHost: null,
        isLoaded: false,
    };

    render() {
        if (this.state.error) {
            return <div>Error: failed to fetch the issue</div>;
        } else if (!this.state.isLoaded) {
            return <div>Loading...</div>;
        }
        const issue = this.state.issue;
        const issueURL = "https://" + this.state.jiraHost + "/browse/" + issue.key;
        const issueLabel = issue.key + " - " + issue.summary;
        return (
            <div>
				<h1>
                    <a className="home" href="/">&#8962;</a>
					<Menu issueKey={issue.key}
						issueColor={issue.color}
						toggleMenu={(show) => this.toggleMenu(show)} showMenu={this.state.showMenu} />
					<a href={issueURL} target="_blank" rel='noreferrer'>{issueLabel}</a>
                    <PopupAssignee assignee={issue.assignee} assigneeImageURL={this.props.issueAssigneeImageURL} />
				</h1>
				<GraphApp issueKey={issue.key}
                    issueType={issue.type}
					initialEstimate={issue.initialEstimate}
					toggleMenu={(show) => this.toggleMenu(show)} />
			</div>
        );
    }

    toggleMenu(show) {
        this.setState(prevState => ({
            ...prevState,
            ...{
                showMenu: show === undefined ? !prevState.showMenu : show,
            }
        }));
    }

    componentDidMount() {
        const issueKey = this.props.issueKey;

        console.log('loading related issues for ' + issueKey);
        fetch("/api/issues/" + issueKey)
            .then(res => {
                if (!res.ok) {
                    throw new Error('not ok');
                }
                return res.json();
            })
            .then(result => {
                this.setState(prevState => ({
                    ...prevState,
                    ...{
                        isLoaded: true,
                        error: false,
                        issue: result.issue,
                        jiraHost: result.jiraHost,
                    }
                }));
                const issue = {
                    key: this.props.issueKey,
                    summary: result.issue.summary
                };
                pushRecentIssue(issue);
                console.log('loaded issue ' + issueKey);
            }).catch(
                (err) => {
                    console.log('failed to load issue ' + issueKey + ' error: ' + err);
                    this.setState(prevState => ({
                        ...prevState,
                        ...{
                            isLoaded: false,
                            error: true,
                            issue: null,
                            jiraHost: null,
                        }
                    }));
                });
    }
}

class EpicStats extends React.Component {
    render() {
        const byStatus = this.getBreakdownByStatus();
        const initialEstimateRow = this.props.initialEstimate !== 0 ? (
            <tr className="initialEstimate">
                <td>Initial Estimate</td>
                <td className="points">{this.props.initialEstimate}</td>
            </tr>
        ) : undefined;

        const statusRows = [statuses.Backlog, statuses.InProgress, statuses.Closed].flatMap(status => {
            return byStatus[status] !== undefined ? [(
                <tr key={status}>
                    <td>{status}</td>
                    <td className="points">{byStatus[status]}</td>
                </tr>
            )] : [];
        });

        const totalPoints = Object.values(byStatus).reduce((sum, statusPoints) => sum + statusPoints, 0);
        const totalPointsRow = totalPoints > 0 ? (
            <tr className="total"><td>Total</td><td className="points">{totalPoints}</td></tr>
        ) : undefined;
        const closedPoints = byStatus[statuses.Closed] ?? 0;
        const closedPointsRow = totalPoints > 0 ? (
            <tr className="total">
                <td colSpan="2">
                    {closedPoints}/{totalPoints} Closed ({Math.round(closedPoints / totalPoints * 100)}%)
                </td>
            </tr>
        ) : undefined;

        return (
            <div className="epicStats">
                <table>
                    <thead>
                        <tr><th colSpan="2">Point Breakdown</th></tr>
                    </thead>
                    <tbody>
                        {initialEstimateRow}
                        {statusRows}
                        {totalPointsRow}
                        {closedPointsRow}
                    </tbody>
                </table>
			</div>
        );
    }

    getBreakdownByStatus() {
        const issueGraph = this.props.issueGraph;
        return issueGraph.issues.reduce((result, iss) => {
            let status = categorizeStatus(iss.status);
            if (status === statuses.ResolvedOnStaging) {
                status = statuses.InProgress;
            }

            return {
                ...result,
                [status]: (result[status] ?? 0) + iss.estimate,
            };
        }, {});
    }
}

class Legend extends React.Component {
    render() {
        const issues = this.props.issueGraph.issues;
        const selectedEpics = this.props.selectedEpics;

        //TODO: flatten the epics once in GraphApp to resolve a prop of epic->color code and state for epic->selected
        const epicKeyToInfo = issues.reduce((map, iss) => ({
            ...map,
            [iss.epicKey]: {
                color: iss.color,
                epicName: iss.epicName,
            },
        }), {});

        if (Object.keys(epicKeyToInfo).length <= 1) {
            return null;
        }

        const elements = Object.entries(epicKeyToInfo).map(([epicKey, epicInfo]) => {
            const highlightStyle = {
                "color": colors[epicInfo.color]
            };
            return (
                <div key={epicKey}>
                    <label>
                        <input type="checkbox"
                               checked={selectedEpics.get(epicKey)} value={epicKey}
                               onChange={this.props.handleEpicSelection} />
                        <span className="epicHighlight" style={highlightStyle}>&#9679;</span>
                        <span className="legendTooltip">
                            {epicKey}
                            <span className="legendTooltipText">{epicInfo.epicName}</span>
                        </span>
                    </label>
                </div>
            );
        });
        return (
            <div className="legend">
                <div className="legendHeader">Legend</div>
                {elements}
            </div>
        );
    }
}

export {
    RoutedIssueGraph
};