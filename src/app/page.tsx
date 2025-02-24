'use client';

import { Container, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { chartData } from '~/lib';

console.dir(chartData, { depth: 99 })

export default function Home() {
  return (
    <Container>
      <LineChart height={300} {...chartData} />
      <Typography>You'll save {`$${chartData.series[0].data!.at(-1)!.toFixed(2)}`} if you BNPL</Typography>
    </Container>
  );
}
