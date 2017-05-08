function ClientHandle(data) {
    data = data || {};

    var oponentId = [];

    var connections = [];

    this.addConnection = function(connection) {
        var alreadyAdded = false;

        for (var i in connections) {
            if (connection === connections[i]) {
                alreadyAdded = true;
                break;
            }
        }

        if (false === alreadyAdded) {
            connections.push(connection);
        }
    };

    this.send = function (msg) {
        for (var i in connections) {
            connections[i].sendUTF(msg);
        }
    };

    this.isStarted = function () {
        return true === data.started;
    };

    this.start = function () {
        data.started = true;
    };

    this.setOponentId = function (id) {
        oponentId = id;
    };

    this.getOponentId = function () {
        return oponentId;
    };

    this.addConnection(data.connection);
}

exports.ClientHandle = ClientHandle;
