import type { InSiteWebSocket } from "insite-ws/client";
import type { InSiteWebSocketServer, InSiteWebSocketServerClient } from "insite-ws/server";
import { headers } from "./common";
import { OutgoingTransfer } from "./OutgoingTransfer";
import type { OutgoingTransferProps, ParametersWithoutFirst, TransferTypes } from "./types";


export class OutgoingTransport<
	WSORWSSC extends InSiteWebSocket | InSiteWebSocketServerClient,
	T extends OutgoingTransfer<WSORWSSC>,
	Types extends TransferTypes = TransferTypes
> {
	constructor(ws: InSiteWebSocket | InSiteWebSocketServer<Exclude<WSORWSSC, InSiteWebSocket>>) {
		
		if (ws.isWebSocketServer) {
			ws.on(`client-message:${headers.confirm}`, (wssc: Exclude<WSORWSSC, InSiteWebSocket>, ...args: ParametersWithoutFirst<typeof this.handleConfirm>) => this.handleConfirm(wssc, ...args));
			ws.on(`client-message:${headers.progress}`, (wssc: Exclude<WSORWSSC, InSiteWebSocket>, ...args: ParametersWithoutFirst<typeof this.handleProgress>) => this.handleProgress(wssc, ...args));
			ws.on(`client-message:${headers.completed}`, (wssc: Exclude<WSORWSSC, InSiteWebSocket>, ...args: ParametersWithoutFirst<typeof this.handleCompleted>) => this.handleCompleted(wssc, ...args));
			ws.on(`client-message:${headers.error}`, (wssc: Exclude<WSORWSSC, InSiteWebSocket>, ...args: ParametersWithoutFirst<typeof this.handleError>) => this.handleError(wssc, ...args));
		} else {
			ws.on(`message:${headers.confirm}`, (...args: ParametersWithoutFirst<typeof this.handleConfirm>) => this.handleConfirm(ws, ...args));
			ws.on(`message:${headers.progress}`, (...args: ParametersWithoutFirst<typeof this.handleProgress>) => this.handleProgress(ws, ...args));
			ws.on(`message:${headers.completed}`, (...args: ParametersWithoutFirst<typeof this.handleCompleted>) => this.handleCompleted(ws, ...args));
			ws.on(`message:${headers.error}`, (...args: ParametersWithoutFirst<typeof this.handleError>) => this.handleError(ws, ...args));
		}
		
	}
	
	#transfers = new Map<string, T>();
	
	#transferHandles = {
		delete: (id: string) => this.#transfers.delete(id)
	};
	
	transfer(ws: Exclude<WSORWSSC, InSiteWebSocket> | InSiteWebSocket, kind: string, props: OutgoingTransferProps<WSORWSSC, T, Types>) {
		
		const { Transfer } = this.constructor as typeof OutgoingTransport;
		
		const transfer = new Transfer(ws, kind, props, this.#transferHandles);
		
		this.#transfers.set(transfer.id, transfer as T);
		
		return transfer;
	}
	
	private handleConfirm(ws: Exclude<WSORWSSC, InSiteWebSocket> | InSiteWebSocket, id: string, confirmResponse: string) {
		this.#transfers.get(id)?.handleConfirm(confirmResponse);
		
	}
	
	private handleProgress(ws: Exclude<WSORWSSC, InSiteWebSocket> | InSiteWebSocket, id: string, progress: number) {
		this.#transfers.get(id)?.handleProgress(progress);
		
	}
	
	private handleCompleted(ws: Exclude<WSORWSSC, InSiteWebSocket> | InSiteWebSocket, id: string) {
		this.#transfers.get(id)?.handleCompleted();
		
	}
	
	private handleError(ws: Exclude<WSORWSSC, InSiteWebSocket> | InSiteWebSocket, id: string, errorMessage: string) {
		this.#transfers.get(id)?.throw(errorMessage);
		
	}
	
	
	static Transfer = OutgoingTransfer;
	
}
