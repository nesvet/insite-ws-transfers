import { Readable, type Writable } from "node:stream";
import { IncomingTransfer } from "../IncomingTransfer";
import { IncomingTransport } from "../IncomingTransport";
import { IncomingTransferMethods, IncomingTransferTypes } from "../types";


class TransferStream extends Readable {
	constructor(writableStream: Writable) {
		super();
		
		this.writable = writableStream;
		
		this.promise = new Promise((resolve, reject) => {
			writableStream.on("close", resolve);
			writableStream.on("error", reject);
			
		});
		
		this.pipe(writableStream);
		
	}
	
	writable: Writable;
	
	promise: Promise<void>;
	
	_read() { /*  */ }
	
}

/** @this NodeIncomingTransfer */
function pipeTo(this: NodeIncomingTransfer, writableStream: Writable) {
	const stream = new TransferStream(writableStream);
	
	this.streams?.push(stream) ??
	(this.streams = [ stream ]);
	
	return writableStream;
}

const streamMethod: IncomingTransferMethods<typeof NodeIncomingTransfer> = {
	setup() {
		
		if (!this.encoding)
			this.encoding = "buffer";
		
		if (this.encoding === "buffer")
			this.isBuffer = true;
		
		if (this.collect)
			this.data = this.isBuffer ? Buffer.from("") : "";
		
		this.pipeTo = pipeTo;
		
	},
	
	transformChunk(chunk) {
		chunk = this.isBuffer ?
			Buffer.from(chunk as string, "base64") :
			Buffer.from(chunk as string, "base64").toString(this.encoding as Exclude<typeof this.encoding, "buffer">);
		
		if (this.streams)
			for (const stream of this.streams)
				stream.push(chunk);
		
		return chunk;
	},
	
	collect(chunk) {
		if (this.isBuffer)
			this.data = Buffer.concat([ this.data as Buffer, chunk as Buffer ]);
		else
			this.data += chunk as string;
		
	},
	
	async done() {
		
		if (this.streams) {
			const promises = [];
			
			for (const stream of this.streams) {
				stream.push(null);
				promises.push(stream.promise);
			}
			
			await Promise.all(promises);
		}
		
	}
};


class NodeIncomingTransfer extends IncomingTransfer<typeof NodeIncomingTransport, typeof NodeIncomingTransfer> {
	
	streams?: TransferStream[];
	isBuffer?: boolean = false;
	pipeTo? = pipeTo;
	
	
	static types: IncomingTransferTypes<typeof NodeIncomingTransfer> = {
		
		stream: streamMethod,
		
		file: streamMethod,
		
		...IncomingTransfer.types
		
	};
}

class NodeIncomingTransport extends IncomingTransport<typeof NodeIncomingTransport, typeof NodeIncomingTransfer> {
	
	static Transfer = NodeIncomingTransfer;
	
}


export {
	NodeIncomingTransfer as IncomingTransfer,
	NodeIncomingTransport as IncomingTransport
};
