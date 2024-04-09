import { OutgoingTransfer } from "../OutgoingTransfer";
import { OutgoingTransport } from "../OutgoingTransport";
import { arrayBufferToBase64 } from "./arrayBufferToBase64";
import { FileStreamer } from "./FileStreamer";


class BrowserOutgoingTransfer extends OutgoingTransfer {
	
	static methods = [
		
		[ "file", data => typeof data == "object" && data instanceof File, {
			
			setup() {
				
				const file = this.data;
				
				this.fileStreamer = new FileStreamer(file, { chunkSize: this.chunkSize });
				
				const metadata = {
					name: file.name,
					type: file.type,
					size: file.size,
					modifiedAt: file.lastModified
				};
				
				if (this.metadata)
					Object.assign(this.metadata, metadata);
				else
					this.metadata = metadata;
				
				this.size = this.fileStreamer.size;
				this.encoding = "buffer";
				
			},
			
			confirm() {
				
				this.fileStreamer.start(this.handleChunk);
				
			},
			
			transformChunk(chunk) {
				return arrayBufferToBase64(chunk);
			}
		} ],
		
		...OutgoingTransfer.methods
		
	];
	
}

class BrowserOutgoingTransport extends OutgoingTransport {
	
	static OutgoingTransfer = BrowserOutgoingTransfer;
	
}


export { BrowserOutgoingTransfer as OutgoingTransfer,
	BrowserOutgoingTransport as OutgoingTransport };
