import type { InSiteWebSocket } from "insite-ws/client";
import type { InSiteWebSocketServerClient } from "insite-ws/server";
import { IncomingTransfer } from "../IncomingTransfer";
import { IncomingTransport } from "../IncomingTransport";
import type { IncomingTransferTypes } from "../types";
import type { BrowserTransferTypes } from "./types";
export type { IncomingTransportOptions } from "../types";


class BrowserIncomingTransfer<
	WSORWSSC extends InSiteWebSocket | InSiteWebSocketServerClient = InSiteWebSocket
> extends IncomingTransfer<WSORWSSC> {
	
	static types: IncomingTransferTypes<BrowserIncomingTransfer<InSiteWebSocket>, BrowserTransferTypes> = {
		
		file: {
			setup() {
				
				if (this.collect)
					this.data = "";
				
			},
			
			collect(chunk) {
				this.data += chunk as string;
				
			},
			
			done() {
				
				if (this.collect && this.encoding === "utf8")
					this.data = atob(this.data as string);
				
			}
		},
		
		...IncomingTransfer.types
		
	};
	
}

class BrowserIncomingTransport<
	WSORWSSC extends InSiteWebSocket = InSiteWebSocket
> extends IncomingTransport<WSORWSSC, BrowserIncomingTransfer<WSORWSSC>, BrowserTransferTypes> {
	
	static Transfer = BrowserIncomingTransfer;
	
}


export {
	BrowserIncomingTransfer as IncomingTransfer,
	BrowserIncomingTransport as IncomingTransport
};
