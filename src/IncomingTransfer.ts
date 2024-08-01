/* eslint-disable @typescript-eslint/no-explicit-any */
import { InSiteWebSocket } from "insite-ws/client";
import { InSiteWebSocketServer, InSiteWebSocketServerClient } from "insite-ws/server";
import { StringKey } from "@nesvet/n";
import {
	callArgsSymbol,
	headers,
	listenersSymbol,
	progressInterval,
	transfersSymbol
} from "./common";
import { IncomingTransport } from "./IncomingTransport";
import {
	IncomingChunk,
	IncomingData,
	IncomingTransferMethods,
	IncomingTransferProps,
	IncomingTransferTypes
} from "./types";


export class IncomingTransfer<PT extends typeof IncomingTransport, FT extends typeof IncomingTransfer> {
	constructor(
		transport: IncomingTransport<PT, FT>,
		ws: InSiteWebSocket | InSiteWebSocketServerClient,
		kind: string,
		id: string,
		{ type, collect, encoding, size, metadata }: IncomingTransferProps<StringKey<FT["types"]>>
	) {
		
		this.transport = transport;
		this.ws = ws;
		this[callArgsSymbol] = ws.isWebSocketServerClient ? [ ws.wss, ws ] as const : [ ws ] as const;
		this.kind = kind;
		this.id = id;
		this.type = type;
		this.collect = !!collect;
		this.encoding = encoding;
		this.size = size;
		this.metadata = metadata;
		
		this.listeners = this.transport[listenersSymbol].get(this.kind)!;
		
		this.transport[transfersSymbol].set(this.id, this as InstanceType<FT>);
		
		this.#setupPromise = this.#setup();
		
	}
	
	transport;
	ws;
	[callArgsSymbol]: readonly [InSiteWebSocket] | readonly [InSiteWebSocketServer, InSiteWebSocketServerClient];
	kind;
	id;
	type: string;
	collect;
	encoding;
	size;
	metadata;
	listeners;
	#setupPromise;
	
	data?: IncomingData;
	#methods?: IncomingTransferMethods<FT>;
	isAborted = false;
	isAbortedBySender = false;
	isAbortedByReceiver = false;
	isTransfered = false;
	confirmResponse?: string;
	beginAt: null | number = null;
	#prevChunkAt: null | number = null;
	#chunksQueue: [ chunk: IncomingChunk, length: number ][] = [];
	#isProcessing = false;
	duration: null | number = null;
	transferedSize = 0;
	processedSize = 0;
	bytesPerMs: null | number = null;
	progress = 0;
	endAt: null | number = null;
	error: Error | null = null;
	
	
	#progressInterval?: NodeJS.Timeout;
	#lastProgress = 0;
	
	async #setup() {
		
		this.#methods = ((this.constructor as FT).types as IncomingTransferTypes<FT>)[this.type];
		
		if (this.#methods)
			await this.#methods.setup.call(this as InstanceType<FT>);
		else
			throw new Error(`Unknown type of transfer "${String(this.type)}"`);
		
		this.confirm();
		
	}
	
	whenSetUp() {
		return this.#setupPromise;
	}
	
	async confirm() {
		
		const callArgs = this[callArgsSymbol];
		for (const { begin } of this.listeners)
			if (await (begin as any)?.call(...callArgs, this as InstanceType<FT>) === false)
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
		
		return null;
	}
	
	handleChunk(chunk: IncomingChunk, length = chunk.length) {
		
		const ts = Date.now();
		this.bytesPerMs = length / (ts - this.#prevChunkAt!);
		this.#prevChunkAt = ts;
		this.transferedSize += length;
		
		this.#chunksQueue.push([ chunk, length ]);
		
		if (!this.#isProcessing) {
			this.#isProcessing = true;
			this.#process();
		}
		
	}
	
	async #process() {
		
		let [ chunk, length ] = this.#chunksQueue.shift()!;// eslint-disable-line prefer-const
		
		if (this.#methods!.transformChunk)
			chunk = await this.#methods!.transformChunk.call(this as InstanceType<FT>, chunk);
		
		if (this.collect)
			await this.#methods!.collect.call(this as InstanceType<FT>, chunk);
		
		const callArgs = this[callArgsSymbol];
		for (const { chunk: chunkListener, progress: progressListener } of this.listeners)
			await ((chunkListener ?? progressListener) as any)?.call(...callArgs, this as InstanceType<FT>, chunk);
		
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
		this.duration = this.endAt - this.beginAt!;
		this.bytesPerMs = this.size / this.duration;
		
		if (!this.#isProcessing)
			this.#complete();
		
	}
	
	async #complete() {
		
		this.progress = 1;
		
		await this.#methods!.done?.call(this as InstanceType<FT>);
		
		const callArgs = this[callArgsSymbol];
		for (const { end } of this.listeners)
			await (end as any)?.call(...callArgs, this as InstanceType<FT>);
		
		clearInterval(this.#progressInterval);
		
		this.transport[transfersSymbol].delete(this.id);
		
		this.ws.sendMessage(headers.completed, this.id);
		
	}
	
	abort(bySender = false) {
		
		this.isAborted = true;
		this.isAbortedBySender = bySender;
		this.isAbortedByReceiver = !bySender;
		
		return this.throw(`Transfer is aborted by ${bySender ? "sender" : "receiver"}`, !bySender);
	}
	
	throw(errorMessage: string, sendToSender = true) {
		
		this.transport[transfersSymbol].delete(this.id);
		
		clearInterval(this.#progressInterval);
		
		this.error = new Error(errorMessage);
		
		const callArgs = this[callArgsSymbol];
		for (const { error } of this.listeners)
			(error as any)?.call(...callArgs, this as InstanceType<FT>, this.error);
		
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
	
	
	static readonly types: IncomingTransferTypes<typeof IncomingTransfer> = {
		
		object: {
			setup() {
				
				this.data = "";
				
			},
			
			collect(chunk) {
				this.data += chunk as string;
				
			},
			
			done() {
				this.data = JSON.parse(this.data as string);
				
			}
		},
		
		datauri: {
			setup() {
				
				if (this.collect)
					this.data = "";
				
			},
			
			collect(chunk) {
				this.data += chunk as string;
				
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
				this.data += chunk as string;
				
			}
		}
		
	};
	
}
