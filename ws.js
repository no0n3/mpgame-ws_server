var ch = require('./src/client-handle');
var config = require('./config/config');
var requestCommons = require('./src/common/request');
var mysql = require('mysql');

function getMySQLConnection() {
    var connection = mysql.createConnection(config.db);

    return connection;
}

function getUserIdByToken(token, callack) {
    var connection = getMySQLConnection();
    connection.connect();
    console.log('TOOOKEN => ', token)
    connection.query("SELECT id FROM users WHERE token = '" + token + "'", function (error, results, fields) {
        if (error) {
            console.log('--------------------------1X')
            console.log(error)
            throw error;
        } else {
            console.log('--------------------------2X')
        }

        var id = null;

        if (results && 0 < results.length) {
            id = results[0].id;
        }

        if ('function' === typeof callack) {
            callack(id);
        }
    });

    connection.end();
}

var WebSocketServer = require('websocket').server;
var http = require('http');
var url = require('url');

var gamesData = {};

var connectionPool = (function () {
    var connections = {};

    return {
        add: function (key, connection) {

        }
    };
})();

var connections = {};

var waitingPlayers = [];

var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function () {
    console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    return true;
}

wsServer.on('request', function (request) {
    if (!originIsAllowed(request.origin)) {
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    var token = requestCommons.getParameterByName('token', request.resource);

    console.log('URL -> ', request.resource)
    console.log('TOKEN -->', '|' + requestCommons.getParameterByName('token', request.resource) + '|')

    getUserIdByToken(token, function(playerId) {
        if (null === playerId) {
            request.reject();
        } else {
            wsLogic(playerId);
        }
    });

    function wsLogic(playerId) {
        console.log('IN WS LOGIC', playerId)
    var init = false;

    function send(msg) {
        connection.sendUTF(msg);
    }

    var connection = request.accept('echo-protocol', request.origin);

    console.log((new Date()) + ' Connection accepted.');

    connection.on('message', function (message) {
        console.log('MSG START ----------------------------------------')
        var msg = null;

        if (message.type === 'utf8') {
            msg = message.utf8Data;
        } else if (message.type === 'binary') {
            msg = message.binaryData;
        }

        var d = JSON.parse(msg);
        console.log('resp:')
        console.log('_ini', init, d)

        var oponentId = null;

        if (false === init && playerId/*d.player*/) {
            if (!connections[playerId/*d.player*/]) {
                connections[playerId/*d.player*/] = new ch.ClientHandle({
                    connection: connection,
                    started: false
                });
            }

            init = true;
        }

        console.log('m type', d.type)
        console.log('xxx', false === init, playerId/*d.player*/);
        console.log(connections[playerId/*d.player*/])

        if (connections[playerId/*d.player*/] && false === connections[playerId].isStarted()) {
            if (playerId/*d.player*/) {
//                playerId = d.player;
                // connections[d.player] = new ch.ClientHandle({
                //     connection: connection
                // });

                for (var i in waitingPlayers) {
                    if (playerId/*d.player*/ != waitingPlayers[i]) {
                        oponentId = waitingPlayers[i];
                        break;
                    }
                }
                console.log('Opp id', oponentId)
                if (!oponentId) {
                    waitingPlayers.push(playerId/*d.player*/);
                } else {
                    var c1 = connections[playerId/*d.player*/];
                    var c2 = connections[oponentId];

                    if (c1 && c2) {
                        c1.start();
                        c1.setOponentId(oponentId);
                        c1.setPlayerN(1);
                        c2.start();
                        c2.setOponentId(playerId/*d.player*/);
                        c2.setPlayerN(2);

                        c1.send(JSON.stringify({
                            type: 'start',
                            oponentId: oponentId,
                            playerN: 1
                        }));
                        c2.send(JSON.stringify({
                            type: 'start',
                            oponentId: playerId/*d.player*/,
                            playerN: 2
                        }));

                        init = true;
                    }
                }
            }
        } else {
            console.log('_________________2')
            console.log(d)
            console.log(typeof d)

            console.log('opp 1', oponentId)
            console.log('opp 2', connections[playerId].getOponentId())

            var c1 = connections[playerId];
            var c2 = connections[connections[playerId].getOponentId()];

            if (!c1 || !c2) {
                return;
            }

            if ('move' === d.type) {
                if (c1 && c2) {
                    c1.send(JSON.stringify({
                        type: 'move',
                        pos: d.moveTo,
                        playerN: c1.getPlayerN()
                    }));
                    c2.send(JSON.stringify({
                        type: 'move',
                        pos: d.moveTo,
                        playerN: c1.getPlayerN()
                    }));
                }
            } else if ('set_trap' === d.type) {
                c1.send(JSON.stringify({
                    type: 'set_trap',
                    pos: d.pos,
                    playerN: c1.getPlayerN()
                }));
                c2.send(JSON.stringify({
                    type: 'set_trap',
                    pos: d.pos,
                    playerN: c1.getPlayerN()
                }));
            } else if ('set_enemy_turn' === d.type) {
                c2.send(JSON.stringify({
                    type: 'set_own_turn'
                }));
            } else if ('lose_game' === d.type) {
                c1.send(JSON.stringify({
                    type: 'game_end',
                    status: 'lose'
                }));
                c2.send(JSON.stringify({
                    type: 'game_end',
                    status: 'win'
                }));
            } else if ('win_game' === d.type) {
                c1.send(JSON.stringify({
                    type: 'game_end',
                    status: 'win'
                }));
                c2.send(JSON.stringify({
                    type: 'game_end',
                    status: 'lose'
                }));
            }
        }
        console.log('MSG END ----------------------------------------')
    });
    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
    }
});
