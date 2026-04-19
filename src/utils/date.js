const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const startOfUtcDay = (value = new Date()) => {
  const date = new Date(value);

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

export const addUtcDays = (value, days) => {
  const date = startOfUtcDay(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

export const isSameUtcDay = (firstValue, secondValue) =>
  startOfUtcDay(firstValue).getTime() === startOfUtcDay(secondValue).getTime();

export const formatUtcDate = (value) => startOfUtcDay(value).toISOString().split('T')[0];

export const compareDateOnly = (firstValue, secondValue) =>
  formatUtcDate(firstValue) === formatUtcDate(secondValue);

export const getRecentUtcDates = (days) =>
  Array.from({ length: days }, (_, index) => addUtcDays(new Date(), -(days - index - 1)));

export { DAY_IN_MS };
