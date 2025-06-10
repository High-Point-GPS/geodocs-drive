import React from 'react';
import DebouncedInput from './DebouncedInput';

function Filter({ column, table, name }) {
    const columnFilterValue = column.getFilterValue();

    return (
        <DebouncedInput
            value={columnFilterValue ?? ''}
            onChange={(value) => column.setFilterValue(value)}
            placeholder={`Search ${name}`}
        />
    );
}

export default Filter;
