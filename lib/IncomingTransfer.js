import { callArgsSymbol, headers, progressInterval } from "./common";


export class IncomingTransfer {
	constructor(ws, kind, id, { type, collect, encoding, size, metadata }) {
		this.ws = ws;
		this[callArgsSymbol] = ws.wss ? [ ws.wss, ws ] : [ ws ];
		this.incomingTransport = (ws.wss ?? ws).incomingTransport;
		
		this.kind = kind;
		this.id = id;
		this.type = type;
		this.collect = !!collect;
		this.encoding = encoding;
		this.size = size;
		this.metadata = metadata;
		
		this.listeners = this.incomingTransport.listeners.get(this.kind);
		
		this.incomingTransport.transfers.set(this.id, this);
		
		return (async () => {
			await this.#setup();
			
			this.confirm();
			
			return this;
		})();
	}
	
	#methods;
	isAborted = false;
	isAbortedBySender = false;
	isAbortedByReceiver = false;
	isTransfered = false;
	confirmResponse;
	beginAt = null;
	#prevChunkAt = null;
	#chunksQueue = [];
	#isProcessing = false;
	duration = null;
	transferedSize = 0;
	processedSize = 0;
	bytesPerMs = null;
	progress = 0;
	endAt = null;
	error = null;
	
	
	#progressInterval;
	#lastProgress = 0;
	
	async #setup() {
		
		this.#methods = this.constructor.methods[this.type];
		
		if (this.#methods)
			await this.#methods.setup.call(this);
		else
			throw new Error(`Unknown type of transfer "${this.type}"`);
		
	}
	
	async confirm() {
		
		for (const { begin } of this.listeners)
			if (await begin?.call(...this[callArgsSymbol], this) === false)
				return this.throw("Transfer was rejected by receiver");
		
		this.beginAt =
			this.#prevChunkAt =
				Date.now();
		
		this.ws.sendMessage(headers.confirm, this.id, this.confirmResponse);
		
		this.#progressInterval = setInterval(() => {
			
			if (this.#lastProgress !== this.progress) {
				this.#lastProgress = this.progress;
				this.ws.sendMessage(headers.progress, this.id, this.progress);
			}
			
		}, progressInterval);
		
	}
	
	handleChunk(chunk, length = chunk.length) {
		
		const ts = Date.now();
		this.bytesPerMs = length / (ts - this.#prevChunkAt);
		this.#prevChunkAt = ts;
		this.transferedSize += length;
		
		this.#chunksQueue.push([ chunk, length ]);
		
		if (!this.#isProcessing) {
			this.#isProcessing = true;
			this.#process();
		}
		
	}
	
	async #process() {
		
		let [ chunk, length ] = this.#chunksQueue.shift();
		
		if (this.#methods.transformChunk)
			chunk = await this.#methods.transformChunk.call(this, chunk);
		
		if (this.collect)
			await this.#methods.collect.call(this, chunk);
		
		for (const { chunk: chunkListener, progress: progressListener } of this.listeners)
			await (chunkListener ?? progressListener)?.call(...this[callArgsSymbol], this, chunk);
		
		this.processedSize += length;
		if (this.size)
			this.progress = this.processedSize / this.size;
		
		if (this.#chunksQueue.length)
			this.#process();
		else {
			this.#isProcessing = false;
			
			if (this.isTransfered)
				this.#complete();
		}
		
	}
	
	handleSent() {
		
		this.isTransfered = true;
		
		if (!this.size)
			this.size = this.transferedSize;
		
		this.endAt = Date.now();
		this.duration = this.endAt - this.beginAt;
		this.bytesPerMs = this.size / this.duration;
		
		if (!this.#isProcessing)
			this.#complete();
		
	}
	
	async #complete() {
		
		this.progress = 1;
		
		await this.#methods.done?.call(this);
		
		for (const { end } of this.listeners)
			await end?.call(...this[callArgsSymbol], this);
		
		clearInterval(this.#progressInterval);
		
		this.incomingTransport.transfers.delete(this.id);
		
		this.ws.sendMessage(headers.completed, this.id);
		
	}
	
	abort(bySender = false) {
		
		this.isAborted = true;
		this.isAbortedBySender = bySender;
		this.isAbortedByReceiver = !bySender;
		
		return this.throw(`Transfer is aborted by ${bySender ? "sender" : "receiver"}`, !bySender);
	}
	
	throw(errorMessage, sendToSender = true) {
		
		this.incomingTransport.transfers.delete(this.id);
		
		clearInterval(this.#progressInterval);
		
		this.error = new Error(errorMessage);
		
		for (const { error } of this.listeners)
			error?.call(...this[callArgsSymbol], this, this.error);
		
		if (sendToSender)
			this.ws.sendMessage(headers.error, this.id, errorMessage);
		
	}
	
	serialize() {
		return {
			id: this.id,
			kind: this.kind,
			type: this.type,
			collect: this.collect,
			encoding: this.encoding,
			size: this.size,
			metadata: this.metadata,
			isAborted: this.isAborted,
			isAbortedBySender: this.isAbortedBySender,
			isAbortedByReceiver: this.isAbortedByReceiver,
			isTransfered: this.isTransfered,
			confirmResponse: this.confirmResponse,
			beginAt: this.beginAt,
			duration: this.duration,
			transferedSize: this.transferedSize,
			processedSize: this.processedSize,
			bytesPerMs: this.bytesPerMs,
			progress: this.progress,
			endAt: this.endAt,
			error: this.error
		};
	}
	
	
	static methods = {
		
		object: {
			setup() {
				
				this.data = "";
				
			},
			
			collect(chunk) {
				this.data += chunk;
				
			},
			
			done() {
				this.data = JSON.parse(this.data);
				
			}
		},
		
		datauri: {
			setup() {
				
				if (this.collect)
					this.data = "";
				
			},
			
			collect(chunk) {
				this.data += chunk;
				
			},
			
			done() {
				
				if (this.collect)
					this.data = `data:${this.metadata.type};base64,${this.data}`;
				
			}
		},
		
		string: {
			setup() {
				
				if (this.collect)
					this.data = "";
				
			},
			
			collect(chunk) {
				this.data += chunk;
				
			}
		}
		
	};
	
}
