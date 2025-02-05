import type { InSiteWebSocket } from "insite-ws/client";
import type {
	IncomingTransferListener,
	IncomingTransferListenerOptions,
	OutgoingTransferProps,
	TransferTypes
} from "../types";
import type { IncomingTransfer, IncomingTransport } from "./incoming";
import type { OutgoingTransfer } from "./outgoing";


export type BrowserTransferTypes = Exclude<TransferTypes, "stream">;


type Transfer<WS extends InSiteWebSocket> = {
	transfer: <
		T extends OutgoingTransfer<WS>,
		TP extends BrowserTransferTypes
	>(ws: WS, kind: string, props: OutgoingTransferProps<WS, T, TP>) => T;
};

export type WithTransfer<WS extends InSiteWebSocket> = Transfer<WS> & WS;

export type WithOptionalTransfer<WS extends InSiteWebSocket> = Partial<Transfer<WS>> & WS;


type OnTransfer<WS extends InSiteWebSocket> = {
	onTransfer: <
		T extends IncomingTransfer<WS>
	>(kind: string, listener: IncomingTransferListener<WS, T>, options?: IncomingTransferListenerOptions) => IncomingTransport<WS>;
	onceTransfer: <
		T extends IncomingTransfer<WS>
	>(kind: string, listener: IncomingTransferListener<WS, T>, listenerOptions?: Omit<IncomingTransferListenerOptions, "once">) => IncomingTransport<WS>;
};

export type WithOnTransfer<WS extends InSiteWebSocket> = OnTransfer<WS> & WS;

export type WithOptionalOnTransfer<WS extends InSiteWebSocket> = Partial<OnTransfer<WS>> & WS;
