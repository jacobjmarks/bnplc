'use client';

import { Container, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { spendingChartData, savingChartData } from '~/lib';

export default function Home() {
  return (
    <Container>
      <LineChart height={300} {...spendingChartData} />
      <LineChart height={300} {...savingChartData} />
      <Typography>You'll save {`$${savingChartData.series[0].data!.at(-1)!.toFixed(2)}`} if you BNPL</Typography>
    </Container>
  );
}
