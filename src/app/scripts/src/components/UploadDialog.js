import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	ButtonBase,
	Checkbox,
	Chip,
	CircularProgress,
	Dialog,
	DialogContent,
	IconButton,
	LinearProgress,
	MenuItem,
	TextField,
	Typography,
	useMediaQuery,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import CheckIcon from '@mui/icons-material/Check';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import RvHookupIcon from '@mui/icons-material/RvHookup';

import {
	ACCEPTED_FILE_ACCEPT,
	MAX_UPLOAD_BYTES,
	MAX_UPLOAD_LABEL,
	fileToBase64,
	formatBytes,
	isAcceptedFile,
	isPdfFile,
	optimizeImage,
	postJsonWithProgress,
} from '../utils/upload';

const UPLOAD_URL = 'https://us-central1-geotabfiles.cloudfunctions.net/uploadDriveFile';

// One palette for the sheet. The asset colors are the ones the rest of the Drive
// app already uses for vehicle / driver / trailer.
const C = {
	ink: '#0f172a',
	muted: '#64748b',
	faint: '#94a3b8',
	line: '#e2e8f0',
	surface: '#f8fafc',
	primary: '#1976d2',
	primarySoft: '#eaf2fc',
	danger: '#b91c1c',
	success: '#15803d',
	vehicle: { fg: '#f59e0b', bg: '#fff7e0' },
	driver: { fg: '#1565c0', bg: '#e3f2fd' },
	trailer: { fg: '#6a1b9a', bg: '#f3e5f5' },
};

// More than this many document types and chips stop being quicker than a menu.
const MAX_TYPE_CHIPS = 8;
// The backend's MAX_DOCUMENT_TYPE_LENGTH.
const MAX_TYPE_LENGTH = 60;
// Sentinel for the "type your own" choice, kept out of any real type name.
const OTHER = '__geodocs_other__';

// Drive's page styles every `input` at 3rem / 1.5rem with !important (see app.css) and
// stretches buttons full width, which wrecks MUI fields inside the sheet. Undone here,
// scoped to the dialog. 16px is also the size below which iOS zooms on focus.
const driveCssReset = {
	'& input, & textarea': {
		height: 'auto !important',
		fontSize: '16px !important',
	},
	'& input[type="checkbox"]': { height: '100% !important' },
	'& .MuiButton-root, & .MuiButtonBase-root': { width: 'auto' },
};

const SectionLabel = ({ children, hint, error }) => (
	<Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1, gap: 1 }}>
		<Typography component="h3" sx={{ fontWeight: 700, fontSize: 15, color: C.ink }}>
			{children}
		</Typography>
		{hint && (
			<Typography sx={{ fontSize: 12.5, color: error ? C.danger : C.faint, fontWeight: error ? 600 : 400 }}>
				{hint}
			</Typography>
		)}
	</Box>
);

// A large tap target for starting the upload: the camera or the file picker.
const PickTile = ({ icon, title, subtitle, onClick, disabled }) => (
	<ButtonBase
		onClick={onClick}
		disabled={disabled}
		focusRipple
		sx={{
			flex: '1 1 0',
			minWidth: 0,
			width: 'auto',
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			gap: 1,
			py: 2.5,
			px: 1.5,
			borderRadius: '16px',
			border: `1.5px dashed ${C.line}`,
			bgcolor: C.surface,
			transition: 'border-color 120ms, background-color 120ms',
			'&:hover': { borderColor: C.primary, bgcolor: C.primarySoft },
			'&.Mui-focusVisible': { borderColor: C.primary, bgcolor: C.primarySoft },
		}}
	>
		<Box
			sx={{
				width: 52,
				height: 52,
				borderRadius: '50%',
				bgcolor: C.primarySoft,
				color: C.primary,
				display: 'grid',
				placeItems: 'center',
			}}
		>
			{icon}
		</Box>
		<Typography sx={{ fontWeight: 700, fontSize: 15.5, color: C.ink, lineHeight: 1.2 }}>{title}</Typography>
		<Typography sx={{ fontSize: 12.5, color: C.muted, lineHeight: 1.2 }}>{subtitle}</Typography>
	</ButtonBase>
);

// What was picked: a thumbnail (or a PDF badge), its name and size, and a way to swap it.
const FilePreview = ({ file, previewUrl, originalSize, optimizing, onReplace, onRemove, disabled }) => (
	<Box
		sx={{
			display: 'flex',
			alignItems: 'center',
			gap: 1.5,
			p: 1.25,
			borderRadius: '16px',
			border: `1px solid ${C.line}`,
			bgcolor: '#fff',
			boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
		}}
	>
		<Box
			sx={{
				width: 64,
				height: 64,
				flexShrink: 0,
				borderRadius: '12px',
				overflow: 'hidden',
				bgcolor: previewUrl ? C.surface : '#fdecea',
				color: '#c62828',
				display: 'grid',
				placeItems: 'center',
			}}
		>
			{previewUrl ? (
				<img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
			) : (
				<PictureAsPdfOutlinedIcon sx={{ fontSize: 32 }} />
			)}
		</Box>
		<Box sx={{ minWidth: 0, flex: 1 }}>
			<Typography
				sx={{ fontWeight: 600, fontSize: 15, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
			>
				{file.name}
			</Typography>
			<Typography sx={{ fontSize: 12.5, color: C.muted }}>
				{optimizing
					? 'Preparing…'
					: originalSize
						? `${formatBytes(file.size)} · optimized from ${formatBytes(originalSize)}`
						: formatBytes(file.size)}
			</Typography>
			<Button
				size="small"
				onClick={onReplace}
				disabled={disabled}
				sx={{ textTransform: 'none', fontWeight: 600, px: 0, minWidth: 0, mt: 0.25 }}
			>
				Replace
			</Button>
		</Box>
		<IconButton aria-label="Remove file" onClick={onRemove} disabled={disabled} sx={{ alignSelf: 'flex-start' }}>
			<CloseIcon fontSize="small" />
		</IconButton>
	</Box>
);

// One thing the document can be attached to, as a whole-row tap target.
const AttachRow = ({ icon, tone, label, name, checked, onChange, disabled }) => (
	<Box
		component="label"
		sx={{
			display: 'flex',
			alignItems: 'center',
			gap: 1.5,
			px: 1.5,
			py: 1,
			borderRadius: '14px',
			border: `1px solid ${checked ? '#bcd6f5' : C.line}`,
			bgcolor: checked ? C.primarySoft : '#fff',
			cursor: disabled ? 'default' : 'pointer',
			opacity: disabled && !checked ? 0.6 : 1,
			transition: 'background-color 120ms, border-color 120ms',
		}}
	>
		<Box
			sx={{
				width: 40,
				height: 40,
				flexShrink: 0,
				borderRadius: '12px',
				bgcolor: tone.bg,
				color: tone.fg,
				display: 'grid',
				placeItems: 'center',
			}}
		>
			{icon}
		</Box>
		<Box sx={{ minWidth: 0, flex: 1 }}>
			<Typography sx={{ fontSize: 12.5, color: C.muted, lineHeight: 1.3 }}>{label}</Typography>
			<Typography
				sx={{
					fontWeight: 600,
					fontSize: 15,
					color: disabled && !checked ? C.faint : C.ink,
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
				}}
			>
				{name}
			</Typography>
		</Box>
		<Checkbox
			checked={checked}
			onChange={(e) => onChange(e.target.checked)}
			disabled={disabled}
			inputProps={{ 'aria-label': `Attach to ${label.toLowerCase()} ${name}` }}
			sx={{ m: -0.5 }}
		/>
	</Box>
);

/**
 * Driver-side upload, laid out as a phone sheet: pick or shoot the document, say what
 * it is, and confirm what it belongs to. The vehicle, driver and trailers come from
 * the Drive app's own context and are pre-ticked — that is the right answer nearly
 * every time — but each can be unticked, because a driver's own paperwork is not the
 * truck's. The server re-checks whatever is submitted against the assets this session
 * can actually see.
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
	// The sheet fills a phone screen: no floating card to mis-tap outside of, and the
	// action button stays pinned in thumb reach.
	const fullScreen = useMediaQuery('(max-width:600px)');

	const [file, setFile] = useState(null);
	const [originalSize, setOriginalSize] = useState(null);
	const [optimizing, setOptimizing] = useState(false);
	const [previewUrl, setPreviewUrl] = useState('');
	const [documentType, setDocumentType] = useState('');
	// "Other": the driver types the type. Kept apart from documentType so tapping back
	// to a list chip does not lose what was typed.
	const [customMode, setCustomMode] = useState(false);
	const [customType, setCustomType] = useState('');
	const customInputRef = useRef(null);
	const [description, setDescription] = useState('');
	// Optional, and a native date input on purpose: it opens the phone's own date wheel,
	// costs no bundle (the Drive app has no date-picker dependency), and takes the
	// YYYY-MM-DD the backend already parses.
	const [expiryDate, setExpiryDate] = useState('');
	// null when idle; 0..1 while sending.
	const [progress, setProgress] = useState(null);
	const [error, setError] = useState('');
	// What was just added, for the confirmation screen.
	const [done, setDone] = useState(null);

	const uploading = progress !== null;

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

	const fileInputRef = useRef(null);
	const cameraInputRef = useRef(null);
	// Which picker produced the current file, so "Replace" reopens the same one.
	const lastPickerRef = useRef('file');
	// One attempt per time the dialog is opened. Without this, a lookup that comes back
	// empty or fails leaves the effect's guard conditions exactly as they started, and
	// the state change from finishing re-runs it — an unbounded retry loop against
	// Geotab for precisely the drivers whose list is empty or erroring.
	const vehiclesRequestedRef = useRef(false);
	// Guards against a slow optimize finishing after the driver already picked again.
	const pickSeqRef = useRef(0);

	// Only fetched when there is no trip vehicle and the dialog is actually open, so the
	// common case costs nothing.
	useEffect(() => {
		// Closing resets the attempt, so reopening retries after a failure.
		if (!open) {
			vehiclesRequestedRef.current = false;
			return;
		}
		if (device || !api) return;
		if (vehiclesRequestedRef.current) return;
		vehiclesRequestedRef.current = true;

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
	}, [open, device, api]);

	// Thumbnail for a picked photo. An object URL, released when the file changes.
	useEffect(() => {
		if (!file || isPdfFile(file)) {
			setPreviewUrl('');
			return undefined;
		}
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	const typeRequired = documentTypes.length > 0;
	const useTypeChips = documentTypes.length > 0 && documentTypes.length <= MAX_TYPE_CHIPS;
	const typedOwn = customMode || documentTypes.length === 0;
	const effectiveType = typedOwn ? customType.trim() : documentType;
	// Typing a name that is already on the list is that list entry — the server stores
	// it in the list's casing — so say so rather than look like a new type.
	const matchedListType =
		typedOwn && effectiveType
			? documentTypes.find((t) => t.trim().toLowerCase() === effectiveType.toLowerCase()) || null
			: null;

	const chooseType = (type) => {
		setCustomMode(false);
		setDocumentType(type);
	};
	const chooseOther = () => {
		setCustomMode(true);
		setDocumentType('');
		// After the field mounts.
		setTimeout(() => customInputRef.current && customInputRef.current.focus(), 0);
	};

	const reset = () => {
		pickSeqRef.current += 1;
		setFile(null);
		setOriginalSize(null);
		setOptimizing(false);
		setDocumentType('');
		setCustomMode(false);
		setCustomType('');
		setDescription('');
		setExpiryDate('');
		setError('');
		setProgress(null);
		setAttachVehicle(true);
		setAttachDriver(true);
		setAttachTrailers(true);
		setPickedVehicle(null);
	};

	const handleClose = () => {
		if (uploading) return;
		reset();
		setDone(null);
		onClose();
	};

	// A tap outside a desktop dialog should not throw away a photo the driver just took.
	const handleDialogClose = (event, reason) => {
		if (reason === 'backdropClick' && file && !done) return;
		handleClose();
	};

	const openPicker = (which) => {
		lastPickerRef.current = which;
		const input = which === 'camera' ? cameraInputRef.current : fileInputRef.current;
		if (input) input.click();
	};

	const handlePick = async (event) => {
		const picked = event.target.files && event.target.files[0];
		// Clear the input's value so picking the same file twice still fires onChange.
		event.target.value = '';
		if (!picked) return;
		if (!isAcceptedFile(picked)) {
			setError('You can add photos and PDF files only.');
			return;
		}
		setError('');

		const seq = ++pickSeqRef.current;
		setFile(picked);
		setOriginalSize(null);
		setOptimizing(true);
		const result = await optimizeImage(picked);
		if (seq !== pickSeqRef.current) return;
		setOptimizing(false);

		if (result.file.size > MAX_UPLOAD_BYTES) {
			setFile(null);
			setError(`That file is ${formatBytes(result.file.size)}. The limit is ${MAX_UPLOAD_LABEL}.`);
			return;
		}
		setFile(result.file);
		setOriginalSize(result.originalSize || null);
	};

	const attachedCount =
		(vehicleAttached && activeVehicle ? 1 : 0) +
		(attachDriver && driver ? 1 : 0) +
		(attachTrailers ? trailers.length : 0);

	// What still stands between the driver and Upload, in the order they would fix it.
	const missing = !file
		? 'Add a photo or file to continue'
		: typeRequired && !effectiveType
			? 'Choose what this document is'
			: attachedCount === 0
				? 'Attach it to at least one thing'
				: '';

	const canUpload = !missing && !uploading && !optimizing;

	const handleUpload = async () => {
		if (!canUpload) return;
		setProgress(0);
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

			const data = await postJsonWithProgress(
				UPLOAD_URL,
				{
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
					documentType: effectiveType || undefined,
					description: description.trim() || undefined,
					expiryDate: expiryDate || undefined,
					driverName: driver ? `${driver.firstName} ${driver.lastName}` : undefined,
				},
				(fraction) => setProgress(fraction)
			);

			setDone({
				fileName: data.fileName || file.name,
				documentType: matchedListType || effectiveType,
				attachedTo: [...ownerNames.vehicles, ...ownerNames.drivers, ...ownerNames.trailers],
			});
			reset();
			onUploaded(data);
		} catch (err) {
			console.error('Driver upload failed:', err);
			setError(err.message || 'Upload failed. Please try again.');
			setProgress(null);
		}
	};

	const addAnother = () => {
		setDone(null);
		reset();
	};

	const header = (
		<Box
			sx={{
				position: 'relative',
				px: 7,
				pt: fullScreen ? 'calc(env(safe-area-inset-top, 0px) + 14px)' : 2.25,
				pb: 1.5,
				textAlign: 'center',
				borderBottom: `1px solid ${C.line}`,
			}}
		>
			<Typography id="upload-dialog-title" component="h2" sx={{ fontWeight: 700, fontSize: 18, color: C.ink }}>
				{done ? 'Document added' : 'Add a document'}
			</Typography>
			<IconButton
				aria-label="Close"
				onClick={handleClose}
				disabled={uploading}
				sx={{ position: 'absolute', right: 8, bottom: 6, width: 'auto' }}
			>
				<CloseIcon />
			</IconButton>
		</Box>
	);

	const successView = done && (
		<DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 5, px: 3 }}>
			<CheckCircleRoundedIcon sx={{ fontSize: 72, color: C.success, mb: 1.5 }} />
			<Typography sx={{ fontWeight: 700, fontSize: 20, color: C.ink }}>Saved to GeoDocs</Typography>
			<Typography sx={{ fontSize: 15, color: C.muted, mt: 0.75, maxWidth: 320, wordBreak: 'break-word' }}>
				{done.documentType ? `${done.documentType} · ` : ''}
				{done.fileName}
			</Typography>
			{done.attachedTo.length > 0 && (
				<Typography sx={{ fontSize: 13.5, color: C.muted, mt: 0.5 }}>
					Attached to {done.attachedTo.join(', ')}
				</Typography>
			)}
			<Box sx={{ display: 'flex', gap: 1.5, mt: 4, width: '100%', maxWidth: 360 }}>
				<Button
					variant="outlined"
					onClick={addAnother}
					sx={{ flex: 1, width: 'auto', textTransform: 'none', fontWeight: 700, borderRadius: '12px', py: 1.25 }}
				>
					Add another
				</Button>
				<Button
					variant="contained"
					disableElevation
					onClick={handleClose}
					sx={{ flex: 1, width: 'auto', textTransform: 'none', fontWeight: 700, borderRadius: '12px', py: 1.25 }}
				>
					Done
				</Button>
			</Box>
		</DialogContent>
	);

	const formView = !done && (
		<>
			<DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, px: { xs: 2, sm: 3 }, py: 2.5 }}>
				{/* 1 — the document itself. Two tiles rather than one file field: on a
				    phone "Take photo" should open the camera directly, which is what
				    `capture` does. */}
				<Box component="section">
					<SectionLabel hint={file ? null : `Photo or PDF, up to ${MAX_UPLOAD_LABEL}`}>Document</SectionLabel>
					{file ? (
						<FilePreview
							file={file}
							previewUrl={previewUrl}
							originalSize={originalSize}
							optimizing={optimizing}
							onReplace={() => openPicker(lastPickerRef.current)}
							onRemove={() => {
								pickSeqRef.current += 1;
								setFile(null);
								setOriginalSize(null);
								setOptimizing(false);
							}}
							disabled={uploading}
						/>
					) : (
						<Box sx={{ display: 'flex', gap: 1.5 }}>
							<PickTile
								icon={<PhotoCameraOutlinedIcon />}
								title="Take photo"
								subtitle="Use the camera"
								onClick={() => openPicker('camera')}
								disabled={uploading}
							/>
							<PickTile
								icon={<UploadFileOutlinedIcon />}
								title="Choose file"
								subtitle="Photo or PDF"
								onClick={() => openPicker('file')}
								disabled={uploading}
							/>
						</Box>
					)}
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
				</Box>

				{/* 2 — what it is. Chips while the list is short: one tap, and every
				    choice visible at once. "Other" lets the driver type their own — the
				    paperwork in a cab does not always fit the office's list. */}
				<Box component="section">
					{/* Turns red once a file is in, when this is the next thing to do. */}
					<SectionLabel
						hint={typeRequired ? 'Required' : 'Optional'}
						error={typeRequired && !!file && !effectiveType}
					>
						What is this?
					</SectionLabel>
					{useTypeChips && (
						<Box role="radiogroup" aria-label="Document type" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
							{[...documentTypes, OTHER].map((type) => {
								const isOther = type === OTHER;
								const selected = isOther ? customMode : !customMode && documentType === type;
								return (
									<Chip
										key={type}
										data-doc-type={type}
										role="radio"
										aria-checked={selected}
										label={isOther ? 'Other…' : type}
										icon={selected ? <CheckIcon /> : isOther ? <EditOutlinedIcon /> : undefined}
										onClick={() => (isOther ? chooseOther() : chooseType(selected ? '' : type))}
										disabled={uploading}
										color={selected ? 'primary' : 'default'}
										variant={selected ? 'filled' : 'outlined'}
										sx={{
											height: 40,
											borderRadius: '20px',
											fontSize: 14.5,
											fontWeight: selected ? 700 : 500,
											px: 0.5,
											bgcolor: selected ? undefined : '#fff',
											borderColor: selected ? undefined : C.line,
											borderStyle: isOther && !selected ? 'dashed' : undefined,
										}}
									/>
								);
							})}
						</Box>
					)}
					{documentTypes.length > MAX_TYPE_CHIPS && (
						<TextField
							select
							value={customMode ? OTHER : documentType}
							onChange={(e) => (e.target.value === OTHER ? chooseOther() : chooseType(e.target.value))}
							fullWidth
							disabled={uploading}
							error={!!file && !effectiveType}
							SelectProps={{ displayEmpty: true }}
						>
							<MenuItem value="" disabled>
								Choose a type…
							</MenuItem>
							{documentTypes.map((type) => (
								<MenuItem key={type} value={type}>
									{type}
								</MenuItem>
							))}
							<MenuItem value={OTHER}>Other — type your own…</MenuItem>
						</TextField>
					)}
					{/* With no list from the fleet, the type is simply typed. */}
					{(customMode || documentTypes.length === 0) && (
						<TextField
							inputRef={customInputRef}
							value={customType}
							onChange={(e) => setCustomType(e.target.value)}
							placeholder={documentTypes.length ? 'Type what this document is' : 'e.g. Weigh ticket, Lumper receipt'}
							fullWidth
							disabled={uploading}
							error={typeRequired && !!file && !effectiveType}
							inputProps={{ maxLength: MAX_TYPE_LENGTH, 'aria-label': 'Document type' }}
							sx={{ mt: documentTypes.length ? 1.25 : 0 }}
							helperText={
								matchedListType
									? `Saved as "${matchedListType}"`
									: customType.length > MAX_TYPE_LENGTH - 10
										? `${MAX_TYPE_LENGTH - customType.length} characters left`
										: undefined
							}
						/>
					)}
				</Box>

				{/* 3 — details, both optional. */}
				<Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
					<SectionLabel hint="Optional">Details</SectionLabel>
					<Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
						<TextField
							label="Expires on"
							type="date"
							value={expiryDate}
							onChange={(e) => setExpiryDate(e.target.value)}
							fullWidth
							disabled={uploading}
							// type="date" renders its own placeholder, so the label must not sit on top of it.
							InputLabelProps={{ shrink: true }}
							helperText={
								expiryDate
									? 'Reminder emails go out before this date.'
									: 'For a permit or inspection that runs out.'
							}
						/>
						{/* iOS's date wheel has no way to empty the field again. */}
						{expiryDate && (
							<Button
								onClick={() => setExpiryDate('')}
								disabled={uploading}
								sx={{ textTransform: 'none', fontWeight: 600, mt: 1, flexShrink: 0, width: 'auto' }}
							>
								Clear
							</Button>
						)}
					</Box>
					<TextField
						label="Notes"
						placeholder="Anything the office should know"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						fullWidth
						multiline
						minRows={2}
						disabled={uploading}
						inputProps={{ maxLength: 500 }}
						helperText={description.length > 400 ? `${500 - description.length} characters left` : undefined}
					/>
				</Box>

				{/* 4 — what it belongs to. */}
				<Box component="section">
					<SectionLabel
						hint={attachedCount === 0 ? 'Pick at least one' : null}
						error={attachedCount === 0}
					>
						Attach to
					</SectionLabel>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
						{/* On a trip the vehicle is shown, not chosen — it is whichever one the
						    Drive app is on, so a document cannot be filed against the wrong
						    truck by a mis-tap. The tickbox only says whether to attach it. */}
						{!mustPickVehicle && (
							<AttachRow
								icon={<LocalShippingIcon />}
								tone={C.vehicle}
								label="Vehicle"
								name={device.name}
								checked={attachVehicle}
								onChange={setAttachVehicle}
								disabled={uploading}
							/>
						)}
						{/* Not on a trip: no vehicle to show, so the driver names one. */}
						{mustPickVehicle && (
							<Box
								sx={{
									display: 'flex',
									alignItems: 'flex-start',
									gap: 1.5,
									px: 1.5,
									py: 1.25,
									borderRadius: '14px',
									border: `1px solid ${pickedVehicle ? '#bcd6f5' : C.line}`,
									bgcolor: pickedVehicle ? C.primarySoft : '#fff',
								}}
							>
								<Box
									sx={{
										width: 40,
										height: 40,
										flexShrink: 0,
										borderRadius: '12px',
										bgcolor: C.vehicle.bg,
										color: C.vehicle.fg,
										display: 'grid',
										placeItems: 'center',
									}}
								>
									<LocalShippingIcon />
								</Box>
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography sx={{ fontSize: 12.5, color: C.muted, lineHeight: 1.3, mb: 0.75 }}>
										Vehicle — you are not on a trip
									</Typography>
									<Autocomplete
										options={vehicleOptions}
										value={pickedVehicle}
										onChange={(_, v) => setPickedVehicle(v)}
										getOptionLabel={(o) => (o && o.name) || ''}
										isOptionEqualToValue={(o, v) => o.id === v.id}
										loading={vehiclesLoading}
										disabled={uploading || vehiclesFailed}
										size="small"
										noOptionsText={vehiclesLoading ? 'Loading…' : 'No vehicles available to you'}
										renderInput={(params) => (
											<TextField
												{...params}
												placeholder="Search vehicles…"
												helperText={
													vehiclesFailed
														? 'Could not load vehicles. Attach it to yourself instead.'
														: 'Optional — leave empty to attach it to yourself only.'
												}
												error={vehiclesFailed}
												sx={{ bgcolor: '#fff' }}
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
							</Box>
						)}
						<AttachRow
							icon={<AirlineSeatReclineNormalIcon />}
							tone={C.driver}
							label="Driver"
							name={driver ? `${driver.firstName} ${driver.lastName}` : 'No driver signed in'}
							checked={attachDriver && !!driver}
							onChange={setAttachDriver}
							disabled={!driver || uploading}
						/>
						{trailers.length > 0 && (
							<AttachRow
								icon={<RvHookupIcon />}
								tone={C.trailer}
								label={trailers.length === 1 ? 'Trailer' : 'Trailers'}
								name={trailers.map((t) => t.name).join(', ')}
								checked={attachTrailers}
								onChange={setAttachTrailers}
								disabled={uploading}
							/>
						)}
					</Box>
				</Box>
			</DialogContent>

			{/* Pinned action bar: what is missing, or how far the upload has got. */}
			<Box
				sx={{
					borderTop: `1px solid ${C.line}`,
					bgcolor: '#fff',
					px: { xs: 2, sm: 3 },
					pt: 1.5,
					pb: fullScreen ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)' : 2,
				}}
			>
				{error && (
					<Alert severity="error" sx={{ mb: 1.5, borderRadius: '12px', fontSize: 14 }}>
						{error}
					</Alert>
				)}
				{uploading ? (
					<Box sx={{ mb: 1.25 }}>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
							<Typography sx={{ fontSize: 13.5, color: C.ink, fontWeight: 600 }}>
								{progress < 1 ? 'Uploading…' : 'Saving…'}
							</Typography>
							<Typography sx={{ fontSize: 13.5, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
								{Math.round(progress * 100)}%
							</Typography>
						</Box>
						<LinearProgress
							variant={progress < 1 ? 'determinate' : 'indeterminate'}
							value={progress * 100}
							sx={{ height: 6, borderRadius: 3 }}
						/>
					</Box>
				) : (
					missing && (
						<Typography sx={{ fontSize: 13.5, color: C.muted, textAlign: 'center', mb: 1.25 }}>
							{missing}
						</Typography>
					)
				)}
				<Box sx={{ display: 'flex', gap: 1.5 }}>
					{!fullScreen && (
						<Button
							onClick={handleClose}
							disabled={uploading}
							sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '12px', width: 'auto', px: 2.5 }}
						>
							Cancel
						</Button>
					)}
					<Button
						variant="contained"
						disableElevation
						onClick={handleUpload}
						disabled={!canUpload}
						sx={{
							flex: 1,
							width: 'auto',
							textTransform: 'none',
							fontWeight: 700,
							fontSize: 16,
							borderRadius: '12px',
							py: 1.4,
						}}
					>
						{uploading ? 'Uploading…' : optimizing ? 'Preparing…' : 'Upload document'}
					</Button>
				</Box>
			</Box>
		</>
	);

	return (
		<Dialog
			open={open}
			onClose={handleDialogClose}
			fullWidth
			maxWidth="sm"
			fullScreen={fullScreen}
			scroll="paper"
			aria-labelledby="upload-dialog-title"
			// The dialog mounts straight under <body>, where a host page's `body > div`
			// margin (the dev harness has one) would inset a full-screen sheet.
			sx={{ m: 0 }}
			PaperProps={{ sx: { borderRadius: fullScreen ? 0 : '20px', bgcolor: '#fff', ...driveCssReset } }}
		>
			{header}
			{done ? successView : formView}
		</Dialog>
	);
};

export default UploadDialog;
