import React, { useMemo, useState } from 'react';
import { Box, Chip, Card, Typography, Tabs, Tab, InputAdornment, IconButton } from '@mui/material';
import DebouncedInput from './DebouncedInput';

import dayjs from 'dayjs';

import GroupsIcon from '@mui/icons-material/Groups';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RvHookupIcon from '@mui/icons-material/RvHookup';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';

import { collapseCompanyGroup } from '../utils/formatter';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'jpe', 'jfif', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tif', 'tiff', 'avif'];

const fileKind = (fileName) => {
	const ext = String(fileName).split('.').pop().toLowerCase();
	if (ext === 'pdf') return 'pdf';
	if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
	return 'other';
};

const KIND_STYLE = {
	pdf: { icon: <PictureAsPdfOutlinedIcon />, bg: '#fdecea', fg: '#c62828' },
	image: { icon: <ImageOutlinedIcon />, bg: '#e8f5e9', fg: '#2e7d32' },
	other: { icon: <InsertDriveFileOutlinedIcon />, bg: '#eef2f6', fg: '#475569' },
};

// Documents expiring within this many days are called out before they lapse.
const SOON_DAYS = 30;

const expiryState = (file) => {
	if (!file.expiryDate) return null;
	const days = dayjs(file.expiryDate).startOf('day').diff(dayjs().startOf('day'), 'day');
	if (days < 0) return { label: 'Expired', color: '#b91c1c', bg: '#fdecea' };
	if (days <= SOON_DAYS) return { label: days === 0 ? 'Expires today' : `${days} day${days === 1 ? '' : 's'} left`, color: '#a16207', bg: '#fef3c7' };
	return null;
};

const ASSOCIATION_CHIP = {
	driver: { icon: <AirlineSeatReclineNormalIcon />, bg: '#e3f2fd' },
	group: { icon: <GroupsIcon />, bg: '#eef2f6' },
	vehicle: { icon: <LocalShippingIcon />, bg: '#fff7e0' },
	trailer: { icon: <RvHookupIcon />, bg: '#f3e5f5' },
};

const TABS = [
	{ key: 'all', label: 'All' },
	{ key: 'pdf', label: 'PDF' },
	{ key: 'image', label: 'Photos' },
	{ key: 'other', label: 'Other' },
];

const DocumentMobile = ({ files, devices, drivers, trailers, groups }) => {
	const [globalFilter, setGlobalFilter] = useState('');
	const [activeTab, setActiveTab] = useState('all');

	const searched = useMemo(() => {
		const q = globalFilter.trim().toLowerCase();
		return q
			? files.filter(
					(file) =>
						file.fileName.toLowerCase().includes(q) ||
						String(file.documentType || '').toLowerCase().includes(q)
			  )
			: files;
	}, [files, globalFilter]);

	const counts = useMemo(() => {
		const c = { all: searched.length, pdf: 0, image: 0, other: 0 };
		searched.forEach((f) => {
			c[fileKind(f.fileName)] += 1;
		});
		return c;
	}, [searched]);

	const filteredFiles = activeTab === 'all' ? searched : searched.filter((f) => fileKind(f.fileName) === activeTab);
	// Only the kinds actually present get a tab; "Other" is usually empty.
	const visibleTabs = TABS.filter((t) => t.key === 'all' || counts[t.key] > 0 || activeTab === t.key);

	const namesFor = (ownerIds, list) => {
		const result = [];
		(ownerIds || []).forEach((owner) => {
			(list || []).forEach((data) => {
				if (data && data.id === owner) {
					result.push(data.name);
				} else if (data === owner) {
					// Groups arrive as plain name strings, not {id, name} objects.
					result.push(data);
				}
			});
		});
		return result;
	};

	return (
		<Box sx={{ mt: 2 }}>
			<DebouncedInput
				value={globalFilter}
				onChange={(value) => setGlobalFilter(String(value))}
				placeholder="Search documents"
				fullWidth
				debounce={250}
				InputProps={{
					startAdornment: (
						<InputAdornment position="start">
							<SearchIcon sx={{ color: '#94a3b8' }} />
						</InputAdornment>
					),
					endAdornment: globalFilter ? (
						<InputAdornment position="end">
							<IconButton aria-label="Clear search" size="small" onClick={() => setGlobalFilter('')} sx={{ width: 'auto' }}>
								<CloseIcon fontSize="small" />
							</IconButton>
						</InputAdornment>
					) : null,
				}}
			/>

			<Tabs
				value={activeTab}
				onChange={(e, v) => setActiveTab(v)}
				variant="scrollable"
				scrollButtons={false}
				sx={{
					mt: 1.5,
					minHeight: 40,
					'& .MuiTabs-indicator': { height: 3, borderRadius: 3 },
				}}
			>
				{visibleTabs.map((t) => (
					<Tab
						key={t.key}
						value={t.key}
						label={`${t.label} ${counts[t.key]}`}
						disableRipple
						sx={{
							minHeight: 40,
							minWidth: 0,
							px: 1.5,
							mr: 0.5,
							textTransform: 'none',
							fontSize: '15px',
							fontWeight: 600,
							width: 'auto',
							'&:focus': { backgroundColor: 'transparent', outline: 'none' },
						}}
					/>
				))}
			</Tabs>

			<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 1.5 }}>
				{filteredFiles.length > 0 ? (
					filteredFiles.map((file) => {
						const kind = KIND_STYLE[fileKind(file.fileName)];
						const expiry = expiryState(file);
						const associations = [
							...namesFor(file.owners.vehicles, devices).map((label) => ({ kind: 'vehicle', label })),
							...namesFor(file.owners.drivers, drivers).map((label) => ({ kind: 'driver', label })),
							...namesFor(file.owners.trailers, trailers).map((label) => ({ kind: 'trailer', label })),
							...collapseCompanyGroup(namesFor(file.owners.groups, groups)).map((label) => ({ kind: 'group', label })),
						];
						return (
							<Card
								key={file.id}
								variant="outlined"
								sx={{ borderRadius: '16px', borderColor: '#e2e8f0', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
							>
								<Box sx={{ display: 'flex', gap: 1.5, p: 1.75, pb: 1.25 }}>
									<Box
										sx={{
											width: 44,
											height: 44,
											flexShrink: 0,
											borderRadius: '12px',
											bgcolor: kind.bg,
											color: kind.fg,
											display: 'grid',
											placeItems: 'center',
										}}
									>
										{kind.icon}
									</Box>
									<Box sx={{ minWidth: 0, flex: 1 }}>
										<Typography
											sx={{
												fontWeight: 700,
												fontSize: '15.5px',
												color: '#0f172a',
												lineHeight: 1.3,
												wordBreak: 'break-word',
												display: '-webkit-box',
												WebkitLineClamp: 2,
												WebkitBoxOrient: 'vertical',
												overflow: 'hidden',
											}}
										>
											{file.fileName}
										</Typography>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.4 }}>
											{file.documentType && (
												<Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
													{file.documentType}
												</Typography>
											)}
											{file.documentType && <Typography sx={{ fontSize: '13px', color: '#cbd5e1' }}>•</Typography>}
											<Typography sx={{ fontSize: '13px', color: '#64748b' }}>
												{file.expiryDate ? `Expires ${dayjs(file.expiryDate).format('MMM D, YYYY')}` : 'No expiry'}
											</Typography>
											{expiry && (
												<Box
													component="span"
													sx={{
														fontSize: '12px',
														fontWeight: 700,
														color: expiry.color,
														bgcolor: expiry.bg,
														px: 1,
														py: 0.25,
														borderRadius: '999px',
													}}
												>
													{expiry.label}
												</Box>
											)}
										</Box>
									</Box>
								</Box>

								{associations.length > 0 && (
									<Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', px: 1.75, pb: 1.25 }}>
										{associations.map((a) => (
											<Chip
												key={`${a.kind}-${a.label}`}
												size="small"
												label={a.label}
												icon={ASSOCIATION_CHIP[a.kind].icon}
												sx={{
													height: 28,
													fontSize: '12.5px',
													bgcolor: ASSOCIATION_CHIP[a.kind].bg,
													'& .MuiChip-icon': { fontSize: 16, color: '#475569' },
												}}
											/>
										))}
									</Box>
								)}

								{/* View / email / download, spread across the card's foot so each
								    is an easy thumb target. */}
								<Box
									sx={{
										display: 'flex',
										justifyContent: 'space-around',
										alignItems: 'center',
										borderTop: '1px solid #eef2f6',
										py: 0.5,
										'& .MuiIconButton-root': { width: 'auto', p: 1.25 },
										'& .MuiIconButton-root svg': { fontSize: '26px !important' },
									}}
								>
									{file.action}
								</Box>
							</Card>
						);
					})
				) : (
					<Box sx={{ textAlign: 'center', py: 6, px: 2, color: '#64748b' }}>
						<FolderOpenOutlinedIcon sx={{ fontSize: 44, color: '#cbd5e1' }} />
						<Typography sx={{ fontWeight: 600, color: '#334155', mt: 1 }}>
							{globalFilter ? 'No matching documents' : 'No documents yet'}
						</Typography>
						<Typography sx={{ fontSize: '14px', mt: 0.5 }}>
							{globalFilter
								? 'Try a different search.'
								: 'Documents for your vehicle, trailer and groups show up here.'}
						</Typography>
					</Box>
				)}
			</Box>
		</Box>
	);
};

export default DocumentMobile;
