import type { InSiteWebSocketServerClient } from "insite-ws/server";
import type {
	IncomingTransferListener,
	IncomingTransferListenerOptions,
	OutgoingTransferProps,
	TransferTypes
} from "../types";
import type { IncomingTransfer, IncomingTransport } from "./incoming";
import type { OutgoingTransfer } from "./outgoing";


export type NodeTransferTypes = TransferTypes;


type Transfer<WSSC extends InSiteWebSocketServerClient> = {
	transfer: <
		T extends OutgoingTransfer<WSSC>,
		TP extends NodeTransferTypes
	>(wssc: WSSC, kind: string, props: OutgoingTransferProps<WSSC, T, TP>) => T;
};

export type WithTransfer<W, WSSC extends InSiteWebSocketServerClient> = Transfer<WSSC> & W;

export type WithOptionalTransfer<W, WSSC extends InSiteWebSocketServerClient> = Partial<Transfer<WSSC>> & W;


type OnTransfer<WSSC extends InSiteWebSocketServerClient> = {
	onTransfer: <
		T extends IncomingTransfer<WSSC>
	>(kind: string, listener: IncomingTransferListener<WSSC, T>, options?: IncomingTransferListenerOptions) => IncomingTransport<WSSC>;
	onceTransfer: <
		T extends IncomingTransfer<WSSC>
	>(kind: string, listener: IncomingTransferListener<WSSC, T>, listenerOptions?: Omit<IncomingTransferListenerOptions, "once">) => IncomingTransport<WSSC>;
};

export type WithOnTransfer<W, WSSC extends InSiteWebSocketServerClient> = OnTransfer<WSSC> & W;

export type WithOptionalOnTransfer<W, WSSC extends InSiteWebSocketServerClient> = Partial<OnTransfer<WSSC>> & W;
