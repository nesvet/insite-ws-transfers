export class FileStreamer {
	constructor(file, options = {}) {
		this.file = file;
		this.size = this.file.size;
		
		const {
			chunkSize = 1024 * 256
		} = options;
		
		this.chunkSize = chunkSize;
		
		this.fileReader = new FileReader();
		
		this.fileReader.onload = this.#handleFileReaderLoad;
		
	}
	
	#start = 0;
	#end = 0;
	
	isAborted = false;
	
	start(listener) {
		this.listener = listener;
		
		this.#next();
		
	}
	
	#next() {
		
		if (!this.isAborted) {
			this.#end = Math.min(this.#start + this.chunkSize, this.size);
			
			this.fileReader.readAsArrayBuffer(this.file.slice(this.#start, this.#end));
		}
		
	}
	
	#handleFileReaderLoad = async () => {
		
		if (!this.isAborted) {
			const arrayBuffer = this.fileReader.result;
			arrayBuffer.length = arrayBuffer.byteLength;
			
			await this.listener(arrayBuffer);
			
			if (this.#end < this.size) {
				this.#start = this.#end;
				
				this.#next();
			}
		}
		
	};
	
	abort() {
		
		this.isAborted = true;
		
	}
	
}
