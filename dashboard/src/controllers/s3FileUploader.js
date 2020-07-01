import call from './call';

export default class S3FileUploader {
	constructor() {
		this.listeners = {};
	}

	on(event, handler) {
		this.listeners[event] = this.listeners[event] || [];
		this.listeners[event].push(handler);
	}

	trigger(event, data) {
		let handlers = this.listeners[event] || [];
		handlers.forEach(handler => {
			handler.call(this, data);
		});
	}

	upload(file, options) {
		return new Promise(async (resolve, reject) => {
			async function getUploadLink() {
				let response = await fetch(`/api/method/press.api.site.get_upload_link?file=${file.name}`);
				let data = await response.json();
				return data.message;
			}
			const upload_link = await getUploadLink();

			let xhr = new XMLHttpRequest();
			xhr.upload.addEventListener('loadstart', () => {
				this.trigger('start');
			});
			xhr.upload.addEventListener('progress', e => {
				if (e.lengthComputable) {
					this.trigger('progress', {
						uploaded: e.loaded,
						total: e.total
					});
				}
			});
			xhr.upload.addEventListener('load', () => {
				this.trigger('finish');
			});
			xhr.addEventListener('error', () => {
				this.trigger('error');
				reject();
			});
			xhr.onreadystatechange = () => {
				if (xhr.readyState == XMLHttpRequest.DONE) {
					let error;
					if (xhr.status === 200 || xhr.status === 204) {
						let r = null;
						try {
							r = JSON.parse(xhr.responseText);
						} catch (e) {
							r = xhr.responseText;
						}
						let out = r.message || call("press.api.site.uploaded_backup_info", {
							"file": file.name,
							"type": file.type,
							"size": file.size
						});
						resolve(out || upload_link.fields.key);
					} else if (xhr.status === 403) {
						error = JSON.parse(xhr.responseText);
					} else {
						this.failed = true;
						try {
							error = JSON.parse(xhr.responseText);
						} catch (e) {
							// pass
						}
					}
					if (error && error.exc) {
						console.error(JSON.parse(error.exc)[0]);
					}
					reject(error);
				}
			};

			xhr.open('POST', upload_link.url, true);
			xhr.setRequestHeader('Accept', 'application/json');

			let form_data = new FormData();
			for (let key in upload_link.fields) {
				if (upload_link.fields.hasOwnProperty(key)) {
					form_data.append(key, upload_link.fields[key]);
				}
			}
			if (file) {
				form_data.append('file', file, file.name);
			}

			xhr.send(form_data);
		});
	}
}
