import React, { useState, useEffect } from 'react';
import {
    Box,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    AccordionActions,
    Typography,
} from '@mui/material';
import DebouncedInput from './DebouncedInput';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import dayjs from 'dayjs';

const DocumentMobile = ({ files, devices, drivers, trailers, groups }) => {
    const [globalFilter, setGlobalFilter] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [filterFiles, setFilterFiles] = useState([]);

    useEffect(() => {
        if (globalFilter === '') {
            setFilterFiles([...files]);
        } else {
            const newFilterFiles = files.filter((file) =>
                file.fileName.toLowerCase().includes(globalFilter.toLowerCase())
            );
            setFilterFiles(newFilterFiles);
        }
    }, [globalFilter, files]);

    const filterDriverData = (ownerData, driverData) => {
        const result = [];
        ownerData.forEach(owner => {
            driverData.forEach(data => {
                if (data === owner) {
                    result.push(data);
                }
            })
        });

        return result;
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                width: '100%',
                marginTop: '2rem',
            }}
        >
            <Box>
                <DebouncedInput
                    value={globalFilter ?? ''}
                    onChange={(value) => setGlobalFilter(String(value))}
                    placeholder="Search..."
                />
            </Box>
            <Box sx={{ width: '100%' }}>
                {filterFiles.map((file) => {
                    let hasExpired = false;
                    if (file.expiryDate) {
                        const currentDate = dayjs();
                        const expireDate = dayjs(file.expiryDate);

                        hasExpired = expireDate < currentDate;
                    }
                    return (
                        <Accordion
                            key={file.id}
                            expanded={file.id === expandedId}
                            onChange={() => {
                                expandedId === file.id
                                    ? setExpandedId(null)
                                    : setExpandedId(file.id);
                            }}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="h4">
                                    {file.fileName}
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                }}
                            >
                                {file.owners.groups.length > 0 && (
                                    <Box>
                                        <Typography variant="h5">
                                            Groups
                                        </Typography>
                                        <Typography variant="body1">
                                            {filterDriverData(file.owners.groups, groups).join(', ')}
                                        </Typography>
                                    </Box>
                                )}
                                {file.owners.drivers.length > 0 && (
                                    <Box>
                                        <Typography variant="h5">
                                            Drivers
                                        </Typography>
                                        <Typography variant="body1">
                                            {filterDriverData(file.owners.drivers, drivers).join(', ')}
                                        </Typography>
                                    </Box>
                                )}
                                {file.owners.vehicles.length > 0 && (
                                    <Box>
                                        <Typography variant="h5">
                                            Vehicles
                                        </Typography>
                                        <Typography variant="body1">
                                            {filterDriverData(file.owners.vehicles, devices).join(', ')}
                                        </Typography>
                                    </Box>
                                )}
                                {file.owners.trailers.length > 0 && (
                                    <Box>
                                        <Typography variant="h5">
                                            Trailers
                                        </Typography>
                                        <Typography variant="body1">
                                            {filterDriverData(file.owners.trailers, trailers).join(', ')}                         
                                        </Typography>
                                    </Box>
                                )}
                                {file.expiryDate ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Typography variant="h5">
                                            {dayjs(file.expiryDate).format(
                                                'MMMM D, YYYY'
                                            )}
                                        </Typography>
                                        {hasExpired ? (
                                            <Chip
                                                label="Expired"
                                                color="error"
                                                sx={{ fontSize: '1.25rem' }}
                                            />
                                        ) : (
                                            <Chip
                                                label="Active"
                                                color="primary"
                                                sx={{ fontSize: '1.25rem' }}
                                            />
                                        )}
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Typography variant="h5">
                                            None
                                        </Typography>

                                        <Chip
                                            label="Active"
                                            color="primary"
                                            sx={{ fontSize: '1.25rem' }}
                                        />
                                    </Box>
                                )}
                            </AccordionDetails>
                            <AccordionActions>{file.action}</AccordionActions>
                        </Accordion>
                    );
                })}
            </Box>
        </Box>
    );
};

export default DocumentMobile;
