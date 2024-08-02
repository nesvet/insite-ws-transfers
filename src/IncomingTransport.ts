import type { InSiteWebSocket } from "insite-ws/client";
import type { InSiteWebSocketServer, InSiteWebSocketServerClient } from "insite-ws/server";
import type { StringKey } from "@nesvet/n";
import {
	sizeLimit as defaultSizeLimit,
	headers,
	listenersSymbol,
	transfersSymbol
} from "./common";
import { IncomingTransfer } from "./IncomingTransfer";
import type {
	IncomingChunk,
	IncomingTransferListener,
	IncomingTransferProps,
	IncomingTransportOptions,
	ParametersWithoutFirst
} from "./types";


export class IncomingTransport<PT extends typeof IncomingTransport, FT extends typeof IncomingTransfer> {
	constructor(ws: InSiteWebSocket | InSiteWebSocketServer, options: IncomingTransportOptions = {}) {
		
		const {
			sizeLimit = defaultSizeLimit
		} = options;
		
		this.sizeLimit = sizeLimit;
		
		if (ws.isWebSocketServer) {
			ws.on(`client-message:${headers.request}`, (wssc: InSiteWebSocketServerClient, ...args: ParametersWithoutFirst<typeof this.handleRequest>) => this.handleRequest(wssc, ...args));
			ws.on(`client-message:${headers.chunk}`, (wssc: InSiteWebSocketServerClient, ...args: ParametersWithoutFirst<typeof this.handleChunk>) => this.handleChunk(wssc, ...args));
			ws.on(`client-message:${headers.sent}`, (wssc: InSiteWebSocketServerClient, ...args: ParametersWithoutFirst<typeof this.handleSent>) => this.handleSent(wssc, ...args));
			ws.on(`client-message:${headers.abort}`, (wssc: InSiteWebSocketServerClient, ...args: ParametersWithoutFirst<typeof this.handleAbort>) => this.handleAbort(wssc, ...args));
		} else {
			ws.on(`message:${headers.request}`, (...args: ParametersWithoutFirst<typeof this.handleRequest>) => this.handleRequest(ws, ...args));
			ws.on(`message:${headers.chunk}`, (...args: ParametersWithoutFirst<typeof this.handleChunk>) => this.handleChunk(ws, ...args));
			ws.on(`message:${headers.sent}`, (...args: ParametersWithoutFirst<typeof this.handleSent>) => this.handleSent(ws, ...args));
			ws.on(`message:${headers.abort}`, (...args: ParametersWithoutFirst<typeof this.handleAbort>) => this.handleAbort(ws, ...args));
		}
		
	}
	
	sizeLimit;
	
	[listenersSymbol] = new Map<string, Set<IncomingTransferListener<FT>>>();
	
	addTransferListener(kind: string, listener: IncomingTransferListener<FT>) {
		this[listenersSymbol].get(kind)?.add(listener) ??
		this[listenersSymbol].set(kind, new Set([ listener ]));
		
		return this;
	}
	
	on = this.addTransferListener;
	
	removeTransferListener(kind: string, listener?: IncomingTransferListener<FT>) {
		if (listener)
			this[listenersSymbol].get(kind)?.delete(listener);
		else
			this[listenersSymbol].delete(kind);
		
		return this;
	}
	
	off = this.removeTransferListener;
	
	[transfersSymbol] = new Map<string, InstanceType<FT>>();
	
	private handleRequest(
		ws: InSiteWebSocket | InSiteWebSocketServerClient,
		kind: string,
		id: string,
		{ type, size, metadata, ...restProps }: IncomingTransferProps<StringKey<FT["types"]>>
	) {
		
		const { Transfer } = this.constructor as PT;
		
		if (!this[listenersSymbol].has(kind))
			ws.sendMessage(headers.error, id, `Unknown kind of file "${kind}"`);
		else if (this[transfersSymbol].has(id))
			ws.sendMessage(headers.error, id, "Transfer already exists");
		else if (!(type in Transfer.types))
			ws.sendMessage(headers.error, id, "Unknown type of transfer");
		else if (size > this.sizeLimit)
			ws.sendMessage(headers.error, id, `Transfer size (${size} bytes) exeeds limit of ${this.sizeLimit} bytes`);
		else
			new Transfer(this as InstanceType<PT>, ws, kind, id, { type, size, metadata, ...restProps });
		
	}
	
	private handleChunk(ws: InSiteWebSocket | InSiteWebSocketServerClient, id: string, chunk: IncomingChunk, length = chunk.length) {
		this[transfersSymbol].get(id)?.handleChunk(chunk, length);
		
	}
	
	private handleSent(ws: InSiteWebSocket | InSiteWebSocketServerClient, id: string) {
		this[transfersSymbol].get(id)?.handleSent();
		
	}
	
	private handleAbort(ws: InSiteWebSocket | InSiteWebSocketServerClient, id: string) {
		this[transfersSymbol].get(id)?.abort(true);
		
	}
	
	
	static Transfer = IncomingTransfer;
	
}
