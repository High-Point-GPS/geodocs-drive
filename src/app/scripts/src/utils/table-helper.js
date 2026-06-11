import React from 'react';
import { createColumnHelper, sortingFns } from '@tanstack/react-table';
import dayjs from 'dayjs';

import { rankItem, compareItems } from '@tanstack/match-sorter-utils';
import { Box, Chip, Typography, Tooltip } from '@mui/material';

import GroupsIcon from '@mui/icons-material/Groups';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RvHookupIcon from '@mui/icons-material/RvHookup';

const columnHelper = createColumnHelper();

// Same icon + tint per association kind as the info cards at the top of the page.
const KIND_CHIP = {
    group: { Icon: GroupsIcon, bg: '#e6f6e9', color: '#2e7d32' },
    driver: { Icon: AirlineSeatReclineNormalIcon, bg: '#e3f2fd', color: '#1565c0' },
    vehicle: { Icon: LocalShippingIcon, bg: '#fffde7', color: '#f9a825' },
    trailer: { Icon: RvHookupIcon, bg: '#f3e5f5', color: '#6a1b9a' },
};

// Associations as icon chips: entries are {kind, label} built in App.js.
const MAX_ASSOCIATION_CHIPS = 6;
const displayCell = (value) => {
    const items = value.slice(0, MAX_ASSOCIATION_CHIPS);
    const overflow = value.length - items.length;
    return (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
            {items.map((item) => {
                const meta = KIND_CHIP[item.kind] || KIND_CHIP.group;
                const KindIcon = meta.Icon;
                return (
                    <Chip
                        key={`${item.kind}-${item.label}`}
                        label={item.label}
                        icon={<KindIcon sx={{ fontSize: 18 }} />}
                        sx={{
                            fontSize: '1.1rem',
                            backgroundColor: meta.bg,
                            '& .MuiChip-icon': { color: meta.color },
                        }}
                    />
                );
            })}
            {overflow > 0 && (
                <Tooltip title={value.map((v) => v.label).join(', ')}>
                    <Chip label={`+${overflow} more`} sx={{ fontSize: '1.1rem' }} />
                </Tooltip>
            )}
        </Box>
    );
};

// Association entries are objects; everything else stays as-is.
const toSearchText = (cellValue) => {
    if (Array.isArray(cellValue)) {
        return cellValue.map((v) => (v && v.label ? v.label : v)).join(' ');
    }
    return String(cellValue);
};

const fuzzySort = (rowA, rowB, columnId) => {
    let dir = 0;

    // Only sort by rank if the column has ranking information
    if (rowA.columnFiltersMeta[columnId]) {
        dir = compareItems(
            rowA.columnFiltersMeta[columnId].itemRank,
            rowB.columnFiltersMeta[columnId].itemRank
        );
    }

    // Provide an alphanumeric fallback for when the item ranks are equal
    return dir === 0 ? sortingFns.alphanumeric(rowA, rowB, columnId) : dir;
};

export const columns = [
    columnHelper.accessor('fileName', {
        header: () => 'File',
        cell: (info) => (
            <Typography variant="h5">{info.renderValue()}</Typography>
        ),
        filterFn: 'fuzzy',
        sortingFn: fuzzySort,
    }),
    columnHelper.accessor('associated', {
        header: () => 'Associated With',
        cell: (info) => {
            const value = info.renderValue();
            if (value === null || value.length < 0) {
                return;
            }

            return displayCell(value);
        },
        filterFn: 'fuzzy',
        sortingFn: fuzzySort,
    }),
    columnHelper.accessor('expiryDate', {
        header: () => 'Expiry Date',
        cell: (info) => {
            const value = info.renderValue();
            if (value === null || value.length < 0) {
                return (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '1rem',
                            alignItems: 'center',
                        }}
                    >
                        <Typography variant="h5">None</Typography>

                        <Chip
                            label="Active"
                            color="primary"
                            sx={{ fontSize: '1.25rem' }}
                        />
                    </Box>
                );
            }

            const currentDate = dayjs();
            const expireDate = dayjs(value);

            const hasExpired = expireDate < currentDate;

            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '1rem',
                        alignItems: 'center',
                    }}
                >
                    <Typography variant="h5">
                        {expireDate.format('MMMM D, YYYY')}
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
            );
        },
    }),
    columnHelper.accessor('action', {
        header: () => 'Actions',
        cell: (info) => (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                {info.renderValue()}
            </Box>
        ),
    }),
];

export const fuzzyFilter = (row, columnId, value, addMeta) => {
    // Rank the item
    const itemRank = rankItem(row.getValue(columnId), value);

    // Store the itemRank info
    addMeta({
        itemRank,
    });

    // Return if the item should be filtered in/out
    return itemRank.passed;
};


export const stringMatchFilter = (row, columnId, filterValue) => {
    const rowValue = row.getValue(columnId);
    if (rowValue == null) return false;
    return toSearchText(rowValue).toLowerCase().includes(String(filterValue).toLowerCase());
};

export const globalStringFilter = (row, _, filterValue) => {
    return row.getAllCells().some(cell => {
        const cellValue = cell.getValue();
        if (cellValue == null) return false;
        return toSearchText(cellValue).toLowerCase().includes(String(filterValue).toLowerCase());
    });
};
