// Een kwart duurt normaal 15 minuten. Duurt het toch langer (extra tijd), dan tonen we dat
// als "15+n'" i.p.v. gewoon "17'", zodat meteen duidelijk is dat het om blessuretijd gaat.
export const QUARTER_DURATION_MINUTES = 15;

export const formatMinute = (minute: number): string => {
  if (minute <= QUARTER_DURATION_MINUTES) return `${minute}'`;
  return `${QUARTER_DURATION_MINUTES}+${minute - QUARTER_DURATION_MINUTES}'`;
};

// Berekent de huidige minuut van een kwart. Is het kwart al afgelopen (endedAt vastgelegd, zie
// LiveMatch's handleNext), dan bevriezen we op de minuut van dat moment — anders zou het
// bewerken van een wedstrijd lang na afloop (bv. een uur later) tot een onmogelijke tijd zoals
// "15+60'" leiden, en zou elk event dat je er dan nog aan toevoegt diezelfde absurde minuut
// krijgen. Zolang het kwart nog bezig is (geen endedAt) tellen we gewoon live door.
export const getQuarterMinute = (quarter: { startedAt?: string; endedAt?: string }): number => {
  if (!quarter.startedAt) return 1;
  const referenceTime = quarter.endedAt ? new Date(quarter.endedAt).getTime() : Date.now();
  const elapsedMs = referenceTime - new Date(quarter.startedAt).getTime();
  return Math.max(1, Math.floor(elapsedMs / 60000) + 1);
};
