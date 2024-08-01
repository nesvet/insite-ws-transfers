import { Readable } from "node:stream";
import { InSiteWebSocket } from "insite-ws/client";
import { InSiteWebSocketServer, InSiteWebSocketServerClient } from "insite-ws/server";
import { StringKey } from "@nesvet/n";
import { IncomingTransfer } from "./IncomingTransfer";
import { OutgoingTransfer } from "./OutgoingTransfer";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ParametersWithoutFirst<T extends (...args: any) => any> = T extends (first: any, ...args: infer P) => any ? P : never;

export type ArrayBufferWithLength = {
	length?: number;
} & ArrayBuffer;

export type StreamerOptions = {
	chunkSize?: number;
};


export type OutgoingData = Buffer | File | Readable | string;

export type OutgoingChunk = ArrayBufferWithLength | Buffer | string;

export type OutgoingTransferProps<FT extends typeof OutgoingTransfer> = {
	data: OutgoingData;
	type: StringKey<FT["types"]>;
	incomingType?: StringKey<FT["types"]>;
	collect: boolean;
	metadata: Record<string, unknown>;
	size: number;
	chunkSize: number;
	encoding: "base64" | "buffer" | "utf8";
	incomingEncoding?: "base64" | "buffer" | "utf8";
	
	onBegin?: {
		(this: InSiteWebSocket, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	} | {
		(this: InSiteWebSocketServer, ws: InSiteWebSocketServerClient, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	};
	
	onSenderProgress?: {
		(this: InSiteWebSocket, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	} | {
		(this: InSiteWebSocketServer, ws: InSiteWebSocketServerClient, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	};
	
	onProgress?: {
		(this: InSiteWebSocket, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	} | {
		(this: InSiteWebSocketServer, ws: InSiteWebSocketServerClient, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	};
	
	onEnd?: {
		(this: InSiteWebSocket, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	} | {
		(this: InSiteWebSocketServer, ws: InSiteWebSocketServerClient, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	};
	
	onError?: {
		(this: InSiteWebSocket, transfer: InstanceType<FT>, error: Error): Promise<unknown> | unknown;
	} | {
		(this: InSiteWebSocketServer, ws: InSiteWebSocketServerClient, transfer: InstanceType<FT>, error: Error): Promise<unknown> | unknown;
	};
};

export type OutgoingTransferMethods<FT extends typeof OutgoingTransfer> = {
	setup(this: InstanceType<FT>): void;
	confirm(this: InstanceType<FT>): void;
	transformChunk?(this: InstanceType<FT>, chunk: OutgoingChunk): OutgoingChunk | Promise<OutgoingChunk>;
};

export type OutgoingTransferTypes<FT extends typeof OutgoingTransfer> = [ type: string, test: (data: OutgoingData) => boolean, OutgoingTransferMethods<FT> ][];


export type IncomingData = Buffer | string;

export type IncomingChunk = Buffer | string;

export type IncomingTransferProps<Type extends string = string> = {
	type: Type;
	collect: boolean;
	encoding: "base64" | "buffer" | "utf8";
	size: number;
	metadata: Record<string, unknown>;
};

export type IncomingTransferMethods<FT extends typeof IncomingTransfer> = {
	setup(this: InstanceType<FT>): void;
	collect(this: InstanceType<FT>, chunk: IncomingChunk): void;
	transformChunk?(this: InstanceType<FT>, chunk: IncomingChunk): IncomingChunk;
	done?(this: InstanceType<FT>): void;
};

export type IncomingTransferTypes<FT extends typeof IncomingTransfer> = Record<string, IncomingTransferMethods<FT>>;

export type IncomingTransferListener<FT extends typeof IncomingTransfer> = {
	
	begin?: {
		(this: InSiteWebSocket, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	} | {
		(this: InSiteWebSocketServer, ws: InSiteWebSocketServerClient, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	};
	
	chunk?: {
		(this: InSiteWebSocket, transfer: InstanceType<FT>, chunk: IncomingChunk): Promise<unknown> | unknown;
	} | {
		(this: InSiteWebSocketServer, ws: InSiteWebSocketServerClient, transfer: InstanceType<FT>, chunk: IncomingChunk): Promise<unknown> | unknown;
	};
	
	progress?: {
		(this: InSiteWebSocket, transfer: InstanceType<FT>, chunk: IncomingChunk): Promise<unknown> | unknown;
	} | {
		(this: InSiteWebSocketServer, ws: InSiteWebSocketServerClient, transfer: InstanceType<FT>, chunk: IncomingChunk): Promise<unknown> | unknown;
	};
	
	end?: {
		(this: InSiteWebSocket, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	} | {
		(this: InSiteWebSocketServer, ws: InSiteWebSocketServerClient, transfer: InstanceType<FT>): Promise<unknown> | unknown;
	};
	
	error?: {
		(this: InSiteWebSocket, transfer: InstanceType<FT>, error: Error): Promise<unknown> | unknown;
	} | {
		(this: InSiteWebSocketServer, ws: InSiteWebSocketServerClient, transfer: InstanceType<FT>, error: Error): Promise<unknown> | unknown;
	};
	
};
