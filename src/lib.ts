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

const repaymentSchedule_upfront: { [date: string]: number | undefined } = {};
const repaymentSchedule_bnpl: { [date: string]: number | undefined } = {};

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

let balanceOnWhichInterestIsCharged_upfront = 0;
let balanceOnWhichInterestIsCharged_bnpl = 0;

let totalInterest_upfront = 0;
let totalInterest_bnpl = 0;
let totalSavings = 0;

const savingChart_xAxisData: any[] = [];
const savingChart_seriesAData: (number | null)[] = [];
const savingChart_seriesBData: (number | null)[] = [];

const savingChartData: LineChartProps = {
  xAxis: [
    {
      data: savingChart_xAxisData,
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
      data: savingChart_seriesAData,
      showMark: ({ position: epochDay }) => repaymentSchedule_bnpl[LocalDate.ofEpochDay(epochDay as number).toString()] !== undefined,
      valueFormatter: (value) => value == null ? null : '$' + value.toFixed(2),
      curve: 'catmullRom',
    },
    {
      yAxisId: 'savings',
      data: savingChart_seriesBData,
      showMark: false,
      valueFormatter: (value) => value == null ? null : '$' + value.toFixed(2),
      curve: 'stepAfter',
    },
  ],
};

const spendingChart_seriesAData: (number | null)[] = [];
const spendingChart_seriesBData: (number | null)[] = [];

const spendingChartData: LineChartProps = {
  xAxis: [
    {
      data: savingChart_xAxisData,
      label: 'date',
      valueFormatter: (epochDay: number) => LocalDate.ofEpochDay(epochDay).toString(),
    },
  ],
  series: [
    {
      data: spendingChart_seriesAData,
      valueFormatter: (value) => value == null ? null : '$' + value.toFixed(2),
      showMark: ({ position: epochDay }) => repaymentSchedule_upfront[LocalDate.ofEpochDay(epochDay as number).toString()] !== undefined,
      curve: 'stepAfter',
    },
    {
      data: spendingChart_seriesBData,
      valueFormatter: (value) => value == null ? null : '$' + value.toFixed(2),
      showMark: ({ position: epochDay }) => repaymentSchedule_bnpl[LocalDate.ofEpochDay(epochDay as number).toString()] !== undefined,
      curve: 'stepAfter',
    },
  ],
};

let totalSpend_upfront = 0;
let totalSpend_bnpl = 0;

for (let date = iterateFrom; date.isBefore(iterateTo) || date.isEqual(iterateTo); date = date.plus(increment)) {
  const dateString = date.toString();

  const payment_upfront = repaymentSchedule_upfront[dateString];
  totalSpend_upfront += payment_upfront ?? 0;
  balanceOnWhichInterestIsCharged_upfront += payment_upfront ?? 0;
  spendingChart_seriesAData.push(totalSpend_upfront);

  const payment_bnpl = repaymentSchedule_bnpl[dateString];
  totalSpend_bnpl += payment_bnpl ?? 0;
  balanceOnWhichInterestIsCharged_bnpl += payment_bnpl ?? 0;
  spendingChart_seriesBData.push(totalSpend_bnpl);

  const dailyInterest_upfront = balanceOnWhichInterestIsCharged_upfront * yearlyInterestRate / daysInYear;
  totalInterest_upfront += dailyInterest_upfront;

  const dailyInterest_bnpl = balanceOnWhichInterestIsCharged_bnpl * yearlyInterestRate / daysInYear;
  totalInterest_bnpl += dailyInterest_bnpl;

  // charge interest (daily)
  balanceOnWhichInterestIsCharged_upfront += dailyInterest_upfront;
  balanceOnWhichInterestIsCharged_bnpl += dailyInterest_bnpl;

  const savings = dailyInterest_upfront - dailyInterest_bnpl;
  totalSavings += savings;

  savingChart_xAxisData.push(date.toEpochDay());
  savingChart_seriesAData.push(totalSavings);
  savingChart_seriesBData.push(savings);

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

export { savingChartData, spendingChartData };