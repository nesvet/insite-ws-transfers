import { IncomingTransfer } from "../IncomingTransfer";
import { IncomingTransport } from "../IncomingTransport";
import { IncomingTransferTypes } from "../types";


class BrowserIncomingTransfer extends IncomingTransfer<typeof BrowserIncomingTransport, typeof BrowserIncomingTransfer> {
	
	static types: IncomingTransferTypes<typeof BrowserIncomingTransfer> = {
		
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

class BrowserIncomingTransport extends IncomingTransport<typeof BrowserIncomingTransport, typeof BrowserIncomingTransfer> {
	
	static Transfer = BrowserIncomingTransfer;
	
}


export {
	BrowserIncomingTransfer as IncomingTransfer,
	BrowserIncomingTransport as IncomingTransport
};
