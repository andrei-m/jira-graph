import React from 'react';
import {
    getRecentIssues
} from './recent';

class IssueList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            issues: [],
        };
    }

    render() {
        if (this.state.issues.length == 0) {
            return <div>no recent issues </div>;
        }
        var issues = [];
        for (var i = 0; i < this.state.issues.length; i++) {
            const e = this.state.issues[i];
            issues.push(<Issue issueKey={e.key} summary={e.summary} />);
        }
        return (
            <div>
            <h3>Recently viewed issues</h3>
            <ul>{issues}</ul>
          </div>
        );
    }

    componentDidMount() {
        const recentIssues = getRecentIssues();
        if (recentIssues) {
            this.setState({
                issues: recentIssues
            });
        }
    }
}

class Issue extends React.Component {
    render() {
        const path = '/issues/' + this.props.issueKey;
        return (
            <li>
        <a href={path}>{this.props.issueKey} - {this.props.summary}</a>
      </li>
        );
    }
}

export {
    IssueList
};