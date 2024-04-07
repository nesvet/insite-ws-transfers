export async function arrayBufferToBase64(arrayBuffer) {
	return new Promise(resolve => {
		
		const fileReader = new FileReader();
		
		fileReader.onload = ({ target: { result } }) => resolve(result.substring(result.indexOf(",") + 1));
		
		fileReader.readAsDataURL(new Blob([ arrayBuffer ]));
		
	});
}
