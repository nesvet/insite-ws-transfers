import fs from "node:fs";
import path from "node:path";
import mime from "mime";
import { OutgoingTransfer } from "../OutgoingTransfer";
import { OutgoingTransport } from "../OutgoingTransport";


class NodeOutgoingTransfer extends OutgoingTransfer {
	
	static methods = [
		
		[ "stream", data => typeof data == "object" && typeof data.on == "function" && typeof data.read == "function", {
			
			setup() {
				
				this.stream = this.data;
				
				if (!this.encoding)
					this.encoding = "buffer";
				
				if (this.encoding === "buffer")
					this.isBuffer = true;
				
			},
			
			confirm() {
				
				this.stream.on("data", this.handleChunk);
				if (!this.size)
					this.stream.on("end", this.sent);
				
			},
			
			transformChunk(chunk) {
				return (this.isBuffer ? chunk : Buffer.from(chunk, this.encoding)).toString("base64");
			}
		} ],
		
		[ "file", data => typeof data == "string" && /^(\/|(\/[^/]+)+)$/.test(data), {
			
			async setup() {
				
				const fileName = this.data;
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
				
				this.stream.on("data", this.handleChunk);
				
			},
			
			transformChunk(chunk) {
				return chunk.toString("base64");
			}
		} ],
		
		...OutgoingTransfer.methods
		
	];
	
}

class NodeOutgoingTransport extends OutgoingTransport {
	
	static OutgoingTransfer = NodeOutgoingTransfer;
	
}


export { NodeOutgoingTransfer as OutgoingTransfer,
	NodeOutgoingTransport as OutgoingTransport };
