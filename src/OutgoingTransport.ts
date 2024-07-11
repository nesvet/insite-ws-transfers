import { InSiteWebSocket } from "insite-ws/client";
import { InSiteWebSocketServer, InSiteWebSocketServerClient } from "insite-ws/server";
import { headers, transfersSymbol } from "./common";
import { OutgoingTransfer } from "./OutgoingTransfer";
import { OutgoingTransferProps, ParametersWithoutFirst } from "./types";


export class OutgoingTransport<PT extends typeof OutgoingTransport, FT extends typeof OutgoingTransfer> {
	constructor(ws: InSiteWebSocket | InSiteWebSocketServer) {
		
		if (ws.isWebSocketServer) {
			ws.on(`client-message:${headers.confirm}`, (wssc: InSiteWebSocketServerClient, ...args: ParametersWithoutFirst<typeof this.handleConfirm>) => this.handleConfirm(wssc, ...args));
			ws.on(`client-message:${headers.progress}`, (wssc: InSiteWebSocketServerClient, ...args: ParametersWithoutFirst<typeof this.handleProgress>) => this.handleProgress(wssc, ...args));
			ws.on(`client-message:${headers.completed}`, (wssc: InSiteWebSocketServerClient, ...args: ParametersWithoutFirst<typeof this.handleCompleted>) => this.handleCompleted(wssc, ...args));
			ws.on(`client-message:${headers.error}`, (wssc: InSiteWebSocketServerClient, ...args: ParametersWithoutFirst<typeof this.handleError>) => this.handleError(wssc, ...args));
		} else {
			ws.on(`message:${headers.confirm}`, (...args: ParametersWithoutFirst<typeof this.handleConfirm>) => this.handleConfirm(ws, ...args));
			ws.on(`message:${headers.progress}`, (...args: ParametersWithoutFirst<typeof this.handleProgress>) => this.handleProgress(ws, ...args));
			ws.on(`message:${headers.completed}`, (...args: ParametersWithoutFirst<typeof this.handleCompleted>) => this.handleCompleted(ws, ...args));
			ws.on(`message:${headers.error}`, (...args: ParametersWithoutFirst<typeof this.handleError>) => this.handleError(ws, ...args));
		}
		
	}
	
	[transfersSymbol] = new Map<string, InstanceType<FT>>();
	
	transfer(ws: InSiteWebSocket | InSiteWebSocketServerClient, kind: string, props: OutgoingTransferProps<FT>) {
		const { Transfer } = this.constructor as PT;
		
		return new Transfer(this as InstanceType<PT>, ws, kind, props);
	}
	
	private handleConfirm(ws: InSiteWebSocket | InSiteWebSocketServerClient, id: string, confirmResponse: string) {
		this[transfersSymbol].get(id)?.handleConfirm(confirmResponse);
		
	}
	
	private handleProgress(ws: InSiteWebSocket | InSiteWebSocketServerClient, id: string, progress: number) {
		this[transfersSymbol].get(id)?.handleProgress(progress);
		
	}
	
	private handleCompleted(ws: InSiteWebSocket | InSiteWebSocketServerClient, id: string) {
		this[transfersSymbol].get(id)?.handleCompleted();
		
	}
	
	private handleError(ws: InSiteWebSocket | InSiteWebSocketServerClient, id: string, errorMessage: string) {
		this[transfersSymbol].get(id)?.throw(errorMessage);
		
	}
	
	
	static Transfer = OutgoingTransfer;
	
}
