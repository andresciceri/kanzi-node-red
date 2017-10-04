/**
* Copyright Gallimberti Telemaco 02/02/2017
**/

module.exports = function(RED) {

	var Server = require('socket.io');
	var io;
	var allowedOrigins = "http://localhost:* http://127.0.0.1:*";
	var customProperties = {}; 
	
	function socketIoApesConfig(n) {
		RED.nodes.createNode(this,n);
		// node-specific code goes here
		var node = this;
		
		this.port = n.port || 80;
		this.sendClient = n.sendClient;
		this.path = n.path || "/socket.io";
		this.bindToNode = n.bindToNode || false;
		if(this.bindToNode){
			io = new Server(RED.server);
			io.on('connection', function(socket){});
			io.origins(allowedOrigins);
		} else {
			io = new Server();
			io.serveClient(node.sendClient);
			io.path(node.path);
			io.listen(node.port);
			io.origins(allowedOrigins);
		}

		var bindOn =  this.bindToNode ? "bind to Node-red port" : ("on port " + this.port);
		
		node.on('close', function() {
			//node.log("Closing server");
			io.close();
			//node.log("Closed server");
		});
		
	}
	
	function socketIoApesOut(n) {
		RED.nodes.createNode(this,n);
		// node-specific code goes here
		var node = this;
		this.name = n.name;
		this.server = RED.nodes.getNode(n.server);
		
		node.on('input', function(msg) {
				if(RED.util.getMessageProperty(msg,"socketIOEmit") == "emit"){
					io.emit(msg.socketIOEvent , msg.payload);
				}
		});
		
	}
	
	

	RED.nodes.registerType("socketio-apes-config",socketIoApesConfig);
	RED.nodes.registerType("socketio-apes-out",socketIoApesOut);
}