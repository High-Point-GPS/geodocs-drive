import React, { useEffect, useState } from 'react';
import DocumentTable from './components/DocumentTable';
import DocumentMobile from './components/DocumentMobile';

import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Grid, IconButton, Tooltip } from '@mui/material';

import DownloadButton from './components/DownloadButton';
import ViewButton from './components/ViewButton';
import EmailButton from './components/EmailButton';
import InfoCard from './components/InfoCard';

import GroupsIcon from '@mui/icons-material/Groups';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RvHookupIcon from '@mui/icons-material/RvHookup';
import RefreshIcon from '@mui/icons-material/Refresh';

import { isCompanyGroupLabel } from './utils/formatter';


const App = ({ database, session, server, groups, driver, device, trailer }) => {
	const [files, setFiles] = useState([]);
	const [mobile, setMobile] = useState(false);
	const [validationError, setValidationError] = useState(false);
	const [openError, setOpenError] = useState(false);
	const [errorText, setErrorText] = useState('');
	const [loading, setLoading] = useState(false);
	// Separate from `loading` so a manual refresh spins the button but keeps the list visible
	// (the full-page spinner is only for the initial load).
	const [refreshing, setRefreshing] = useState(false);

	const handleError = (error) => {
		setErrorText(error);
		setOpenError(true);
	}

	const fetchFiles = async (opts = {}) => {
		const isRefresh = opts.refresh === true;
		if (isRefresh) {
			setRefreshing(true);
		} else {
			setLoading(true);
		}

		const sessionInfo = {
			database: database,
			sessionId:  session.sessionId,
			userName: session.userName,
			server: server
		};

		const queryTags = [];

		if (device) {
			queryTags.push(device.id);
		}

		if (driver) {
			queryTags.push(driver.id);
		}

		if (trailer && trailer.length > 0) {
			trailer.forEach(t => {
				queryTags.push(t.id);
			});	
		}

		if (groups && groups.length > 0) {
			groups.forEach(g => {
				queryTags.push(g);
			});
		}

		const messageBody = {
			database: database,
			session: sessionInfo,
			tags: queryTags
		};

		try {

			const configResponse = await fetch('https://us-central1-geotabfiles.cloudfunctions.net/getDatabaseConfig',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify(messageBody)
			});

			const config = await configResponse.json();
	
			const driverCanSendEmail = Boolean(config?.driverCanSendEmail);

			const response = await fetch('https://us-central1-geotabfiles.cloudfunctions.net/fetchDriveFiles',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify(messageBody)
			});
			
			if (!response.ok) {
				const errorData = await response.json();

				if (errorData.valid === false) {
					  setValidationError(true);
				}

				console.error('Fetched Files failed: ', errorData.error ? errorData.error : '');
				return;
			}

			const data = await response.json();
			const fetchedFiles = Array.isArray(data?.files) ? data.files : [];
			const visibleFiles = fetchedFiles.filter((file) => file?.hideFromDriver !== true);


			const transformedFiles = [];

			visibleFiles.forEach(file => {
				if (file.fileName) {
					// {kind, label} entries so the table can show a matching icon per
					// association; deduped since tags can repeat.
					const associated = [];
					const seenAssociations = new Set();
					const addAssociated = (kind, label) => {
						const key = `${kind}|${label}`;
						if (label && !seenAssociations.has(key)) {
							seenAssociations.add(key);
							associated.push({ kind, label });
						}
					};
					const vehicleData = device && file.tags.includes(device.id)
						? {
							name: device?.name ?? null,
							vehicleIdentificationNumber: device?.vehicleIdentificationNumber ?? null,
							licensePlate: device?.licensePlate ?? null
						}
						: null;
					file.tags.forEach((tag) => {
						if (device && tag === device.id) {
							addAssociated('vehicle', `${device.name}`);
						} else if (driver && tag === driver.id) {
							addAssociated('driver', `${driver.firstName} ${driver.lastName}`);
						}

						trailer.forEach((t) => {
							if (t.id === tag) {
								addAssociated('trailer', t.name || t.id);
							}
						});

						groups.forEach((g) => {
							if (g === tag) {
								addAssociated('group', g);
							}
						});
					});

					// "Company Group" includes every other group — drop the redundant ones.
					const hasCompanyGroup = associated.some(
						(a) => a.kind === 'group' && isCompanyGroupLabel(a.label)
					);
					const associatedDisplay = hasCompanyGroup
						? associated.filter((a) => a.kind !== 'group' || isCompanyGroupLabel(a.label))
						: associated;

					transformedFiles.push({
						...file,
						associated: associatedDisplay,
						action: (
							<>
								<ViewButton
									filePath={file.path}
									fileName={file.fileName}
									database={database}
									session={session}
									server={server}
									driverCanSendEmail={driverCanSendEmail}
									driver={driver}
									vehicleData={vehicleData}
									onValidationError={() => setValidationError(true)}
									onError={handleError}
								/>
								{driverCanSendEmail && (
									<EmailButton
										filePath={file.path}
										fileName={file.fileName}
										database={database}
										session={session}
										server={server}
										driver={driver}
										vehicleData={vehicleData}
										onValidationError={() => setValidationError(true)}
										onError={handleError}
									/>
								)}
								{!config.restrictDownload && (
									<DownloadButton
										filePath={file.path}
										fileName={file.fileName}
										database={database}
										session={session}
										server={server}
										onValidationError={() => setValidationError(true)}
										onError={handleError}
									/>
								)}
							
							</>
						
						),
					});
				}
			});

				setFiles([...transformedFiles]);

			} catch (err) {
				console.error('Error', err);

			} finally {
				if (isRefresh) {
					setRefreshing(false);
				} else {
					setLoading(false);
				}
			}
	}


	useEffect(() => {
		fetchFiles();
	}, [])

	useEffect(() => {
		function updateSize() {
			setMobile(window.innerWidth < 1200);
		}
		window.addEventListener('resize', updateSize);
		updateSize();
		
		return () => window.removeEventListener('resize', updateSize);
	}, []);


	const getDeviceHeader = (device) => {
		return device ? [{id: device.id, name: device.name}] : [];
	}

	const getDriverHeader = (driver) => {
		return driver ? [{id: driver.id, name: `${driver.firstName} ${driver.lastName}`}] : [];
	}

	return (
		<Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f6f8fa', minHeight: '100vh', fontFamily: 'Inter, Roboto, sans-serif' }}>
			<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
				<Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 0 }}>
	                GeoDocs Portal
	            </Typography>
				<Tooltip title={refreshing ? 'Refreshing…' : 'Refresh'}>
					{/* Drive's own CSS stretches buttons full width, so the width is pinned
					    to fit-content to keep it sized to its label. */}
					<span style={{ marginLeft: 'auto', flex: '0 0 auto' }}>
						<Button
							onClick={() => fetchFiles({ refresh: true })}
							disabled={loading || refreshing}
							aria-label="Refresh documents"
							variant="outlined"
							startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon fontSize="small" />}
							sx={{
								width: 'fit-content',
								minWidth: 0,
								height: 40,
								px: 1.75,
								textTransform: 'none',
								fontWeight: 600,
								border: '1px solid #d0d7de',
								borderRadius: '10px',
								color: '#1f2937',
								bgcolor: '#fff',
								'&:hover': { borderColor: '#b6c0cc', bgcolor: '#f3f6f9' },
							}}
						>
							{refreshing ? 'Refreshing…' : 'Refresh'}
						</Button>
					</span>
				</Tooltip>
			</Box>
			 <Grid container spacing={{xs: 1, sm : 2}}>
                <InfoCard icon={<GroupsIcon />} title="Groups" subheader={groups.join(', ')} color={{ bg: '#e6f6e9', icon: '#2e7d32' }} />
                <InfoCard icon={<AirlineSeatReclineNormalIcon />} title="Driver" subheader={`${driver ? `${driver.firstName} ${driver.lastName}` : 'No Driver Selected'}`} color={{ bg: '#e3f2fd', icon: '#1565c0' }} />
                <InfoCard icon={<LocalShippingIcon />} title="Vehicle" subheader={`${device ? device.name : 'No Device Selected'}`} color={{ bg: '#fffde7', icon: '#f9a825' }} />
                <InfoCard icon={<RvHookupIcon />} title="Trailer(s)" subheader={trailer.map(t => t.name).join(', ')} color={{ bg: '#f3e5f5', icon: '#6a1b9a' }} />
            </Grid>
	
			{
				loading ? (
					<Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px'}}>
					<CircularProgress />
					</Box>
				) : (
					<>
						{mobile ? <DocumentMobile files={files} devices={getDeviceHeader(device)} drivers={getDriverHeader(driver)} trailers={trailer.map(t =>({id: t.id, name: t.name}))} groups={[...groups]}/> : <DocumentTable files={files}/>}
					</>
				)
			}

			<Dialog
				open={validationError}
				onClose={() => setValidationError(false)}
				aria-labelledby="validation-error-title"
				>
				<DialogTitle id="validation-error-title" sx={{fontSize: 24}}>Validation Error</DialogTitle>
				<DialogContent>
					<Typography variant='h6'>We can not validate your Geotab Session to this database, please re authenticate with geotab or contact support.</Typography>
				</DialogContent>
				<DialogActions>
					<Button variant="contained" onClick={() => setValidationError(false)}>
						OK
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog
				open={openError}
				onClose={() => setOpenError(false)}
				aria-labelledby="validation-error-title"
				>
				<DialogTitle id="validation-error-title" sx={{fontSize: 24}}>Error</DialogTitle>
				<DialogContent>
					<Typography variant='body1'>{errorText}</Typography>
				</DialogContent>
				<DialogActions>
					<Button variant="contained" onClick={() => setOpenError(false)}>
						OK
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default App;
