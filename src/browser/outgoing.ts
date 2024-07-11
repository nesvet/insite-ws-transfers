import { OutgoingTransfer } from "../OutgoingTransfer";
import { OutgoingTransport } from "../OutgoingTransport";
import { OutgoingTransferTypes } from "../types";
import { arrayBufferToBase64 } from "./arrayBufferToBase64";
import { FileStreamer } from "./FileStreamer";


class BrowserOutgoingTransfer extends OutgoingTransfer<typeof BrowserOutgoingTransport, typeof BrowserOutgoingTransfer> {
	
	static types: OutgoingTransferTypes<typeof BrowserOutgoingTransfer> = [
		
		[ "file", data => typeof data == "object" && data instanceof File, {
			
			setup() {
				
				const file = this.data as File;
				
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
				
				this.fileStreamer!.start(this.handleChunk);
				
			},
			
			transformChunk(chunk) {
				return arrayBufferToBase64(chunk as Buffer);
			}
		} ],
		
		...OutgoingTransfer.types
		
	];
	
}

class BrowserOutgoingTransport extends OutgoingTransport<typeof BrowserOutgoingTransport, typeof BrowserOutgoingTransfer> {
	
	static Transfer = BrowserOutgoingTransfer;
	
}


export {
	BrowserOutgoingTransfer as OutgoingTransfer,
	BrowserOutgoingTransport as OutgoingTransport
};
