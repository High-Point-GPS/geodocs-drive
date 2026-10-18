// File handling for the driver upload: what may be picked, shrinking camera photos
// before they go over a cellular link, and the upload itself with progress.

// Photos and PDFs only — narrower than the web app, and matched by the backend's
// isAcceptedDriveFileType. `image/*` covers whatever the phone calls the picture
// (iOS HEIC included); the explicit extensions are there because some Android pickers
// filter on those instead, and because listing `application/pdf` is what makes a phone
// offer the Files browser rather than only the camera roll.
export const ACCEPTED_FILE_ACCEPT = [
	'image/*',
	'application/pdf',
	'.pdf',
	'.jpg', '.jpeg', '.jpe', '.jfif', '.png', '.gif', '.webp',
	'.heic', '.heif', '.hif', '.avif', '.bmp', '.tif', '.tiff',
].join(',');

// Same rule as the backend, so a wrong file is refused here rather than after a slow
// upload. SVG is excluded there (it is scriptable markup) so it is excluded here too.
const ACCEPTED_IMAGE_EXTENSIONS = [
	'jpg', 'jpeg', 'jpe', 'jfif', 'pjpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'heics',
	'heifs', 'hif', 'avif', 'bmp', 'dib', 'tif', 'tiff', 'jp2', 'j2k', 'jpf', 'jpx',
];

const extensionOf = (name) => String(name).split('.').pop().toLowerCase();

export const isPdfFile = (file) => extensionOf(file.name) === 'pdf';

export const isAcceptedFile = (file) => {
	const ext = extensionOf(file.name);
	const isPdf = ext === 'pdf';
	if (!isPdf && !ACCEPTED_IMAGE_EXTENSIONS.includes(ext)) return false;

	// A phone often reports no MIME (or a generic one) for HEIC; the extension decides.
	const mime = String(file.type || '').toLowerCase().split(';')[0].trim();
	if (!mime || mime === 'application/octet-stream') return true;
	if (mime === 'application/pdf') return isPdf;
	if (mime.startsWith('image/') && mime !== 'image/svg+xml') return !isPdf;
	return false;
};

// The backend accepts 25 MB of file, but the file travels as base64 inside JSON, which
// is a third bigger, and Cloud Functions refuse a request over 32 MB — so a 25 MB file
// can never actually arrive. 20 MB leaves room for the encoding and the rest of the body.
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = '20 MB';

export const formatBytes = (bytes) => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Long edge for an uploaded photo. A phone camera shoots 4000px and more; 2560 still
// reads the small print on a bill of lading, at a fraction of the bytes.
const MAX_IMAGE_EDGE = 2560;
const JPEG_QUALITY = 0.85;
// Below this a photo is sent as it is: already quick, not worth re-encoding.
const OPTIMIZE_ABOVE_BYTES = 1.5 * 1024 * 1024;
const HEIC_EXTENSIONS = ['heic', 'heif', 'heics', 'heifs', 'hif'];

const loadImage = (file) =>
	new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => resolve({ img, url });
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('undecodable'));
		};
		img.src = url;
	});

/**
 * A camera photo made fit to send: scaled to MAX_IMAGE_EDGE and re-encoded as JPEG.
 * HEIC is converted whenever this browser can decode it (iOS can), because the web
 * app's viewers cannot show HEIC at all. Anything that fails — an image this browser
 * cannot decode, a canvas that will not encode — falls back to the original file, so
 * this can only ever make an upload smaller, never break it.
 *
 * Returns { file, originalSize } — originalSize is set only when the file changed.
 */
export async function optimizeImage(file) {
	if (isPdfFile(file)) return { file };
	const ext = extensionOf(file.name);
	const isHeic = HEIC_EXTENSIONS.includes(ext);
	// GIFs may be animated; re-encoding would keep one frame.
	if (ext === 'gif' || (!isHeic && file.size <= OPTIMIZE_ABOVE_BYTES)) return { file };

	let loaded;
	try {
		loaded = await loadImage(file);
	} catch (e) {
		return { file };
	}
	const { img, url } = loaded;
	try {
		const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
		const width = Math.max(1, Math.round(img.naturalWidth * scale));
		const height = Math.max(1, Math.round(img.naturalHeight * scale));
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		// JPEG has no transparency; a transparent PNG would otherwise turn black.
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, width, height);
		// Browsers apply the photo's EXIF orientation when drawing an <img>, so a
		// portrait shot stays upright.
		ctx.drawImage(img, 0, 0, width, height);
		const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
		if (!blob) return { file };
		// Keep the original when re-encoding did not help — unless it is HEIC, which
		// is converted for the sake of being viewable at all.
		if (!isHeic && blob.size >= file.size) return { file };
		const name = String(file.name).replace(/\.[^.]+$/, '') + '.jpg';
		return {
			file: new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }),
			originalSize: file.size,
		};
	} catch (e) {
		return { file };
	} finally {
		URL.revokeObjectURL(url);
	}
}

export const fileToBase64 = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error('Could not read that file.'));
		reader.onload = () => resolve(String(reader.result).split(',')[1]);
		reader.readAsDataURL(file);
	});

/**
 * POSTs JSON with upload progress — fetch cannot report how much has been sent, and
 * on a cellular link a driver needs to see that something is happening.
 * Resolves with the parsed response; rejects with an Error carrying the server's message.
 */
export const postJsonWithProgress = (url, body, onProgress) =>
	new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', url);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.setRequestHeader('Accept', 'application/json');
		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
		};
		xhr.onload = () => {
			let data = {};
			try {
				data = JSON.parse(xhr.responseText || '{}');
			} catch (e) {
				data = {};
			}
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve(data);
			} else if (xhr.status === 413) {
				reject(new Error(`That file is too large to send. The limit is ${MAX_UPLOAD_LABEL}.`));
			} else {
				reject(new Error(data.error || data.message || 'Upload failed. Please try again.'));
			}
		};
		xhr.onerror = () =>
			reject(new Error('No connection. Check your signal and try again — nothing was lost.'));
		xhr.ontimeout = xhr.onerror;
		xhr.send(JSON.stringify(body));
	});
