import React from 'react';
import { Link } from 'react-router-dom';
import { getRecentIssues } from './recent';
import './issueList.css';

class IssueList extends React.Component {
    state = {
        issues: [],
    };

    render() {
        if (this.state.issues.length === 0) {
            return <div>no recent issues </div>;
        }
        const issues = this.state.issues.map((e) => <Issue key={e.key} issueKey={e.key} summary={e.summary} />);
        return (
            <div className='issueList'>
                <h1>jiragraph</h1>
                <h3>Recently viewed issues</h3>
                <ul>{issues}</ul>
            </div>
        );
    }

    componentDidMount() {
        const recentIssues = getRecentIssues();
        if (recentIssues) {
            this.setState({
                issues: recentIssues,
            });
        }
    }
}

class Issue extends React.Component {
    render() {
        const path = '/issues/' + this.props.issueKey;
        return (
            <li>
                <Link to={path} key={this.props.issueKey}>
                    {this.props.issueKey} - {this.props.summary}
                </Link>
            </li>
        );
    }
}

export { IssueList };
