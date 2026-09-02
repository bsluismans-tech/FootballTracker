// Een voetbalseizoen loopt (in België) grofweg van augustus t.e.m. mei.
// We rekenen alles vanaf juli (maand-index 6) bij het "nieuwe" seizoen.
export const getSeasonId = (date: Date | string = new Date()): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 = januari
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
};
