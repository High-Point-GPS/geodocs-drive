
import React, { useState } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';



const DownloadButton = ({ filePath, fileName, database, session, server, onValidationError, onError }) => {
  const [loading, setLoading] = useState(false);

  function isAndroidDevice() {
    return /Android/i.test(navigator.userAgent);
  }

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
          'https://us-central1-geotabfiles.cloudfunctions.net/openDocFile',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify(messageBody)
          }
        );

        const data = await response.json();

        if (data.url) {
          // try opening in new window/tab (best chance to render inline)
          const opened = window.open(data.url, '_blank', 'noopener,noreferrer');

          if (!opened) {
            // try anchor click (sometimes works when window.open blocked)
            const a = document.createElement('a');
            a.href = data.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            a.remove();

            // final fallback: navigate (forces download in many cases)
            // keep as last resort
            // window.location.href = data.url;
          }
        }
      


    } catch (err) {
      console.log(err);
      const errorMessage = err?.message || String(err) || 'Unexpected error';
      onError(errorMessage);
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
