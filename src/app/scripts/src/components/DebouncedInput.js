import React from 'react';
import { useState, useEffect } from 'react';
import { TextField } from '@mui/material';

const DebouncedInput = ({ value: initialValue, onChange, debounce = 500, sx, ...props }) => {
	const [value, setValue] = useState(initialValue);

	useEffect(() => {
		setValue(initialValue);
	}, [initialValue]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			onChange(value);
		}, debounce);

		return () => clearTimeout(timeout);
	}, [value]);

	return (
		<TextField
			variant="outlined"
			sx={{
				'& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#fff' },
				// Drive's page sets every input to 3rem / 1.5rem with !important (app.css);
				// this is the field's real size. 16px also stops iOS zooming on focus.
				'& .MuiInputBase-input': {
					padding: '12px 4px',
					height: 'auto !important',
					fontSize: '16px !important',
				},
				...sx,
			}}
			{...props}
			value={value}
			onChange={(e) => setValue(e.target.value)}
		/>
	);
};

export default DebouncedInput;
