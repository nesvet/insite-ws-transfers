import { Readable } from "node:stream";
import { IncomingTransfer } from "../IncomingTransfer";
import { IncomingTransport } from "../IncomingTransport";


class TransferStream extends Readable {
	constructor(writableStream) {
		super();
		
		this.writable = writableStream;
		
		this.promise = new Promise((resolve, reject) => {
			writableStream.on("close", resolve);
			writableStream.on("error", reject);
			
		});
		
		this.pipe(writableStream);
		
	}
	
	_read() {}
	
}

function pipeTo(writableStream) {
	const stream = new TransferStream(writableStream);
	
	this.streams?.push(stream) ??
		(this.streams = [ stream ]);
	
	return writableStream;
}

const streamMethod = {
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
		chunk = this.isBuffer ? Buffer.from(chunk, "base64") : Buffer.from(chunk, "base64").toString(this.encoding);
		
		if (this.streams)
			for (const stream of this.streams)
				stream.push(chunk);
		
		return chunk;
	},
	
	collect(chunk) {
		if (this.isBuffer)
			this.data = Buffer.concat([ this.data, chunk ]);
		else
			this.data += chunk;
		
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


class NodeIncomingTransfer extends IncomingTransfer {
	
	static methods = {
		
		stream: streamMethod,
		
		file: streamMethod,
		
		...IncomingTransfer.methods
		
	};
	
}

class NodeIncomingTransport extends IncomingTransport {
	
	static IncomingTransfer = NodeIncomingTransfer;
	
}


export { NodeIncomingTransfer as IncomingTransfer,
	NodeIncomingTransport as IncomingTransport };
