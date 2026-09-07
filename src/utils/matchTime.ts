// Een kwart duurt normaal 15 minuten. Duurt het toch langer (extra tijd), dan tonen we dat
// als "15+n'" i.p.v. gewoon "17'", zodat meteen duidelijk is dat het om blessuretijd gaat.
export const QUARTER_DURATION_MINUTES = 15;

export const formatMinute = (minute: number): string => {
  if (minute <= QUARTER_DURATION_MINUTES) return `${minute}'`;
  return `${QUARTER_DURATION_MINUTES}+${minute - QUARTER_DURATION_MINUTES}'`;
};
