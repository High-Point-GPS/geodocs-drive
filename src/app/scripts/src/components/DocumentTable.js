import React, { useState } from 'react';
import DebouncedInput from './DebouncedInput';

import {
	useReactTable,
	getCoreRowModel,
	getFilteredRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFacetedMinMaxValues,
	getPaginationRowModel,
	getSortedRowModel,
	flexRender,
} from '@tanstack/react-table';

import {
	Box,
	TextField,
	Select,
	MenuItem,
	Table,
	TableBody,
	TableContainer,
	TableRow,
	TableHead,
	TableCell,
	Typography,
	Paper,
	IconButton,
	Button,
} from '@mui/material';

import { columns, globalStringFilter, stringMatchFilter } from '../utils/table-helper';

import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';

import '../../../styles/app.css';

const DocumentTable = ({ files }) => {
	const [columnFilters, setColumnFilters] = useState([]);
	const [globalFilter, setGlobalFilter] = useState('');

	const table = useReactTable({
		data: files,
		columns,
		filterFns: {
			fuzzy: stringMatchFilter,
		},
		state: {
			columnFilters,
			globalFilter,
		},
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: globalStringFilter,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		getFacetedMinMaxValues: getFacetedMinMaxValues(),
		debugTable: true,
		debugHeaders: true,
		debugColumns: false,
	});

	const iconButtonSx = {
        width: 38, // Makes it a nice square
        height: 38,
        // Applies the background to the button itself
        backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
        // This is what makes it a "rounded square" instead of a circle
        borderRadius: (theme) => theme.shape.borderRadius,
        '&:hover': {
            backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[200],
        }
    };

	return (
		<Paper
			style={{
				marginTop: '2rem',
				display: 'flex',
				flexDirection: 'column',
				gap: '1rem',
				paddingLeft: '2rem',
				paddingRight: '2rem',
			}}
		>
			<Box sx={{ marginTop: '2rem' }}>
				<DebouncedInput
					value={globalFilter ?? ''}
					onChange={(value) => setGlobalFilter(String(value))}
					placeholder="Search all columns..."
					sx={{ 
						width: '100%', 
						maxWidth: '500px',
						// Apply padding to the input element itself
						'& .MuiInputBase-input': {
							paddingTop: '20px',    // Or '1rem', '1.5em', etc.
							paddingBottom: '20px', // Or '1rem', '1.5em', etc.
							
						}
					}}
				/>
			</Box>
			<TableContainer>
				<Table style={{ width: '100%' }}>
					<TableHead>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableCell
											key={header.id}
											colSpan={header.colSpan}
											className={`${
												header.id === 'fileName' ? 'sticky' : ''
											}`}
											sx={{ textAlign: 'center' }}
										>
											{header.isPlaceholder ? null : (
												<>
													<Typography variant="h4">
														{flexRender(
															header.column.columnDef.header,
															header.getContext()
														)}
													</Typography>
												</>
											)}
										</TableCell>
									);
								})}
							</TableRow>
						))}
					</TableHead>
					<TableBody>
						{table.getRowModel().rows.map((row, index) => {
							return (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => {
										return (
											<TableCell
												key={cell.id}
												className={`${
													cell.id.includes('fileName') ? 'sticky' : ''
												}`}
												style={{ padding: '1rem', textAlign: 'center' }}
											>
												<div>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext()
													)}
												</div>
											</TableCell>
										);
									})}
								</TableRow>
							);
						})}
					</TableBody>
				</Table>

		{files.length > table.getState().pagination.pageSize && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '1rem',
                                marginTop: '0.5rem',
                                marginBottom: '1rem',
                                padding: '0.5rem 0'
                            }}
                        >
                            {/* Group 1: Navigation Buttons (LEFT) */}
                            <Box sx={{ display: 'flex', gap: '0.5rem' }}> {/* Added gap for spacing */}
                                <IconButton
                                    sx={iconButtonSx} // Apply the style here
                                    onClick={() => table.setPageIndex(0)}
                                    disabled={!table.getCanPreviousPage()}
                                    aria-label="first page"
                                >
                                    <FirstPageIcon />
                                </IconButton>
                                <IconButton
                                    sx={iconButtonSx} // Apply the style here
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    aria-label="previous page"
                                >
                                    <NavigateBeforeIcon />
                                </IconButton>
                                <IconButton
                                    sx={iconButtonSx} // Apply the style here
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    aria-label="next page"
                                >
                                    <NavigateNextIcon />
                                </IconButton>
                                <IconButton
                                    sx={iconButtonSx} // Apply the style here
                                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                    disabled={!table.getCanNextPage()}
                                    aria-label="last page"
                                >
                                    <LastPageIcon />
                                </IconButton>
                            </Box>

                            {/* Group 2: Page Info (RIGHT) */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Typography variant="body2">Page</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        {table.getState().pagination.pageIndex + 1} of{' '}
                                        {table.getPageCount()}
                                    </Typography>
                                </Box>

                                <Select
                                    size="small"
                                    value={table.getState().pagination.pageSize}
                                    onChange={(e) => {
                                        table.setPageSize(Number(e.target.value));
                                    }}
                                >
                                    {[10, 20, 30, 40, 50].map((pageSize) => (
                                        <MenuItem key={pageSize} value={pageSize}>
                                            Show {pageSize}
                                        </MenuItem>
                                    ))}
                                </Select>

                                <Typography variant="body2" color="text.secondary">
                                    {table.getPrePaginationRowModel().rows.length} Rows
                                </Typography>
                            </Box>
                        </Box>
                    )}
			</TableContainer>
		</Paper>
	);
};

export default DocumentTable;
