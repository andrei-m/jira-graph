const localStorageKey = 'recent-epics';

const hasLocalStorage = () => {
    return typeof(Storage) !== "undefined"
};

const getRecentEpics = () => {
    if (!hasLocalStorage) {
        return
    }
    const rawRecentEpics = localStorage.getItem(localStorageKey);
    if (rawRecentEpics) {
        var parsed = [];
        try {
            parsed = JSON.parse(rawRecentEpics);
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

const pushRecentEpic = (epic) => {
    if (!hasLocalStorage) {
        return
    }
    var epics = getRecentEpics();
    for (var i = 0; i < epics.length; i++) {
        if (epics[i].key === epic.key) {
            epics.splice(i, 1);
        }
    }
    epics.unshift(epic);
    if (epics.length > 10) {
        epics.pop();
    }
    localStorage.setItem(localStorageKey, JSON.stringify(epics));
};

export {
    getRecentEpics,
    pushRecentEpic
};