import type { InSiteWebSocket } from "insite-ws/client";
import type { InSiteWebSocketServer, InSiteWebSocketServerClient } from "insite-ws/server";
import { sizeLimit as defaultSizeLimit, headers } from "./common";
import { IncomingTransfer } from "./IncomingTransfer";
import type {
	IncomingChunk,
	IncomingTransferListener,
	IncomingTransferProps,
	IncomingTransportOptions,
	ParametersWithoutFirst,
	TransferHandles,
	TransferTypes
} from "./types";


export class IncomingTransport<
	WSORWSSC extends InSiteWebSocket | InSiteWebSocketServerClient,
	T extends IncomingTransfer<WSORWSSC>,
	Types extends TransferTypes = TransferTypes
> {
	constructor(ws: InSiteWebSocket | InSiteWebSocketServer<Exclude<WSORWSSC, InSiteWebSocket>>, options: IncomingTransportOptions = {}) {
		
		const {
			sizeLimit = defaultSizeLimit
		} = options;
		
		this.sizeLimit = sizeLimit;
		
		if (ws.isWebSocketServer) {
			ws.on(`client-message:${headers.request}`, (wssc: Exclude<WSORWSSC, InSiteWebSocket>, ...args: ParametersWithoutFirst<typeof this.handleRequest>) => this.handleRequest(wssc, ...args));
			ws.on(`client-message:${headers.chunk}`, (wssc: Exclude<WSORWSSC, InSiteWebSocket>, ...args: ParametersWithoutFirst<typeof this.handleChunk>) => this.handleChunk(wssc, ...args));
			ws.on(`client-message:${headers.sent}`, (wssc: Exclude<WSORWSSC, InSiteWebSocket>, ...args: ParametersWithoutFirst<typeof this.handleSent>) => this.handleSent(wssc, ...args));
			ws.on(`client-message:${headers.abort}`, (wssc: Exclude<WSORWSSC, InSiteWebSocket>, ...args: ParametersWithoutFirst<typeof this.handleAbort>) => this.handleAbort(wssc, ...args));
		} else {
			ws.on(`message:${headers.request}`, (...args: ParametersWithoutFirst<typeof this.handleRequest>) => this.handleRequest(ws, ...args));
			ws.on(`message:${headers.chunk}`, (...args: ParametersWithoutFirst<typeof this.handleChunk>) => this.handleChunk(ws, ...args));
			ws.on(`message:${headers.sent}`, (...args: ParametersWithoutFirst<typeof this.handleSent>) => this.handleSent(ws, ...args));
			ws.on(`message:${headers.abort}`, (...args: ParametersWithoutFirst<typeof this.handleAbort>) => this.handleAbort(ws, ...args));
		}
		
	}
	
	sizeLimit;
	
	#listeners = new Map<string, Set<IncomingTransferListener<WSORWSSC, T>>>();
	
	addTransferListener(kind: string, listener: IncomingTransferListener<WSORWSSC, T>) {
		this.#listeners.get(kind)?.add(listener) ??
		this.#listeners.set(kind, new Set([ listener ]));
		
		return this;
	}
	
	on = this.addTransferListener;
	
	once(kind: string, listener: IncomingTransferListener<WSORWSSC, T>, options?: Omit<IncomingTransferListenerOptions, "once">) {
		return this.addTransferListener(kind, listener, { ...options, once: true });
	}
	
	removeTransferListener(kind: string, listener?: IncomingTransferListener<WSORWSSC, T>) {
		if (listener)
			this.#listeners.get(kind)?.delete(listener);
		else
			this.#listeners.delete(kind);
		
		return this;
	}
	
	off = this.removeTransferListener;
	
	#transfers = new Map<string, T>();
	
	#transferHandles: TransferHandles = {
		
		removeListener: (kind: string, listener: IncomingTransferListener<WSORWSSC, T>) => this.removeTransferListener(kind, listener)
		
	};
	
	private handleRequest(
		ws: Exclude<WSORWSSC, InSiteWebSocket> | InSiteWebSocket,
		kind: string,
		id: string,
		{ type, size, metadata, ...restProps }: IncomingTransferProps<Types>
	) {
		
		const { Transfer } = this.constructor as typeof IncomingTransport;
		
		if (!this.#listeners.has(kind))
			ws.sendMessage(headers.error, id, `Unknown kind of file "${kind}"`);
		else if (this.#transfers.has(id))
			ws.sendMessage(headers.error, id, "Transfer already exists");
		else if (!(type in Transfer.types))
			ws.sendMessage(headers.error, id, "Unknown type of transfer");
		else if (size > this.sizeLimit)
			ws.sendMessage(headers.error, id, `Transfer size (${size} bytes) exeeds limit of ${this.sizeLimit} bytes`);
		else
			this.#transfers.set(id, new Transfer(
				ws,
				kind,
				id,
				{
					type: type as Exclude<TransferTypes, string>,
					size,
					metadata,
					...restProps
				},
				this.#transferHandles,
				this.#listeners.get(kind)!
			) as T);
		
	}
	
	private handleChunk(ws: Exclude<WSORWSSC, InSiteWebSocket> | InSiteWebSocket, id: string, chunk: IncomingChunk, length = chunk.length) {
		this.#transfers.get(id)?.handleChunk(chunk, length);
		
	}
	
	private handleSent(ws: Exclude<WSORWSSC, InSiteWebSocket> | InSiteWebSocket, id: string) {
		this.#transfers.get(id)?.handleSent();
		
	}
	
	private handleAbort(ws: Exclude<WSORWSSC, InSiteWebSocket> | InSiteWebSocket, id: string) {
		this.#transfers.get(id)?.abort(true);
		
	}
	
	
	static Transfer = IncomingTransfer;
	
}
