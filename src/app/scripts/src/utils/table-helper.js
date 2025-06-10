import React from 'react';
import { createColumnHelper, sortingFns } from '@tanstack/react-table';
import dayjs from 'dayjs';

import { rankItem, compareItems } from '@tanstack/match-sorter-utils';
import { Box, Chip, Typography, Tooltip } from '@mui/material';

const columnHelper = createColumnHelper();

const displayCell = (value) => {
    const content = `${value.slice(0, 5).join(', ')}${
        value.length > 5 ? '...' : ''
    }`;
    return (
        <>
            {value.length > 5 ? (
                <Tooltip title={`${value.join(', ')}`}>
                    <Typography variant="h5">{content}</Typography>
                </Tooltip>
            ) : (
                <Typography variant="h5">{content}</Typography>
            )}
        </>
    );
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
        header: () => 'Action',
        cell: (info) => info.renderValue(),
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
    let rowValue = row.getValue(columnId);
    if (rowValue == null) return false;
    // If it's an array, join its elements into a string.
    if (Array.isArray(rowValue)) {
        rowValue = rowValue.join(' ');
    }
    return String(rowValue).toLowerCase().includes(String(filterValue).toLowerCase());
};

export const globalStringFilter = (row, _, filterValue) => {
    return row.getAllCells().some(cell => {
        let cellValue = cell.getValue();
        if (cellValue == null) return false;
        if (Array.isArray(cellValue)) {
        cellValue = cellValue.join(' ');
        }
        return String(cellValue).toLowerCase().includes(String(filterValue).toLowerCase());
    });
};
