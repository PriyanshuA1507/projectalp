import React from 'react';

const TableSkeleton = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="data-table-wrapper animate-pulse">
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i}>
                  <div className="mx-auto h-4 w-24 rounded-lg bg-indigo-100" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex}>
                    <div className="mx-auto h-4 w-20 rounded bg-gray-100" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableSkeleton;
