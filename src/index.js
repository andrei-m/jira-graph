import React from 'react';
import ReactDOM from 'react-dom';
import {
    getRecentEpics
} from './recent';

class EpicList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            epics: [],
        };
    }

    render() {
        if (this.state.epics.length == 0) {
            return <div>no recent epics </div>;
        }
        var epics = [];
        for (var i = 0; i < this.state.epics.length; i++) {
            const e = this.state.epics[i];
            epics.push(<Epic epicKey={e.key} summary={e.summary} />);
        }
        return (
            <div>
            <h3>Recently viewed epics</h3>
            <ul>{epics}</ul>
          </div>
        );
    }

    componentDidMount() {
        const recentEpics = getRecentEpics();
        if (recentEpics) {
            this.setState({
                epics: recentEpics
            });
        }
    }
}

class Epic extends React.Component {
    render() {
        const path = '/epics/' + this.props.epicKey;
        return (
            <li>
        <a href={path}>{this.props.epicKey} - {this.props.summary}</a>
      </li>
        );
    }
}

ReactDOM.render(<EpicList />, document.getElementById('root'));