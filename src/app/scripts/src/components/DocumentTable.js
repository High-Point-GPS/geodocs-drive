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
	Button,
} from '@mui/material';

import { columns, globalStringFilter, stringMatchFilter } from '../utils/table-helper';

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
							gap: '0.5rem',
							marginTop: '0.5rem',
							marginBottom: '1rem',
						}}
					>
						<Button
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
						>
							{'<<'}
						</Button>
						<Button
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							{'<'}
						</Button>
						<Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
							{'>'}
						</Button>
						<Button
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
						>
							{'>>'}
						</Button>
						<span className="pagenation-foot">
							<Typography>Page</Typography>
							<Typography sx={{ fontWeight: 'bold' }}>
								{table.getState().pagination.pageIndex + 1} of{' '}
								{table.getPageCount()}
							</Typography>
						</span>
						<span className="pagenation-foot">
							<Typography>| Go to page:</Typography>
							<TextField
								sx={{ width: '75px' }}
								type="number"
								size="small"
								defaultValue={table.getState().pagination.pageIndex + 1}
								onChange={(e) => {
									const page = e.target.value ? Number(e.target.value) - 1 : 0;
									table.setPageIndex(page);
								}}
							/>
						</span>
						<Select
							size="small"
							value={table.getState().pagination.pageSize}
							onChange={(e) => {
								table.setPageSize(Number(e.target.value));
							}}
							className="geotabFormEditField"
						>
							{[10, 20, 30, 40, 50].map((pageSize) => (
								<MenuItem key={pageSize} value={pageSize}>
									Show {pageSize}
								</MenuItem>
							))}
						</Select>
						<div>{table.getPrePaginationRowModel().rows.length} Rows</div>
					</Box>
				)}
			</TableContainer>
		</Paper>
	);
};

export default DocumentTable;
