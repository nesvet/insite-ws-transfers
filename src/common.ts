export const headers = {
	request: "~t-request",
	confirm: "~t-confirm",
	chunk: "~t-c",
	progress: "~t-p",
	sent: "~t-sent",
	completed: "~t-completed",
	abort: "~t-abort",
	error: "~t-error"
};

export const transfersSymbol = Symbol("transfers");
export const listenersSymbol = Symbol("listeners");

export const sizeLimit = 10 * 1024 * 1024 * 1024;

export const chunkSize = 1024 * 256;

export const callArgsSymbol = Symbol("callArgs");

export const progressInterval = 250;
