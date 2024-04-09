export class StringStreamer {
	constructor(string, options = {}) {
		this.string = string;
		this.size = this.string.length;
		
		const {
			chunkSize = 1024 * 256
		} = options;
		
		this.chunkSize = chunkSize;
		
	}
	
	#start = 0;
	#end = 0;
	
	isAborted = false;
	
	start(listener) {
		this.listener = listener;
		
		this.#next();
		
	}
	
	async #next() {
		
		if (!this.isAborted) {
			this.#end = Math.min(this.#start + this.chunkSize, this.size);
			
			const chunk = await new Promise(resolve => resolve(this.string.slice(this.#start, this.#end)));
			
			if (!this.isAborted) {
				await this.listener(chunk);
				
				if (this.#end < this.size) {
					this.#start = this.#end;
					
					this.#next();
				}
			}
		}
		
	}
	
	abort() {
		
		this.isAborted = true;
		
	}
	
}
