const getRecentEpics = () => {
    if (typeof(Storage) === "undefined") {
        return
    }
    const rawRecentEpics = localStorage.getItem('recent-epics');
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
        console.log('no recent-epics in local storage');
    }
    return [];
};

export {
    getRecentEpics
};