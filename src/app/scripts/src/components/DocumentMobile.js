import React, { useState, useEffect } from 'react';
import {
    Box,
    Chip,
    Grid,
    Card,
    CardContent,
    Typography,
    Tabs,
    Tab,
    InputAdornment
} from '@mui/material';
import DebouncedInput from './DebouncedInput';

import dayjs from 'dayjs';

import GroupsIcon from '@mui/icons-material/Groups';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RvHookupIcon from '@mui/icons-material/RvHookup';
import SearchIcon from '@mui/icons-material/Search';

const DocumentMobile = ({ files, devices, drivers, trailers, groups}) => {
    const [globalFilter, setGlobalFilter] = useState('');
    const [filteredFiles, setFilteredFiles] = useState([]);

    const [activeTab, setActiveTab] = useState(0);

      useEffect(() => {
        let newFilteredFiles = files.filter(file =>
            file.fileName.toLowerCase().includes(globalFilter.toLowerCase())
        );
        // Tab filtering logic
        const getFileType = (fileName) => {
            const ext = fileName.split('.').pop().toLowerCase();
            if (['pdf'].includes(ext)) return 'PDF';
            if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return 'Images';
            return 'Other';
        }

        if (activeTab === 1) { // PDF
            newFilteredFiles = newFilteredFiles.filter(f => getFileType(f.fileName) === 'PDF');
        } else if (activeTab === 2) { // Images
            newFilteredFiles = newFilteredFiles.filter(f => getFileType(f.fileName) === 'Images');
        } else if (activeTab === 3) { // Other
             newFilteredFiles = newFilteredFiles.filter(f => getFileType(f.fileName) === 'Other');
        }

        setFilteredFiles(newFilteredFiles);
    }, [globalFilter, files, activeTab]);

       const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const filterDriverData = (ownerData, driverData) => {
        const result = [];
        ownerData.forEach(owner => {
            driverData.forEach(data => {
                if (data.id === owner) {
                    result.push(data.name);
                }
            })
        });

        return result;
    }

      const tabFocusStyle = {
        '&:focus': {
            backgroundColor: 'transparent',
            outline: 'none',
        },
        'fontSize': '14px',
           '@media (max-width: 600px)': {
            minWidth: 'auto', // Allow tabs to shrink
            padding: '6px 8px',  // Reduce padding
            fontSize: '1.25rem', // Make font smaller
        },
    };

    const checkExpiry = (file) => {
        if (!file.expiryDate) return false;

        if (file.expiryDate) {
            const today = dayjs();
            const expiry = dayjs(file.expiryDate);
            return today.isAfter(expiry, 'day');
        }
    }

    return (
        <Box
            sx={{
                mt: 2,
            }}
        >
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <DebouncedInput
                    value={globalFilter}
                        onChange={(value) => setGlobalFilter(String(value))}
                        placeholder="Search documents..."
                        variant="outlined"
                        fullWidth
                        InputProps={{
                           startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                />
            </Box>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', borderRadius: '8px 8px 0 0',  }}>
                    <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
                        <Tab label="All" sx={tabFocusStyle}/>
                        <Tab label="PDF" sx={tabFocusStyle}/>
                        <Tab label="Images" sx={tabFocusStyle}/>
                        <Tab label="Other" sx={tabFocusStyle}/>
                    </Tabs>
                </Box>
             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                    {filteredFiles.length > 0 ? filteredFiles.map((file) => (
                        <Card
                            key={file.id}
                            variant="outlined"
                        >
                            <CardContent sx={{ pb: '16px !important' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '16px' }}>{file.fileName}</Typography>
                                    <Chip label={checkExpiry(file) ? 'Expired' : 'Active'} color={checkExpiry(file) ? 'error' : 'primary'} sx={{fontSize: '12px'}} />
                                </Box>
                                <Typography variant="body1" color="text.secondary" sx={{fontSize: '14px'}}>
                                    {file.expiryDate ? `Expires: ${dayjs(file.expiryDate).format('MMM D, YYYY')}` : 'No expiry date'}
                                </Typography>
                                <Grid container spacing={2} alignItems="center">
 
                                    <Grid item xs={10}>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {filterDriverData(file.owners.drivers, drivers).map(d => <Chip key={d} label={d} icon={<AirlineSeatReclineNormalIcon />} sx={{fontSize: '12px', backgroundColor: '#e6f2fd'}}/>)}
                                            {filterDriverData(file.owners.groups, groups).map(g => <Chip key={g} label={g} icon={<GroupsIcon />} sx={{fontSize: '12px', backgroundColor: '#e3f2fd'}} />)}
                                            {filterDriverData(file.owners.vehicles, devices).map(v => <Chip key={v} label={v} icon={<LocalShippingIcon />} sx={{fontSize: '12px', backgroundColor: '#fffde7'}} />)}
                                            {filterDriverData(file.owners.trailers, trailers).map(t => <Chip key={t} label={t} icon={<RvHookupIcon />} sx={{fontSize: '12px', backgroundColor: '#f3e5f5'}} />)}
                                        </Box>
                                    </Grid>

            
                                    <Grid item xs={2}>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            {file.action}
                                        </Box>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    )) : (
                        <Typography sx={{textAlign: 'center', p: 4, color: 'text.secondary'}}>No documents found.</Typography>
                    )}
                </Box>
        </Box>
    );
};

export default DocumentMobile;
