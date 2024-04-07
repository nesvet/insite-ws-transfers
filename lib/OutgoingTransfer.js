import { uid } from "@nesvet/n";
import { callArgsSymbol, chunkSize, headers } from "./common";
import { StringStreamer } from "./StringStreamer";


// FIXME


export class OutgoingTransfer {
	constructor(ws, kind, {
		data,
		type,
		incomingType,
		collect,
		metadata,
		size,
		chunkSize,
		encoding,
		incomingEncoding,
		onBegin,
		onSenderProgress,
		onProgress,
		onEnd,
		onError
	}) {
		
		this.ws = ws;
		this[callArgsSymbol] = ws.wss ? [ ws.wss, ws ] : [ ws ];
		this.outgoingTransport = (ws.wss ?? ws).outgoingTransport;
		
		this.kind = kind;
		
		this.data = data;
		this.collect = collect ?? false;
		this.metadata = metadata;
		this.size = size ?? null;
		this.encoding = encoding;
		this.chunkSize = chunkSize ?? this.constructor.chunkSize;
		
		if (onBegin)
			this.onBegin = onBegin;
		if (onSenderProgress)
			this.onSenderProgress = onSenderProgress;
		if (onProgress)
			this.onProgress = onProgress;
		if (onEnd)
			this.onEnd = onEnd;
		if (onError)
			this.onError = onError;
		
		this.outgoingTransport.transfers.set(this.id, this);
		
		return (async () => {
			
			await this.#setup(type);
			
			this.ws.sendMessage(headers.request, this.kind, this.id, {
				type: incomingType ?? this.type,
				collect: this.collect,
				encoding: incomingEncoding ?? this.encoding,
				size: this.size,
				metadata: this.metadata
			});
			
			return this;
		})();
	}
	
	id = uid();
	#methods = null;
	isAborted = false;
	isTransfered = false;
	confirmResponse;
	beginAt = null;
	#prevChunkAt = null;
	#chunksQueue = [];
	#isProcessing = false;
	duration = null;
	transferedSize = 0;
	bytesPerMs = null;
	senderProgress = 0;
	progress = 0;
	endAt = null;
	error = null;
	
	async #setup(type) {
		
		for (const [ availableType, test, methods ] of this.constructor.methods)
			if (type === availableType || test(this.data)) {
				this.type = availableType;
				this.#methods = methods;
				break;
			}
		
		if (this.type) {
			await this.#methods.setup.call(this);
			delete this.data;
		} else
			throw new Error("Unknown type of transfer");
		
	}
	
	async handleConfirm(confirmResponse) {
		this.confirmResponse = confirmResponse;
		
		this.beginAt =
			this.#prevChunkAt =
				Date.now();
		
		await this.onBegin?.call(...this[callArgsSymbol], this);
		
		this.#methods.confirm.call(this);
		
	}
	
	handleChunk = chunk => {
		this.#chunksQueue.push(chunk);
		
		if (!this.#isProcessing) {
			this.#isProcessing = true;
			this.#process();
		}
		
	};
	
	async #process() {
		
		let chunk = this.#chunksQueue.shift();
		
		const chunkLength = chunk.length;
		
		if (this.#methods.transformChunk)
			chunk = await this.#methods.transformChunk.call(this, chunk);
		
		this.ws.sendMessage(headers.chunk, this.id, chunk, chunkLength);
		
		const ts = Date.now();
		this.bytesPerMs = chunkLength / (ts - this.#prevChunkAt);
		this.#prevChunkAt = ts;
		this.transferedSize += chunkLength;
		
		if (this.size)
			this.senderProgress = this.transferedSize / this.size;
		
		await this.onSenderProgress?.call(...this[callArgsSymbol], this);
		
		if (this.#chunksQueue.length)
			this.#process();
		else {
			this.#isProcessing = false;
			
			if (this.senderProgress === 1)
				this.sent();
		}
		
	}
	
	sent = () => this.ws.sendMessage(headers.sent, this.id);
	
	handleProgress(progress) {
		this.progress = progress;
		
		this.onProgress?.call(...this[callArgsSymbol], this);
		
	}
	
	async handleCompleted() {
		
		this.isTransfered = true;
		
		if (!this.size) {
			this.size = this.transferedSize;
			this.senderProgress = 1;
		}
		
		this.endAt = Date.now();
		this.duration = this.endAt - this.beginAt;
		this.bytesPerMs = this.size / this.duration;
		
		this.outgoingTransport.transfers.delete(this.id);
		
		if (this.progress !== 1) {
			this.progress = 1;
			await this.onProgress?.call(...this[callArgsSymbol], this);
		}
		
		this.onEnd?.call(...this[callArgsSymbol], this);
		
	}
	
	throw(errorMessage) {
		
		this.outgoingTransport.transfers.delete(this.id);
		
		this.error = new Error(errorMessage);
		
		this.onError?.call(...this[callArgsSymbol], this, this.error);
		
	}
	
	abort() {
		
		this.isAborted = true;
		
		this.ws.sendMessage(headers.abort, this.id);
		
		return this.throw("Transfer is aborted by sender");
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
			isTransfered: this.isTransfered,
			confirmResponse: this.confirmResponse,
			beginAt: this.beginAt,
			duration: this.duration,
			transferedSize: this.transferedSize,
			bytesPerMs: this.bytesPerMs,
			senderProgress: this.senderProgress,
			progress: this.progress,
			endAt: this.endAt,
			error: this.error
		};
	}
	
	
	static methods = [
		
		[ "object", data => typeof data == "object", {
			
			setup() {
				
				this.stringStreamer = new StringStreamer(JSON.stringify(this.data), { chunkSize: this.chunkSize });
				this.collect = true;
				this.size = this.stringStreamer.size;
				this.encoding = "utf8";
				
			},
			
			confirm() {
				
				this.stringStreamer.start(this.handleChunk);
				
			}
		} ],
		
		[ "datauri", data => typeof data == "string" && /^data:[\w-.]+\/[\w-.+,]+(?:;base64)?,/.test(data), {
			
			setup() {
				
				const [ type, data ] = this.data.split(/^data:|;base64,|,/).slice(1);
				
				this.stringStreamer = new StringStreamer(data, { chunkSize: this.chunkSize });
				this.size = this.stringStreamer.size;
				this.encoding = "base64";
				this.metadata = { ...this.metadata, type };
				
			},
			
			confirm() {
				
				this.stringStreamer.start(this.handleChunk);
				
			}
		} ],
		
		[ "string", data => typeof data == "string", {
			
			setup() {
				
				this.stringStreamer = new StringStreamer(this.data, { chunkSize: this.chunkSize });
				this.size = this.stringStreamer.size;
				if (!this.encoding)
					this.encoding = "utf8";
				
			},
			
			confirm() {
				
				this.stringStreamer.start(this.handleChunk);
				
			}
		} ]
		
	];
	
	static chunkSize = chunkSize;
	
}
