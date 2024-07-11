import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import mime from "mime";
import { OutgoingTransfer } from "../OutgoingTransfer";
import { OutgoingTransport } from "../OutgoingTransport";
import { OutgoingTransferTypes } from "../types";


class NodeOutgoingTransfer extends OutgoingTransfer<typeof NodeOutgoingTransport, typeof NodeOutgoingTransfer> {
	
	stream?: Readable;
	isBuffer?: boolean = false;
	
	static types: OutgoingTransferTypes<typeof NodeOutgoingTransfer> = [
		
		[ "stream", data => data instanceof Readable, {
			
			setup() {
				
				this.stream = this.data as Readable;
				
				if (!this.encoding)
					this.encoding = "buffer";
				
				if (this.encoding === "buffer")
					this.isBuffer = true;
				
			},
			
			confirm() {
				
				this.stream!.on("data", this.handleChunk);
				if (!this.size)
					this.stream!.on("end", this.sent);
				
			},
			
			transformChunk(chunk) {
				return (this.isBuffer ? chunk : Buffer.from(chunk as string, this.encoding as Exclude<typeof this.encoding, "buffer">)).toString("base64");
			}
		} ],
		
		[ "file", data => typeof data == "string" && /^(\/|(\/[^/]+)+)$/.test(data), {
			
			async setup() {
				
				const fileName = this.data as string;
				const name = path.basename(fileName);
				const { size, mtimeMs: modifiedAt } = await fs.promises.stat(fileName);
				
				const metadata = {
					name,
					type: mime.getType(path.extname(name).slice(1)),
					size,
					modifiedAt
				};
				
				this.stream = fs.createReadStream(fileName);
				
				this.size = size;
				this.encoding = "buffer";
				
				if (this.metadata)
					Object.assign(this.metadata, metadata);
				else
					this.metadata = metadata;
				
			},
			
			confirm() {
				
				this.stream!.on("data", this.handleChunk);
				
			},
			
			transformChunk(chunk) {
				return chunk.toString("base64");
			}
		} ],
		
		...OutgoingTransfer.types
		
	];
	
}

class NodeOutgoingTransport extends OutgoingTransport<typeof NodeOutgoingTransport, typeof NodeOutgoingTransfer> {
	
	static OutgoingTransfer = NodeOutgoingTransfer;
	
}


export {
	NodeOutgoingTransfer as OutgoingTransfer,
	NodeOutgoingTransport as OutgoingTransport
};
