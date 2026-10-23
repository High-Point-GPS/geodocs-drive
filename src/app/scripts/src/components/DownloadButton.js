
import React, { useState } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';


const DownloadButton = ({ filePath, fileName, database, session, server, onValidationError, onError }) => {
  const [loading, setLoading] = useState(false);
 const handleClick = async () => {
    setLoading(true);
    try {
      const sessionInfo = {
        database,
        sessionId: session.sessionId,
        userName: session.userName,
        server
      };
      const messageBody = { session: sessionInfo, filePath, fileName };

      const response = await fetch(
        'https://portal.highpointgps.com/api/geodocs/readDocFile',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(messageBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.valid === false && onValidationError) {
          onValidationError();
        }
        console.error('Download failed:', errorData.error || '');
        onError(errorData);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      // Firefox only follows a click on a link that is in the document.
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Give the browser a moment to start the download before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    
  } catch (err) {
    console.log(err);
    const errorMessage = err?.message || String(err) || 'Unexpected error';
    onError(errorMessage);
  } finally {
    setLoading(false);
  }

  };

  return (
    <Tooltip title="Download File" sx={{ maxWidth: '40px' }} >

        <IconButton onClick={handleClick} disabled={loading} >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <DownloadForOfflineIcon fontSize="large" color="primary" sx={{fontSize: '32px'}}/>
          )}
        </IconButton>

    </Tooltip>
  );
};

export default DownloadButton;
