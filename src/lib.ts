import { LocalDate, Period } from '@js-joda/core';
import { LineChartProps } from '@mui/x-charts';

type Frequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'yearly';

const frequencyToPeriod = (frequency: Frequency): Period => {
  switch (frequency) {
    case 'daily': return Period.ofDays(1);
    case 'weekly': return Period.ofWeeks(1);
    case 'fortnightly': return Period.ofWeeks(2);
    case 'monthly': return Period.ofMonths(1);
    case 'yearly': return Period.ofYears(1);
  }
}

const now = LocalDate.now();

const deductions = [
  {
    totalAmount: 1000.00,
    repayment: {
      count: 4,
      frequency: 'fortnightly' as Frequency,
    },
  },
];

const repaymentSchedule_upfront: { [date: string]: number } = {};
const repaymentSchedule_bnpl: { [date: string]: number } = {};

let totalSpend = 0;
let latestRepaymentDate: LocalDate = undefined!;

for (const deduction of deductions) {
  // upfront schedule
  const upfrontPaymentDate = now;
  const upfrontPaymentDateString = upfrontPaymentDate.toString();
  if (repaymentSchedule_upfront[upfrontPaymentDateString] === undefined) {
    repaymentSchedule_upfront[upfrontPaymentDateString] = 0;
  }
  repaymentSchedule_upfront[upfrontPaymentDateString] += deduction.totalAmount;
  totalSpend += deduction.totalAmount;

  // bnpl schedule
  const repaymentAmount = deduction.totalAmount / deduction.repayment.count;
  let lastRepaymentDate: LocalDate | undefined = undefined;
  for (let repaymentNumber = 1; repaymentNumber <= deduction.repayment.count; repaymentNumber += 1) {
    let repaymentDate: LocalDate;
    if (lastRepaymentDate === undefined) {
      repaymentDate = now;
    } else {
      repaymentDate = lastRepaymentDate.plus(frequencyToPeriod(deduction.repayment.frequency));
    }

    const repaymentDateString = repaymentDate.toString();

    if (repaymentSchedule_bnpl[repaymentDateString] === undefined) {
      repaymentSchedule_bnpl[repaymentDateString] = 0;
    }
    repaymentSchedule_bnpl[repaymentDateString] += repaymentAmount;

    lastRepaymentDate = repaymentDate;

    if (latestRepaymentDate === undefined || latestRepaymentDate.isBefore(lastRepaymentDate)) {
      latestRepaymentDate = lastRepaymentDate;
    }
  }
}

if (latestRepaymentDate === undefined) {
  throw 'Failed to determine latest repayment date';
}

const yearlyInterestRate = 0.06;
const daysInYear = 365;

const iterateFrom = now;
const iterateTo = latestRepaymentDate;
const increment = Period.ofDays(1);

let runningBalalnce_upfront = 0;
let runningBalance_bnpl = 0;

let totalInterest_upfront = 0;
let totalInterest_bnpl = 0;
let totalSavings = 0;

const xAxisData: any[] = [];
const seriesAData: (number | null)[] = [];
const seriesBData: (number | null)[] = [];
const chartData: LineChartProps = {
  xAxis: [
    {
      data: xAxisData,
      label: 'date',
      valueFormatter: (epochDay: number) => LocalDate.ofEpochDay(epochDay).toString(),
    },
  ],
  yAxis: [
    { id: 'savings', label: 'savings' },
    { id: 'totalSavings', label: 'total savings' },
  ],
  leftAxis: {
    axisId: 'totalSavings',
  },
  rightAxis: {
    axisId: 'savings',
  },
  series: [
    {
      yAxisId: 'totalSavings',
      data: seriesAData,
      showMark: ({ position: epochDay }) => repaymentSchedule_bnpl[LocalDate.ofEpochDay(epochDay as number).toString()] !== undefined,
      valueFormatter: (value) => value == null ? null : '$' + value.toFixed(2),
      curve: 'natural',
    }, {
      yAxisId: 'savings',
      data: seriesBData,
      showMark: false,
      valueFormatter: (value) => value == null ? null : '$' + value.toFixed(2),
      curve: 'stepAfter',
    }
  ],
};

for (let date = iterateFrom; date.isBefore(iterateTo) || date.isEqual(iterateTo); date = date.plus(increment)) {
  const payment_upfront = repaymentSchedule_upfront[date.toString()] ?? 0;
  runningBalalnce_upfront += payment_upfront;

  const payment_bnpl = repaymentSchedule_bnpl[date.toString()] ?? 0;
  runningBalance_bnpl += payment_bnpl;

  const dailyInterest_upfront = runningBalalnce_upfront * yearlyInterestRate / daysInYear;
  totalInterest_upfront += dailyInterest_upfront;

  const dailyInterest_bnpl = runningBalance_bnpl * yearlyInterestRate / daysInYear;
  totalInterest_bnpl += dailyInterest_bnpl;

  // charge interest (daily)
  runningBalalnce_upfront += dailyInterest_upfront;
  runningBalance_bnpl += dailyInterest_bnpl;

  const savings = dailyInterest_upfront - dailyInterest_bnpl;
  totalSavings += savings;

  xAxisData.push(date.toEpochDay());
  seriesAData.push(totalSavings);
  seriesBData.push(savings);

  /* console.log({
    date: date.toString(),
    runningBalance_upfront: '$' + runningBalalnce_upfront.toFixed(2),
    interest_upfront: '$' + dailyInterest_upfront.toFixed(2),
    totalInterest_upfront: '$' + totalInterest_upfront.toFixed(2),
    runningBalance_bnpl: '$' + runningBalance_bnpl.toFixed(2),
    interest_bnpl: '$' + dailyInterest_bnpl.toFixed(2),
    totalInterest_bnpl: '$' + totalInterest_bnpl.toFixed(2),
    savings: '$' + savings.toFixed(2),
    totalSavings: '$' + totalSavings.toFixed(2),
    repayments: '$' + payment_bnpl.toFixed(2),
  }); */
}

export { chartData };