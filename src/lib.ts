import { ChronoField, ChronoUnit, Duration, LocalDate, Period, TemporalUnit } from '@js-joda/core';
import { assert } from 'node:console';

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

const deductions = [
  {
    totalAmount: 1000.00,
    repayment: {
      count: 4,
      frequency: 'fortnightly' as Frequency,
    },
  },
];

const now = LocalDate.now();

const repaymentSchedule: { [date: string]: number } = {};

let latestRepaymentDate: LocalDate = undefined!;

for (const deduction of deductions) {
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

    if (repaymentSchedule[repaymentDateString] === undefined) {
      repaymentSchedule[repaymentDateString] = 0;
    }
    repaymentSchedule[repaymentDateString] -= repaymentAmount;

    lastRepaymentDate = repaymentDate;

    if (latestRepaymentDate === undefined || latestRepaymentDate.isBefore(lastRepaymentDate)) {
      latestRepaymentDate = lastRepaymentDate;
    }
  }
}

assert(latestRepaymentDate !== undefined, 'Failed to determine latest repayment date');

const currentLoanAccountBalance = 300_000;
const currentOffsetAccountBalance = 80_000;
const currentOffsetLoanAccountBalance = currentLoanAccountBalance - currentOffsetAccountBalance;

const yearlyInterestRate = 0.06;
const daysInYear = 365;

console.log({ yearlyInterestRate, daysInYear })

const interestChargedFrequency: Frequency = 'monthly';

console.log(repaymentSchedule);

const iterateFrom = now;
const iterateFor = Period.ofWeeks(8);
const iterateTo = latestRepaymentDate;
const increment = Period.ofDays(1);

let totalAccruedInterest = 0;

let runningBalance_upfront = 1000;
let runningBalance_bnpl = 0;

let totalInterest_upfront = 0;
let totalInterest_bnpl = 0;
let totalSavings = 0;

for (let date = iterateFrom; date.isBefore(iterateTo) || date.isEqual(iterateTo); date = date.plus(increment)) {
  const delta_bnpl = repaymentSchedule[date.toString()] ?? 0;
  runningBalance_bnpl += delta_bnpl;

  const interest_upfront = runningBalance_upfront * yearlyInterestRate / daysInYear;
  totalInterest_upfront += interest_upfront;

  const interest_bnpl = runningBalance_bnpl * yearlyInterestRate / daysInYear;
  totalInterest_bnpl += interest_bnpl;

  const savings = interest_upfront - interest_bnpl;
  totalSavings += savings;

  console.log({
    date: date.toString(),
    interest_upfront: '$' + interest_upfront.toFixed(2),
    totalInterest_upfront: '$' + totalInterest_upfront.toFixed(2),
    interest_bnpl: '$' + interest_bnpl.toFixed(2),
    totalInterest_bnpl: '$' + totalInterest_bnpl.toFixed(2),
    savings: '$' + savings.toFixed(2),
    totalSavings: '$' + totalSavings.toFixed(2),
    repayments: '$' + delta_bnpl.toFixed(2),
  });
}
