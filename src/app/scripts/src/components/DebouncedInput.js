import React from 'react';
import { useState, useEffect } from 'react';
import { TextField } from '@mui/material';

const DebouncedInput = ({ value: initialValue, onChange, debounce = 500, ...props }) => {
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
			sx={{ width: '200px', }}
			size="medium"
			{...props}
			value={value}
			onChange={(e) => setValue(e.target.value)}
		/>
	);
};

export default DebouncedInput;
