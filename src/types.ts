import type { Readable } from "node:stream";
import type { WS } from "insite-ws/client";
import type { WSServer, WSServerClient } from "insite-ws/server";
import type { IncomingTransfer } from "./IncomingTransfer";
import type { OutgoingTransfer } from "./OutgoingTransfer";


/* eslint-disable @typescript-eslint/no-explicit-any */


export type ParametersWithoutFirst<T extends (...args: any) => any> = T extends (first: any, ...args: infer P) => any ? P : never;

export type ArrayBufferWithLength = ArrayBuffer & {
	length?: number;
};

export type StreamerOptions = {
	chunkSize?: number;
};

export type TransferTypes = "datauri" | "file" | "object" | "stream" | "string";


export type OutgoingData = Buffer | File | Readable | Record<string, any> | string;

export type OutgoingChunk = ArrayBufferWithLength | Buffer | string;

export type OutgoingTransferProps<
	WSORWSSC extends WS | WSServerClient,
	T extends OutgoingTransfer<WSORWSSC>,
	Types extends TransferTypes
> = {
	data: OutgoingData;
	type?: Types;
	incomingType?: Types;
	collect?: boolean;
	metadata?: Record<string, unknown>;
	size?: number;
	chunkSize?: number;
	encoding?: "base64" | "buffer" | "utf8";
	incomingEncoding?: "base64" | "buffer" | "utf8";
	
	onBegin?: WSORWSSC extends WS ?
		{ (this: WS, transfer: T): Promise<unknown> | unknown } :
		{ (this: WSServer<Exclude<WSORWSSC, WS>>, wssc: Exclude<WSORWSSC, WS>, transfer: T): Promise<unknown> | unknown };
	
	onSenderProgress?: WSORWSSC extends WS ?
		{ (this: WS, transfer: T): Promise<unknown> | unknown } :
		{ (this: WSServer<Exclude<WSORWSSC, WS>>, wssc: Exclude<WSORWSSC, WS>, transfer: T): Promise<unknown> | unknown };
	
	onProgress?: WSORWSSC extends WS ?
		{ (this: WS, transfer: T): Promise<unknown> | unknown } :
		{ (this: WSServer<Exclude<WSORWSSC, WS>>, wssc: Exclude<WSORWSSC, WS>, transfer: T): Promise<unknown> | unknown };
	
	onEnd?: WSORWSSC extends WS ?
		{ (this: WS, transfer: T): Promise<unknown> | unknown } :
		{ (this: WSServer<Exclude<WSORWSSC, WS>>, wssc: Exclude<WSORWSSC, WS>, transfer: T): Promise<unknown> | unknown };
	
	onError?: WSORWSSC extends WS ?
		{ (this: WS, transfer: T, error: Error): Promise<unknown> | unknown } :
		{ (this: WSServer<Exclude<WSORWSSC, WS>>, wssc: Exclude<WSORWSSC, WS>, transfer: T, error: Error): Promise<unknown> | unknown };
};

export type OutgoingTransferHandles = {
	
	delete(id: string): void;
	
};

export type OutgoingTransferMethods<
	T extends OutgoingTransfer<WS | WSServerClient>
> = {
	setup(this: T): void;
	confirm(this: T): void;
	transformChunk?(this: T, chunk: OutgoingChunk): OutgoingChunk | Promise<OutgoingChunk>;
};

export type OutgoingTransferTypes<
	T extends OutgoingTransfer<WS | WSServerClient>,
	Types extends TransferTypes
> = [
	type: Types,
	test: (data: OutgoingData) => boolean,
	OutgoingTransferMethods<T>
][];

export type WSWithTransfer<W extends WS> = W & {
	transfer: <T extends OutgoingTransfer<W>, TP extends TransferTypes>(kind: string, props: OutgoingTransferProps<W, T, TP>) => T;
};


export type IncomingTransportOptions = {
	sizeLimit?: number;
};

export type IncomingData = Buffer | string;

export type IncomingChunk = Buffer | string;

export type IncomingTransferProps<Types extends TransferTypes> = {
	type: Types;
	collect: boolean;
	encoding: "base64" | "buffer" | "utf8";
	size: number;
	metadata: Record<string, unknown>;
};

export type IncomingTransferMethods<
	T extends IncomingTransfer<WS | WSServerClient>
> = {
	setup(this: T): void;
	collect(this: T, chunk: IncomingChunk): void;
	transformChunk?(this: T, chunk: IncomingChunk): IncomingChunk;
	done?(this: T): void;
};

export type IncomingTransferTypes<
	T extends IncomingTransfer<WS | WSServerClient>,
	Types extends TransferTypes
> = Partial<Record<Types, IncomingTransferMethods<T>>>;

export type IncomingTransferListener<
	WSORWSSC extends WS | WSServerClient,
	T extends IncomingTransfer<WSORWSSC>
> = {
	
	begin?: WSORWSSC extends WS ?
		{ (this: WS, transfer: T): Promise<unknown> | unknown } :
		{ (this: WSServer<Exclude<WSORWSSC, WS>>, wssc: Exclude<WSORWSSC, WS>, transfer: T): Promise<unknown> | unknown };
	
	chunk?: WSORWSSC extends WS ?
		{ (this: WS, transfer: T, chunk: IncomingChunk): Promise<unknown> | unknown } :
		{ (this: WSServer<Exclude<WSORWSSC, WS>>, wssc: Exclude<WSORWSSC, WS>, transfer: T, chunk: IncomingChunk): Promise<unknown> | unknown };
	
	progress?: WSORWSSC extends WS ?
		{ (this: WS, transfer: T, chunk: IncomingChunk): Promise<unknown> | unknown } :
		{ (this: WSServer<Exclude<WSORWSSC, WS>>, wssc: Exclude<WSORWSSC, WS>, transfer: T, chunk: IncomingChunk): Promise<unknown> | unknown };
	
	end?: WSORWSSC extends WS ?
		{ (this: WS, transfer: T): Promise<unknown> | unknown } :
		{ (this: WSServer<Exclude<WSORWSSC, WS>>, wssc: Exclude<WSORWSSC, WS>, transfer: T): Promise<unknown> | unknown };
	
	error?: WSORWSSC extends WS ?
		{ (this: WS, transfer: T, error: Error): Promise<unknown> | unknown } :
		{ (this: WSServer<Exclude<WSORWSSC, WS>>, wssc: Exclude<WSORWSSC, WS>, transfer: T, error: Error): Promise<unknown> | unknown };
	
	once?: boolean;
	
};

export type IncomingTransferListenerOptions = {
	once?: boolean;
};

export type IncomingTransferHandles = {
	
	delete(id: string): void;
	
	removeListener(kind: string, listener: IncomingTransferListener<any, any>): any;
	
};
