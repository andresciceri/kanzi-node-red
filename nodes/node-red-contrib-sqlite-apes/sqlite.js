
module.exports = function(RED) {
    "use strict";
    var reconnect = RED.settings.sqliteReconnectTime || 20000;
    var sqlite3 = require('sqlite3');

    function SqliteNodeDB(n) {
        RED.nodes.createNode(this,n);

        this.dbname = n.db;
        var node = this;

        node.doConnect = function() {
            node.db = new sqlite3.Database(node.dbname);
            node.db.on('open', function() {
                if (node.tick) { clearTimeout(node.tick); }
                node.log("opened "+node.dbname+" ok");
            });
            node.db.on('error', function(err) {
                node.error("failed to open "+node.dbname, err);
                node.tick = setTimeout(function() { node.doConnect(); }, reconnect);
            });
        }

        node.on('close', function () {
            if (node.tick) { clearTimeout(node.tick); }
            if (node.db) { node.db.close(); }
        });
    }
    RED.nodes.registerType("sqlitedbapes",SqliteNodeDB);


    function SqliteNodeIn(n) {
        RED.nodes.createNode(this,n);
        this.mydb = n.mydb;
        this.mydbConfig = RED.nodes.getNode(this.mydb);

        if (this.mydbConfig) {
            this.mydbConfig.doConnect();
            var node = this;
            node.on("input", function(msg) {
                if (typeof msg.topic === 'string') {
                    //console.log("query:",msg.topic);
                    var bind = Array.isArray(msg.payload) ? msg.payload : [];
                    msg.error = false;
                    node.mydbConfig.db.all(msg.topic, bind, function(err, row) {
                            if (err) { 
                                node.error(err,msg); 
                                msg.error = true;
                                node.send(msg);
                            }
                            else {
                                if(row.length > 0){
                                    msg.payload = row;    
                                }
                                msg.error = false;
                                node.send(msg);
                            }
                        });    
                    
                    
                }else if(Array.isArray(msg.topic)){
                    //console.log(msg.topic);
                    for (var i = 0; i < msg.topic.length; i++) {
                        
                        node.mydbConfig.db.all(msg.topic[i], bind, function(err, row) {
                            if (err) { 
                                node.error(err,msg); 
                                msg.error = true;
                            }
                            else {
                                if(row.length > 0){
                                    msg.payload = row;    
                                }
                                msg.error = false;
                                
                            }
                        });
                        if(i == (msg.topic.length -1)){
                            node.send(msg);
                        }
                    }
                }
                else {
                    if (typeof msg.topic !== 'string') {
                        node.error("msg.topic : the query is not defined as a string",msg);
                    }
                }
            });
        }
        else {
            this.error("Sqlite database not configured");
        }
    }
    RED.nodes.registerType("sqliteapes",SqliteNodeIn);
}
