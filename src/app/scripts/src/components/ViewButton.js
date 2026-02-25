import React, { useState, useEffect, useMemo } from 'react';
import {
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  DialogActions,
  useMediaQuery,
  useTheme,
  TextField
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import EmailIcon from '@mui/icons-material/Email';


import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';



const ViewButton = ({ filePath, fileName, database, session, server, driverCanSendEmail = false, driver, vehicleData, onValidationError, onError }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [contentType, setContentType] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

const renderToolbar = (Toolbar) => (
  <Toolbar>
        {(slots) => (
            <div
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    width: '100%',
                }}
            >
                {/* Group 1: Zoom Controls */}
                <div
                    style={{
                        alignItems: 'center',
                        display: 'flex',
                        padding: '0 8px', // Add padding around the group
                    }}
                >
                    <slots.ZoomOut />
                    <slots.Zoom />
                    <slots.ZoomIn />
                </div>

                {/* Group 2: Page Controls */}
                <div
                    style={{
                        alignItems: 'center',
                        display: 'flex',
                        padding: '0 8px', // Add padding
                        borderLeft: '1px solid #ccc', // Add a visual separator
                        borderRight: '1px solid #ccc', // Add a visual separator
                    }}
                >
                    <slots.GoToPreviousPage />
                    <div style={{ padding: '0 4px', minWidth: '5rem', textAlign: 'center' }}>
                        <slots.CurrentPageLabel /> / <slots.NumberOfPages />
                    </div>
                    <slots.GoToNextPage />
                </div>

                {/* Group 3: Rotate */}
                <div
                    style={{
                        alignItems: 'center',
                        display: 'flex',
                        padding: '0 8px', // Add padding
                    }}
                >
                    <slots.Rotate />
                </div>

                {/* You can add a flexible spacer to push 
                    other items (if you had any) to the right */}
                <div style={{ flex: 1 }} /> 
                
            </div>
        )}
    </Toolbar>
);

// 2. Pass the renderToolbar function to the plugin instance
const defaultLayoutPluginInstance = defaultLayoutPlugin({
    renderToolbar,

    sidebarTabs: () =>
        []
});


  useEffect(() => {
    setLoadingPreview(true);
  }, [fileUrl]);

  const inferType = (data) => {
    if (data?.contentType) return data.contentType;
    if (fileName) {
      const ext = fileName.split('.').pop().toLowerCase();
      switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        case 'mp4': return 'video/mp4';
        case 'mp3': return 'audio/mpeg';
        case 'txt': return 'text/plain';
        default: return '';
      }
    }
    return data?.url?.endsWith('.pdf') ? 'application/pdf' : '';
  };

  const handleClick = async () => {
    setLoading(true);
    try {
      const sessionInfo = { database, sessionId: session.sessionId, userName: session.userName, server };
      const messageBody = { session: sessionInfo, filePath, fileName };

      const response = await fetch('https://us-central1-geotabfiles.cloudfunctions.net/openDocFile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messageBody)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.valid === false && onValidationError) onValidationError();
        onError(errData);
        return;
      }

      const data = await response.json(); // expect { url, contentType?, expiresAt? }
      if (data?.url) {
        setFileUrl(data.url);
        setContentType(inferType(data));
        setOpen(true);
      } else {
        onError && onError('No URL returned for preview');
      }
    } catch (err) {
      console.error(err);
      onError && onError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFileUrl('');
    setContentType('');
    setLoadingPreview(true);
    setEmailDialogOpen(false);
    setRecipientEmail('');
    setEmailError('');
    setSendingEmail(false);
    setEmailSent(false);
  };

  const validateEmail = (email) => {
    const trimmedEmail = String(email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmedEmail);
  };

  const handleOpenEmailDialog = () => {
    if (!driverCanSendEmail) {
      return;
    }
    setEmailDialogOpen(true);
    setEmailSent(false);
  };

  const handleCloseEmailDialog = () => {
    setEmailDialogOpen(false);
    setRecipientEmail('');
    setEmailError('');
    setEmailSent(false);
  };

  const handleSendEmail = async () => {
    if (!driverCanSendEmail) {
      return;
    }

    const toEmail = recipientEmail.trim();
    if (!validateEmail(toEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailError('');
    setSendingEmail(true);

    try {
      const sessionInfo = {
        database,
        sessionId: session.sessionId,
        userName: session.userName,
        server
      };

      const senderEmail = (session?.email || session?.userName || '').trim();
      const normalizedVehicle = vehicleData
        ? {
            name: vehicleData?.name ?? null,
            vehicleIdentificationNumber: vehicleData?.vehicleIdentificationNumber ?? null,
            licensePlate: vehicleData?.licensePlate ?? null
          }
        : null;
      const messageBody = {
        session: sessionInfo,
        toEmail,
        driverName: driver ? `${driver.firstName} ${driver.lastName}` : '',
        vehicle: normalizedVehicle,
        fromEmail: senderEmail,
        file: {
          filePath,
          fileName,
          url: fileUrl,
          contentType
        }
      };

      const response = await fetch('https://us-central1-geotabfiles.cloudfunctions.net/emailFile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messageBody)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.valid === false && onValidationError) onValidationError();
        onError && onError(errData.error || 'Failed to send email');
        return;
      }

      setEmailSent(true);
      setRecipientEmail('');
    } catch (err) {
      console.error(err);
      onError && onError(err?.message || String(err));
    } finally {
      setSendingEmail(false);
    }
  };

  const renderPreview = () => {
    const ct = (contentType || '').toLowerCase();

    if (ct.startsWith('application/pdf')) {
      // react-pdf-viewer (Worker wraps viewer)
      return (
        <Box sx={{ width: '100%', height: '100%' }}>
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js">
            <Box sx={{ width: '100%', height: '100%' }}>
              <Viewer
                fileUrl={fileUrl}
                plugins={[defaultLayoutPluginInstance]}
                onDocumentLoad={() => setLoadingPreview(false)}
              />
            </Box>
          </Worker>
        </Box>
      );
    }

    if (ct.startsWith('image/')) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 2 }}>
          <img
            src={fileUrl}
            alt={fileName}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            onLoad={() => setLoadingPreview(false)}
          />
        </Box>
      );
    }

    // fallback: iframe for text/office/other
    return (
      <iframe
        title="file-preview"
        src={fileUrl}
        style={{ width: '100%', height: '100%', border: 'none' }}
        onLoad={() => setLoadingPreview(false)}
      />
    );
  };

  return (
    <>
      <Tooltip title="View File" sx={{ maxWidth: '40px' }}>
        <IconButton onClick={handleClick} disabled={loading} size="large">
          {loading ? <CircularProgress size={24} /> : <VisibilityIcon fontSize="large" color="primary" sx={{fontSize: '32px'}}/>}
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg" fullScreen={fullScreen} aria-labelledby="file-view-dialog">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography component="div" variant={fullScreen ? 'h6' : 'h5'} noWrap sx={{ flex: 1 }}>
            {fileName || 'Preview'}
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0, height: fullScreen ? 'calc(100vh - 140px)' : '80vh' }}>
          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {loadingPreview && (
              <Box sx={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 1, bgcolor: 'background.paper'
              }}>
                <CircularProgress />
              </Box>
            )}

            {fileUrl ? renderPreview() : (
              <Box sx={{ p: 2 }}>
                <Typography>No preview available.</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 1,
          p: fullScreen ? 2 : 1,
          flexDirection: fullScreen ? 'column' : 'row'
        }}>
          {driverCanSendEmail && (
            <Button
              variant="contained"
              fullWidth={fullScreen}
              onClick={handleOpenEmailDialog}
              startIcon={<EmailIcon />}
              aria-label="Email file action"
            >
              Email File
            </Button>
          )}
          <Button
            variant="outlined"
            color="inherit"
            fullWidth={fullScreen}
            onClick={handleClose}
            startIcon={<CloseIcon />}
            aria-label="Close action"
          >
            Close
          </Button>
        </DialogActions>

        <Dialog
          open={emailDialogOpen}
          onClose={handleCloseEmailDialog}
          fullWidth
          maxWidth="sm"
          aria-labelledby="email-file-dialog"
        >
          <DialogTitle id="email-file-dialog" sx={{ fontSize: '1.4rem', fontWeight: 600 }}>
            Email File
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                autoFocus
                label="Recipient Email"
                type="email"
                value={recipientEmail}
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 56,
                  },
                  '& .MuiOutlinedInput-input': {
                    height: '56px !important',
                    lineHeight: 'normal !important',
                    boxSizing: 'border-box',
                    padding: '0 14px !important',
                    fontSize: '1rem !important',
                    border: 'none !important'
                  },
                }}
                InputLabelProps={{
                  sx: {
                    fontSize: '1rem',
                    top: '50%',
                    transform: 'translate(14px, -50%) scale(1)',
                    '&.MuiInputLabel-shrink': {
                      top: 0,
                      transform: 'translate(14px, -9px) scale(0.75)'
                    }
                  }
                }}
                FormHelperTextProps={{ sx: { fontSize: '0.95rem' } }}
                onChange={(event) => {
                  setRecipientEmail(event.target.value);
                  if (emailError) setEmailError('');
                }}
                error={Boolean(emailError)}
                helperText={emailError || 'Enter the email address to send this file to.'}
              />
              {emailSent && (
                <Typography sx={{ mt: 1, fontSize: '1rem', fontWeight: 500 }} color="success.main">
                  File emailed successfully.
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1.5 }}>
            <Button
              onClick={handleCloseEmailDialog}
              color="inherit"
              variant="outlined"
              disabled={sendingEmail}
              sx={{ fontSize: '1rem', fontWeight: 600, px: 3, py: 1, minWidth: 120 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              variant="contained"
              disabled={sendingEmail}
              sx={{ fontSize: '1rem', fontWeight: 700, px: 3, py: 1, minWidth: 120 }}
            >
              {sendingEmail ? <CircularProgress size={20} color="inherit" /> : 'Send'}
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>
    </>
  );
};

export default ViewButton;