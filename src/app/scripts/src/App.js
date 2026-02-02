import React, { useEffect, useState } from 'react';
import DocumentTable from './components/DocumentTable';
import DocumentMobile from './components/DocumentMobile';

import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Grid } from '@mui/material';

import DownloadButton from './components/DownloadButton';
import ViewButton from './components/ViewButton';
import InfoCard from './components/InfoCard';

import GroupsIcon from '@mui/icons-material/Groups';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RvHookupIcon from '@mui/icons-material/RvHookup';


const App = ({ database, session, server, groups, driver, device, trailer }) => {
	const [files, setFiles] = useState([]);
	const [mobile, setMobile] = useState(false);
	const [validationError, setValidationError] = useState(false);
	const [openError, setOpenError] = useState(false);
	const [errorText, setErrorText] = useState('');
	const [loading, setLoading] = useState(false);
	
	const handleError = (error) => {
		setErrorText(error);
		setOpenError(true);
	}

	const fetchFiles = async() => {
		setLoading(true);

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
				setLoading(false);
				return;
			}

			const data = await response.json();
			const fetchedFiles = data.files;


			const transformedFiles = [];

			fetchedFiles.forEach(file => {
				if (file.fileName) {
					const associated = [];
					file.tags.forEach((tag) => {
						if (tag === device.id) {
							associated.push(`${device.name}`);
						} else if (tag === driver.id) {
							associated.push(`${driver.firstName} ${driver.lastName}`);
						}

						trailer.forEach((t) => {
							if (t.id === tag) {
								associated.push(t.id);
							}
						});

						groups.forEach((g) => {
							if (g === tag) {
								associated.push(g);
							}
						});
					});

					transformedFiles.push({
						...file,
						associated,
						action: (
							<Box sx={{ display: 'flex', gap: '2rem' }}>
								<ViewButton
									filePath={file.path}
									fileName={file.fileName}
									database={database}
									session={session}
									server={server}
									onValidationError={() => setValidationError(true)}
									onError={handleError}
								/>
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
							
							</Box>
						
						),
					});
				}
			});

				setFiles([...transformedFiles]);

			} catch (err) {
				console.error('Error', err);
				
			} finally {
				setLoading(false);
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


	return (
		<Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f6f8fa', minHeight: '100vh', fontFamily: 'Inter, Roboto, sans-serif' }}>
			<Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                GeoDocs Portal
            </Typography>
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
						{mobile ? <DocumentMobile files={files} devices={[{id: device.id, name: device.name}]} drivers={[{id: driver.id, name: `${driver.firstName} ${driver.lastName}`}]} trailers={trailer.map(t =>({id: t.id, name: t.name}))} groups={[...groups]}/> : <DocumentTable files={files}/>}
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
