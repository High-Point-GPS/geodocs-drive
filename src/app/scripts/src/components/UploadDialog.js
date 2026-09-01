import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	Autocomplete,
	Box,
	Button,
	Checkbox,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	IconButton,
	MenuItem,
	TextField,
	Typography,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import RvHookupIcon from '@mui/icons-material/RvHookup';

// Photos and PDFs only — narrower than the web app, and matched by the backend's
// isAcceptedDriveFileType. `image/*` covers whatever the phone calls the picture
// (iOS HEIC included); the explicit extensions are there because some Android pickers
// filter on those instead, and because listing `application/pdf` is what makes a phone
// offer the Files browser rather than only the camera roll.
const ACCEPTED_FILE_ACCEPT = [
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

const isAcceptedFile = (file) => {
	const ext = String(file.name).split('.').pop().toLowerCase();
	const isPdf = ext === 'pdf';
	if (!isPdf && !ACCEPTED_IMAGE_EXTENSIONS.includes(ext)) return false;

	// A phone often reports no MIME (or a generic one) for HEIC; the extension decides.
	const mime = String(file.type || '').toLowerCase().split(';')[0].trim();
	if (!mime || mime === 'application/octet-stream') return true;
	if (mime === 'application/pdf') return isPdf;
	if (mime.startsWith('image/') && mime !== 'image/svg+xml') return !isPdf;
	return false;
};

// Matches the backend's MAX_UPLOAD_BYTES, so an oversized file is refused on the phone
// instead of after a slow base64 upload over a cellular connection.
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const fileToBase64 = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error('Could not read that file.'));
		reader.onload = () => resolve(String(reader.result).split(',')[1]);
		reader.readAsDataURL(file);
	});

const formatBytes = (bytes) => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Driver-side upload. The vehicle, driver and trailers come from the Drive app's own
 * context and are pre-ticked — that is the right answer nearly every time — but each can
 * be unticked, because a driver's own paperwork is not the truck's. The server re-checks
 * whatever is submitted against the assets this session can actually see.
 */
const UploadDialog = ({
	open,
	onClose,
	onUploaded,
	database,
	session,
	server,
	documentTypes = [],
	api,
	driver,
	device,
	trailer = [],
}) => {
	const [file, setFile] = useState(null);
	const [documentType, setDocumentType] = useState('');
	const [description, setDescription] = useState('');
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState('');

	// The Drive app's trailer list has come back both as Trailer objects and as
	// single-element arrays of them depending on the multiCall shape; flatten either.
	const trailers = useMemo(
		() => (Array.isArray(trailer) ? trailer.flat().filter((t) => t && t.id) : []),
		[trailer]
	);

	const [attachVehicle, setAttachVehicle] = useState(true);
	const [attachDriver, setAttachDriver] = useState(true);
	const [attachTrailers, setAttachTrailers] = useState(true);

	// The vehicle is whichever one the Drive app is on — it is shown, not chosen, so a
	// document cannot be filed against the wrong truck by a mis-tap. Only when the app
	// reports no vehicle (the driver is logged in without one) does a picker appear.
	const [pickedVehicle, setPickedVehicle] = useState(null);
	const [vehicleOptions, setVehicleOptions] = useState([]);
	const [vehiclesLoading, setVehiclesLoading] = useState(false);
	const [vehiclesFailed, setVehiclesFailed] = useState(false);

	// The vehicle actually being attached: the trip's, else whatever was picked. Off a
	// trip there is no separate tickbox — picking a vehicle is the decision to attach it,
	// and clearing the field is the decision not to.
	const activeVehicle = device || pickedVehicle;
	const mustPickVehicle = !device;
	const vehicleAttached = device ? attachVehicle : !!pickedVehicle;

	// Only fetched when there is no trip vehicle and the dialog is actually open, so the
	// common case costs nothing.
	useEffect(() => {
		if (!open || device || !api) return;
		if (vehicleOptions.length || vehiclesLoading) return;

		setVehiclesLoading(true);
		setVehiclesFailed(false);
		api.call(
			'Get',
			{ typeName: 'Device', search: { fromDate: new Date().toISOString() } },
			(result) => {
				const list = (Array.isArray(result) ? result : [])
					.filter((d) => d && d.id && d.name)
					.map((d) => ({ id: d.id, name: d.name }))
					.sort((a, b) => a.name.localeCompare(b.name));
				setVehicleOptions(list);
				setVehiclesLoading(false);
			},
			(err) => {
				console.error('Could not load vehicles:', err);
				setVehiclesFailed(true);
				setVehiclesLoading(false);
			}
		);
	}, [open, device, api, vehicleOptions.length, vehiclesLoading]);

	const fileInputRef = useRef(null);
	const cameraInputRef = useRef(null);

	const typeRequired = documentTypes.length > 0;

	const reset = () => {
		setFile(null);
		setDocumentType('');
		setDescription('');
		setError('');
		setAttachVehicle(true);
		setAttachDriver(true);
		setAttachTrailers(true);
		setPickedVehicle(null);
	};

	const handleClose = () => {
		if (uploading) return;
		reset();
		onClose();
	};

	const handlePick = (event) => {
		const picked = event.target.files && event.target.files[0];
		// Clear the input's value so picking the same file twice still fires onChange.
		event.target.value = '';
		if (!picked) return;
		if (!isAcceptedFile(picked)) {
			setError('You can upload photos and PDF files only.');
			return;
		}
		if (picked.size > MAX_UPLOAD_BYTES) {
			setError(`That file is ${formatBytes(picked.size)}. The limit is 25 MB.`);
			return;
		}
		setError('');
		setFile(picked);
	};

	const attachedCount =
		(vehicleAttached && activeVehicle ? 1 : 0) +
		(attachDriver && driver ? 1 : 0) +
		(attachTrailers ? trailers.length : 0);

	const canUpload = !!file && attachedCount > 0 && (!typeRequired || !!documentType) && !uploading;

	const handleUpload = async () => {
		if (!canUpload) return;
		setUploading(true);
		setError('');

		try {
			const owners = { vehicles: [], drivers: [], trailers: [], groups: [] };
			if (vehicleAttached && activeVehicle) owners.vehicles.push(activeVehicle.id);
			if (attachDriver && driver) owners.drivers.push(driver.id);
			if (attachTrailers) trailers.forEach((t) => owners.trailers.push(t.id));

			// Display names stored alongside the ids, so the web app and the expiry email
			// can show them without resolving anything through Geotab.
			const ownerNames = {
				vehicles: vehicleAttached && activeVehicle ? [activeVehicle.name] : [],
				drivers: attachDriver && driver ? [`${driver.firstName} ${driver.lastName}`] : [],
				trailers: attachTrailers ? trailers.map((t) => t.name) : [],
				groups: [],
			};

			const tags = [...owners.vehicles, ...owners.drivers, ...owners.trailers];

			const base64 = await fileToBase64(file);

			const response = await fetch(
				'https://us-central1-geotabfiles.cloudfunctions.net/uploadDriveFile',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
					body: JSON.stringify({
						session: {
							database,
							sessionId: session.sessionId,
							userName: session.userName,
							server,
						},
						fileName: file.name,
						fileData: base64,
						contentType: file.type,
						owners,
						ownerNames,
						tags,
						documentType: documentType || undefined,
						description: description || undefined,
						driverName: driver ? `${driver.firstName} ${driver.lastName}` : undefined,
					}),
				}
			);

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(data.error || data.message || 'Upload failed. Please try again.');
			}

			reset();
			onUploaded(data);
		} catch (err) {
			console.error('Driver upload failed:', err);
			setError(err.message || 'Upload failed. Please try again.');
		} finally {
			setUploading(false);
		}
	};

	const attachRow = (icon, label, name, checked, onChange, disabled) => (
		<FormControlLabel
			sx={{ ml: 0, width: '100%' }}
			disabled={disabled}
			control={<Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />}
			label={
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
					{icon}
					<Box sx={{ minWidth: 0 }}>
						<Typography sx={{ fontSize: 13, color: '#64748b', lineHeight: 1.2 }}>{label}</Typography>
						<Typography
							sx={{
								fontWeight: 600,
								color: disabled ? '#94a3b8' : '#1f2937',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{name}
						</Typography>
					</Box>
				</Box>
			}
		/>
	);

	return (
		<Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" scroll="paper">
			<DialogTitle
				component="div"
				sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pb: 1 }}
			>
				<Typography component="h2" sx={{ fontWeight: 700, fontSize: 20 }}>
					Add a document
				</Typography>
				<IconButton aria-label="close" onClick={handleClose} disabled={uploading}>
					<CloseIcon />
				</IconButton>
			</DialogTitle>

			<DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
				{/* Two explicit buttons rather than one file field: on a phone "Take photo"
				    should open the camera directly, which is what `capture` does. */}
				<Box sx={{ display: 'flex', gap: 1 }}>
					<Button
						fullWidth
						variant="outlined"
						startIcon={<PhotoCameraOutlinedIcon />}
						onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
						disabled={uploading}
						sx={{ textTransform: 'none', fontWeight: 600, py: 1.25, borderRadius: '10px' }}
					>
						Take photo
					</Button>
					<Button
						fullWidth
						variant="outlined"
						startIcon={<AttachFileOutlinedIcon />}
						onClick={() => fileInputRef.current && fileInputRef.current.click()}
						disabled={uploading}
						sx={{ textTransform: 'none', fontWeight: 600, py: 1.25, borderRadius: '10px' }}
					>
						Choose file
					</Button>
				</Box>
				<input
					ref={cameraInputRef}
					type="file"
					accept="image/*"
					capture="environment"
					onChange={handlePick}
					style={{ display: 'none' }}
				/>
				<input
					ref={fileInputRef}
					type="file"
					accept={ACCEPTED_FILE_ACCEPT}
					onChange={handlePick}
					style={{ display: 'none' }}
				/>

				{file ? (
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: 1,
							border: '1px solid #bfdbfe',
							bgcolor: '#eff6ff',
							borderRadius: '10px',
							px: 1.5,
							py: 1,
						}}
					>
						<Box sx={{ minWidth: 0 }}>
							<Typography
								sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
							>
								{file.name}
							</Typography>
							<Typography sx={{ fontSize: 12, color: '#64748b' }}>{formatBytes(file.size)}</Typography>
						</Box>
						<Button
							size="small"
							onClick={() => setFile(null)}
							disabled={uploading}
							sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
						>
							Remove
						</Button>
					</Box>
				) : (
					<Typography sx={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>
						Photos and PDF files, up to 25 MB.
					</Typography>
				)}

				{documentTypes.length > 0 && (
					<TextField
						select
						label="What is this?"
						value={documentType}
						onChange={(e) => setDocumentType(e.target.value)}
						fullWidth
						disabled={uploading}
						helperText={typeRequired && !documentType ? 'Required' : ' '}
						error={typeRequired && !documentType && !!error}
					>
						{documentTypes.map((type) => (
							<MenuItem key={type} value={type}>
								{type}
							</MenuItem>
						))}
					</TextField>
				)}

				<TextField
					label="Notes (optional)"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					fullWidth
					multiline
					minRows={2}
					disabled={uploading}
					inputProps={{ maxLength: 500 }}
				/>

				<Box>
					<Typography sx={{ fontWeight: 700, fontSize: 14, color: '#334155', mb: 0.5 }}>
						Attach to
					</Typography>
					<Box sx={{ display: 'flex', flexDirection: 'column' }}>
						{/* On a trip the vehicle is shown, not chosen — it is whichever one the
						    Drive app is on, so a document cannot be filed against the wrong
						    truck by a mis-tap. The tickbox only says whether to attach it. */}
						{!mustPickVehicle &&
							attachRow(
								<LocalShippingIcon sx={{ color: '#f9a825' }} />,
								'Vehicle',
								device.name,
								attachVehicle,
								setAttachVehicle,
								uploading
							)}
						{/* Not on a trip: no vehicle to show, so the driver names one. */}
						{mustPickVehicle && (
							<Box sx={{ pb: 1.5, pt: 0.5 }}>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
									<LocalShippingIcon sx={{ color: '#f9a825' }} />
									<Typography sx={{ fontSize: 13, color: '#64748b' }}>
										Vehicle — you are not on a trip
									</Typography>
								</Box>
								<Autocomplete
									options={vehicleOptions}
									value={pickedVehicle}
									onChange={(_, v) => setPickedVehicle(v)}
									getOptionLabel={(o) => (o && o.name) || ''}
									isOptionEqualToValue={(o, v) => o.id === v.id}
									loading={vehiclesLoading}
									disabled={uploading || vehiclesFailed}
									size="small"
									noOptionsText={vehiclesLoading ? 'Loading…' : 'No vehicles found'}
									renderInput={(params) => (
										<TextField
											{...params}
											label="Which vehicle?"
											placeholder="Search vehicles…"
											helperText={
												vehiclesFailed
													? 'Could not load vehicles. Attach to yourself instead.'
													: 'Optional — leave empty to attach this to yourself only.'
											}
											error={vehiclesFailed}
											InputProps={{
												...params.InputProps,
												endAdornment: (
													<>
														{vehiclesLoading ? <CircularProgress size={16} /> : null}
														{params.InputProps.endAdornment}
													</>
												),
											}}
										/>
									)}
								/>
							</Box>
						)}
						{attachRow(
							<AirlineSeatReclineNormalIcon sx={{ color: '#1565c0' }} />,
							'Driver',
							driver ? `${driver.firstName} ${driver.lastName}` : 'No driver selected',
							attachDriver && !!driver,
							setAttachDriver,
							!driver || uploading
						)}
						{attachRow(
							<RvHookupIcon sx={{ color: '#6a1b9a' }} />,
							trailers.length === 1 ? 'Trailer' : 'Trailers',
							trailers.length ? trailers.map((t) => t.name).join(', ') : 'No trailer attached',
							attachTrailers && trailers.length > 0,
							setAttachTrailers,
							trailers.length === 0 || uploading
						)}
					</Box>
					{attachedCount === 0 && (
						<Typography sx={{ fontSize: 13, color: '#b91c1c', mt: 0.5 }}>
							Pick at least one thing to attach this document to.
						</Typography>
					)}
				</Box>

				{error && (
					<Typography sx={{ fontSize: 13.5, color: '#b91c1c', fontWeight: 600 }}>{error}</Typography>
				)}
			</DialogContent>

			<DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
				<Button onClick={handleClose} disabled={uploading} sx={{ textTransform: 'none', fontWeight: 600 }}>
					Cancel
				</Button>
				<Button
					variant="contained"
					onClick={handleUpload}
					disabled={!canUpload}
					startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
					sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', px: 3 }}
				>
					{uploading ? 'Uploading…' : 'Upload'}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default UploadDialog;
