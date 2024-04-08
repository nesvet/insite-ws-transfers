import { headers } from "./common";
import { OutgoingTransfer } from "./OutgoingTransfer";


export class OutgoingTransport {
	constructor(ws) {
		ws.outgoingTransport = this;
		
		if (ws.isWebSocketServer) {
			ws.options.WebSocket.prototype.transfer = OutgoingTransport.transfer;
			
			ws.on(`client-message:${headers.confirm}`, (...args) => OutgoingTransport.handleConfirm.call(...args));
			ws.on(`client-message:${headers.progress}`, (...args) => OutgoingTransport.handleProgress.call(...args));
			ws.on(`client-message:${headers.completed}`, (...args) => OutgoingTransport.handleCompleted.call(...args));
			ws.on(`client-message:${headers.error}`, (...args) => OutgoingTransport.handleError.call(...args));
		} else {
			ws.transfer = OutgoingTransport.transfer;
			
			ws.on(`message:${headers.confirm}`, OutgoingTransport.handleConfirm);
			ws.on(`message:${headers.progress}`, OutgoingTransport.handleProgress);
			ws.on(`message:${headers.completed}`, OutgoingTransport.handleCompleted);
			ws.on(`message:${headers.error}`, OutgoingTransport.handleError);
		}
		
	}
	
	transfers = new Map();
	
	
	static OutgoingTransfer = OutgoingTransfer;
	
	static async transfer(...args) {
		
		const OutgoingTransportTransfer = (this.wss ?? this).outgoingTransport.constructor.OutgoingTransfer;
		
		return new OutgoingTransportTransfer(this, ...args);
	}
	
	static handleConfirm(id, ...restArgs) {
		(this.wss ?? this).outgoingTransport.transfers.get(id)?.handleConfirm(...restArgs);
		
	}
	
	static handleProgress(id, ...restArgs) {
		(this.wss ?? this).outgoingTransport.transfers.get(id)?.handleProgress(...restArgs);
		
	}
	
	static handleCompleted(id, ...restArgs) {
		(this.wss ?? this).outgoingTransport.transfers.get(id)?.handleCompleted(...restArgs);
		
	}
	
	static handleError(id, errorMessage) {
		(this.wss ?? this).outgoingTransport.transfers.get(id)?.throw(errorMessage);
		
	}
	
}
