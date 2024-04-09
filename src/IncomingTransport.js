import { headers, sizeLimit as defaultSizeLimit } from "./common";
import { IncomingTransfer } from "./IncomingTransfer";


export class IncomingTransport {
	constructor(ws, options = {}) {
		ws.incomingTransport = this;
		
		const {
			sizeLimit = defaultSizeLimit
		} = options;
		
		this.sizeLimit = sizeLimit;
		
		ws.listenerHandlers.add(this.listenerHandler);
		
		if (ws.isWebSocketServer) {
			this.listenerHandlerRegExp = /^client-transfer:(.*)$/;
			
			ws.on(`client-message:${headers.request}`, (...args) => IncomingTransport.handleRequest.call(...args));
			ws.on(`client-message:${headers.chunk}`, (...args) => IncomingTransport.handleChunk.call(...args));
			ws.on(`client-message:${headers.sent}`, (...args) => IncomingTransport.handleSent.call(...args));
			ws.on(`client-message:${headers.abort}`, (...args) => IncomingTransport.handleAbort.call(...args));
		} else {
			this.listenerHandlerRegExp = /^transfer:(.*)$/;
			
			ws.on(`message:${headers.request}`, IncomingTransport.handleRequest);
			ws.on(`message:${headers.chunk}`, IncomingTransport.handleChunk);
			ws.on(`message:${headers.sent}`, IncomingTransport.handleSent);
			ws.on(`message:${headers.abort}`, IncomingTransport.handleAbort);
		}
		
	}
	
	listeners = new Map();
	
	listenerHandler = (add, eventName, listener) => {
		const kind = eventName.match(this.listenerHandlerRegExp)?.[1];
		if (kind) {
			if (add)
				this.listeners.get(kind)?.add(listener) ??
					this.listeners.set(kind, new Set([ listener ]));
			else
				if (listener)
					this.listeners.get(kind)?.delete(listener);
				else
					this.listeners.delete(kind);
			
			return true;
		}
		
	};
	
	transfers = new Map();
	
	
	static IncomingTransfer = IncomingTransfer;
	
	static handleRequest(kind, id, { type, size, metadata, ...restProps }) {
		
		const { incomingTransport } = this.wss ?? this;
		const IncomingTransportTransfer = incomingTransport.constructor.IncomingTransfer;
		
		if (!incomingTransport.listeners.has(kind))
			this.sendMessage(headers.error, id, `Unknown kind of file "${kind}"`);
		else if (incomingTransport.transfers.has(id))
			this.sendMessage(headers.error, id, "Transfer already exists");
		else if (!IncomingTransportTransfer.methods[type])
			this.sendMessage(headers.error, id, "Unknown type of transfer");
		else if (size > this.sizeLimit)
			this.sendMessage(headers.error, id, `Transfer size (${size} bytes) exeeds limit of ${this.sizeLimit} bytes`);
		else
			new IncomingTransportTransfer(this, kind, id, { type, size, metadata, ...restProps });
		
	}
	
	static handleChunk(id, ...restArgs) {
		(this.wss ?? this).incomingTransport.transfers.get(id)?.handleChunk(...restArgs);
		
	}
	
	static handleSent(id) {
		(this.wss ?? this).incomingTransport.transfers.get(id)?.handleSent();
		
	}
	
	static handleAbort(id) {
		(this.wss ?? this).incomingTransport.transfers.get(id)?.abort(true);
		
	}
	
}
