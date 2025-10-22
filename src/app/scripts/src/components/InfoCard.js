import React from 'react';
import {
    Grid,
    Card,
    CardHeader,
    Avatar, 
} from '@mui/material';

const InfoCard = ({ icon, title, subheader, color }) => (
    <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined" sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '100%', padding: 0 }}>
            <CardHeader
            sx={{ padding: { xs: 1, sm: 2 } }}
                avatar={
                    <Avatar sx={{ bgcolor: color.bg, color: color.icon, width: { xs: 30, sm: 56 }, height: { xs: 30, sm: 56 } }}>
                        {icon}
                    </Avatar>
                }
                titleTypographyProps={{ fontWeight: 'bold', fontSize: { xs: '14px', sm: '18px' }}}
                title={title}
                subheaderTypographyProps={{fontSize: { xs: '12px', sm: '14px' }}}
                subheader={subheader}
            />
        </Card>
    </Grid>
);

export default InfoCard;