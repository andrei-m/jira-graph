const localStorageKey = 'recent-epics';
const maxIssueCount = 10;

const hasLocalStorage = () => {
    return typeof(Storage) !== "undefined"
};

const getRecentIssues = () => {
    if (!hasLocalStorage) {
        return
    }
    const rawRecentIssues = localStorage.getItem(localStorageKey);
    if (rawRecentIssues) {
        var parsed = [];
        try {
            parsed = JSON.parse(rawRecentIssues);
        } catch (e) {
            console.log('failed to parse recent-epics from local storage: ' + err);
        }
        if (parsed && parsed.constructor === Array) {
            return parsed;
        }
    } else {
        console.log(`no ${localStorageKey} in local storage`);
    }
    return [];
};

const pushRecentIssue = (issue) => {
    if (!hasLocalStorage) {
        return
    }
    var issues = getRecentIssues();
    for (var i = 0; i < issues.length; i++) {
        if (issues[i].key === issue.key) {
            issues.splice(i, 1);
        }
    }
    issues.unshift(issue);
    if (issues.length > maxIssueCount) {
        issues.pop();
    }
    localStorage.setItem(localStorageKey, JSON.stringify(issues));
};

export {
    getRecentIssues,
    pushRecentIssue
};