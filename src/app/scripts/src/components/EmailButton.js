import React, { useState } from 'react';
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
  TextField
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';

const EmailButton = ({ filePath, fileName, database, session, server, driver, vehicleData, onValidationError, onError }) => {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const inferType = (data) => {
    if (data?.contentType) return data.contentType;
    if (fileName) {
      const ext = fileName.split('.').pop().toLowerCase();
      switch (ext) {
        case 'pdf':
          return 'application/pdf';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
          return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        case 'mp4':
          return 'video/mp4';
        case 'mp3':
          return 'audio/mpeg';
        case 'txt':
          return 'text/plain';
        default:
          return '';
      }
    }
    return data?.url?.endsWith('.pdf') ? 'application/pdf' : '';
  };

  const validateEmail = (email) => {
    const trimmedEmail = String(email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmedEmail);
  };

  const handleOpenEmailDialog = () => {
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

      const fileResponse = await fetch('https://us-central1-geotabfiles.cloudfunctions.net/openDocFile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          session: sessionInfo,
          filePath,
          fileName
        })
      });

      if (!fileResponse.ok) {
        const errData = await fileResponse.json().catch(() => ({}));
        if (errData.valid === false && onValidationError) onValidationError();
        onError && onError(errData.error || 'Failed to prepare file for email');
        return;
      }

      const fileData = await fileResponse.json();

      if (!fileData?.url) {
        onError && onError('No URL returned for email');
        return;
      }

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
          url: fileData.url,
          contentType: inferType(fileData)
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

  return (
    <>
      <Tooltip title="Email File" sx={{ maxWidth: '40px' }}>
        <span>
          <IconButton onClick={handleOpenEmailDialog} size="large" aria-label="Email file">
            <EmailIcon fontSize="large" color="primary" sx={{ fontSize: '32px' }} />
          </IconButton>
        </span>
      </Tooltip>

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
                  height: 56
                },
                '& .MuiOutlinedInput-input': {
                  height: '56px !important',
                  lineHeight: 'normal !important',
                  boxSizing: 'border-box',
                  padding: '0 14px !important',
                  fontSize: '1rem !important',
                  border: 'none !important'
                }
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
    </>
  );
};

export default EmailButton;
