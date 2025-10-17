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
  useTheme
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';

// react-pdf-viewer imports & styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

const ViewButton = ({ filePath, fileName, database, session, server, onValidationError, onError }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [contentType, setContentType] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(true);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // stable plugin instance for viewer
 const defaultLayoutPluginInstance = defaultLayoutPlugin();

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
          {loading ? <CircularProgress size={28} /> : <VisibilityIcon fontSize="large" color="primary" />}
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
          {fileUrl && (
            <Button
              variant="contained"
              color="primary"
              fullWidth={fullScreen}
              onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
              startIcon={<VisibilityIcon />}
              aria-label="Open in new tab action"
            >
              Open in new tab
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
      </Dialog>
    </>
  );
};

export default ViewButton;