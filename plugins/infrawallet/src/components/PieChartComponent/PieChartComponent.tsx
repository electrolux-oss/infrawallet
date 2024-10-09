import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import { styled } from '@mui/material/styles';
import { HighlightItemData, PieChart, useDrawingArea } from '@mui/x-charts';
import React, { FC } from 'react';
import { formatCurrency } from '../../api/functions';
import { colorList } from '../constants';
import { PieChartComponentProps } from '../types';

const StyledText = styled('text')(({ theme }) => ({
  fill: theme.palette.text.primary,
  textAnchor: 'middle',
  dominantBaseline: 'central',
  fontSize: '1.2em',
}));

function PieCenterLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  const { width, height, left, top } = useDrawingArea();
  return (
    <StyledText x={left + width / 2} y={top + height / 2}>
      {children}
    </StyledText>
  );
}

export const PieChartComponent: FC<PieChartComponentProps> = ({
  categories,
  series,
  height,
  highlightedItem,
  highlightedItemSetter,
}) => {
  const data = [];
  let total = 0;
  if (series) {
    for (let i = 0; i < series.length; i++) {
      const label = categories ? categories[i] : 'No label';
      data.push({ id: label, value: series[i], label: label });
      total += series[i];
    }
  }

  const onHighlightChange = (highlighted: HighlightItemData | null) => {
    if (highlighted === null) {
      highlightedItemSetter(undefined);
      return;
    }

    const dataIndex = highlighted.dataIndex as number;
    if (categories) {
      highlightedItemSetter(categories[dataIndex]);
    }
  };

  return (
    <Paper sx={{ alignContent: 'center', height: height || 300 }}>
      {series === undefined ? (
        <div style={{ width: '60%', margin: 'auto' }}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : (
        <PieChart
          margin={{ left: 100 }}
          series={[
            {
              id: 'cost-summary',
              data: data,
              valueFormatter: value => {
                return formatCurrency(value.value);
              },
              highlightScope: { highlight: 'item', fade: 'global' },
              innerRadius: 70,
              outerRadius: 120,
            },
          ]}
          slotProps={{
            legend: {
              hidden: true,
            },
          }}
          colors={colorList}
          highlightedItem={
            highlightedItem ? { seriesId: 'cost-summary', dataIndex: categories?.indexOf(highlightedItem) } : null
          }
          onHighlightChange={onHighlightChange}
        >
          {data.length ? <PieCenterLabel>Total: {formatCurrency(total)}</PieCenterLabel> : <></>}
        </PieChart>
      )}
    </Paper>
  );
};
