import React, { useEffect, useState } from 'react';
import DocumentTable from './components/DocumentTable';
import DocumentMobile from './components/DocumentMobile';

import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress } from '@mui/material';

import DownloadButton from './components/DownloadButton';


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

		const queryTags = [device, driver, ...trailer, ...groups];

		const messageBody = {
			database: database,
			session: sessionInfo,
			tags: queryTags
		};

		try {

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
						if (tag === device) {
							associated.push(device);
						} else if (tag === driver) {
							associated.push(driver);
						}

						trailer.forEach((t) => {
							if (t === tag) {
								associated.push(t);
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
							<DownloadButton
								filePath={file.path}
								fileName={file.fileName}
								database={database}
								session={session}
								server={server}
								onValidationError={() => setValidationError(true)}
								onError={handleError}
							/>
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
		<Box sx={{ padding: '2rem' }}>
			<Box
				sx={{
					display: 'flex',
					flexDirection: { xs: 'column', sm: 'column', md: 'row' },
					gap: { xs: '2rem', sm: '2rem', md: '3rem' },
				}}
			>
				<Box sx={{ display: 'flex', gap: '0.5rem' }}>
					<Typography variant="h4">Groups: </Typography>
					<Typography variant="h4">{groups.join(', ')}</Typography>
				</Box>
				<Box sx={{ display: 'flex', gap: '0.5rem' }}>
					<Typography variant="h4">Driver: </Typography>
					<Typography variant="h4">{driver}</Typography>
				</Box>
				<Box sx={{ display: 'flex', gap: '0.5rem' }}>
					<Typography variant="h4">Vehicle: </Typography>
					<Typography variant="h4">{device ? device : 'none'}</Typography>
				</Box>
				<Box sx={{ display: 'flex', gap: '0.5rem' }}>
					<Typography variant="h4">Trailer(s): </Typography>
					<Typography variant="h4">
						{trailer.length > 0 ? trailer.join(', ') : 'none'}
					</Typography>
				</Box>
			</Box>
			{
				loading ? (
					<Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px'}}>
					<CircularProgress />
					</Box>
				) : (
					<>
						{mobile ? <DocumentMobile files={files} devices={[device]} drivers={[driver]} trailers={[...trailer]} groups={[...groups]}/> : <DocumentTable files={files} />}
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
