import { IncomingTransfer } from "../IncomingTransfer";
import { IncomingTransport } from "../IncomingTransport";


class BrowserIncomingTransfer extends IncomingTransfer {
	
	static methods = {
		
		file: {
			setup() {
				
				if (this.collect)
					this.data = "";
				
			},
			
			collect(chunk) {
				this.data += chunk;
				
			},
			
			end() {
				
				if (this.collect && this.encoding === "utf8")
					this.data = atob(this.data);
				
			}
		}
		
	};
	
}

class BrowserIncomingTransport extends IncomingTransport {
	
	static IncomingTransfer = BrowserIncomingTransfer;
	
}


export { BrowserIncomingTransfer as IncomingTransfer, BrowserIncomingTransport as IncomingTransport };
