
import React, { useState } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';


const DownloadButton = ({ filePath, fileName, database, session, server, onValidationError }) => {
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
        'https://us-central1-geotabfiles.cloudfunctions.net/readDocFile',
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
        const errorData = await response.json();
        if (errorData.valid === false && onValidationError) {
          onValidationError();
        }
        console.error('Download failed:', errorData.error || '');
        return;
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title="Open File" sx={{ maxWidth: '40px' }} >

        <IconButton onClick={handleClick} disabled={loading} >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <OpenInNewRoundedIcon fontSize="large" color="primary" />
          )}
        </IconButton>

    </Tooltip>
  );
};

export default DownloadButton;
