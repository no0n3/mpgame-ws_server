var exports = {
    getParameterByName : function (name, query) {
        var start = '/?';

        if (start === query.substring(0, start.length)) {
            query = query.substring(start.length);
        }

        var params = exports.getParametersAsObject(query);

        return params[name] ? params[name] : null;
    },
    getParametersAsObject : function (query) {
        var match,
                pl = /\+/g,
                search = /([^&=]+)=?([^&]*)/g,
                decode = function (s) {
                    return decodeURIComponent(s.replace(pl, " "));
                };

        var urlParams = {};

        while (match = search.exec(query)) {
            urlParams[decode(match[1])] = decode(match[2]);
        }

        return urlParams;
    }

};

module.exports = exports;
