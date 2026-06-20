export interface TimelineStep {
  when: string;
  tasks: string[];
}

export interface ChecklistSection {
  title: string;
  emoji: string;
  items: string[];
}

/** Planning timeline (from Norwegian barnebursdag research). */
export const TIMELINE: TimelineStep[] = [
  { when: '4–6 uker før', tasks: ['Bestem dato, tema, antall gjester og sted'] },
  { when: '2–3 uker før', tasks: ['Send invitasjoner', 'Be om svar (RSVP)', 'Spør om allergier'] },
  { when: '1–2 uker før', tasks: ['Kjøp pynt og servise', 'Bestill eller planlegg kaken'] },
  { when: 'Dagene før', tasks: ['Handle inn mat og drikke', 'Bekreft antall gjester'] },
  { when: 'Bursdagsdagen', tasks: ['Pynt og forbered mat', 'Fyll godteposer', 'Sett lys på kaken'] },
  { when: 'Etter festen', tasks: ['Rydd opp', 'Takk for gaver sammen med barnet'] }
];

/** Practical checklist shown on the result page and in the printout. */
export const CHECKLIST: ChecklistSection[] = [
  {
    title: 'Invitasjoner',
    emoji: '✉️',
    items: [
      'Hvem inviterer + sted og adresse',
      'Start- OG sluttidspunkt',
      'Be om svar (RSVP) – vær tydelig',
      'Spør om allergier og matpreferanser',
      'Del ikke ut i barnehage/skole hvis ikke hele gruppen er invitert'
    ]
  },
  {
    title: 'Mat & drikke',
    emoji: '🌭',
    items: [
      'Pølser med lompe eller brød',
      'Frukt og grønnsaker',
      'Saft og vann (brus for de største)',
      'Alternativ for allergikere / vegetar',
      'Handle inn alt i god tid'
    ]
  },
  {
    title: 'Kake',
    emoji: '🎂',
    items: [
      'Velg kaketype (sjokoladekake er en vinner)',
      'Bestill eller bak i god tid',
      'Kakelys = alder + 1, og fyrstikker/lighter',
      'Kakefat, kakespade og kniv'
    ]
  },
  {
    title: 'Pynt & servise',
    emoji: '🎈',
    items: [
      'Ballonger og norske flagg',
      'Tallerkener, kopper, bestikk, servietter',
      'Bordduk og evt. tema-pynt',
      'Bursdagskrone til bursdagsbarnet',
      'Tape/teip til å henge opp pynt'
    ]
  },
  {
    title: 'Aktiviteter & leker',
    emoji: '🎯',
    items: [
      'Skattejakt eller fiskedam',
      'Klassiske leker (stolleken, sette hale på grisen)',
      'Musikk-spilleliste',
      'Plan B ved dårlig vær'
    ]
  },
  {
    title: 'Premier & godteposer',
    emoji: '🍬',
    items: [
      '1 godtepose per gjest',
      'Premier til lekene',
      'Skriv navn på posene'
    ]
  },
  {
    title: 'Praktisk',
    emoji: '✅',
    items: [
      'Budsjett satt',
      'Antall gjester bekreftet',
      'Søppelposer (2–3)',
      'Kaffe/te til foreldre som blir',
      'Førstehjelp (plaster) + ekstra skift til bursdagsbarnet'
    ]
  }
];

export const BARNEHAGE_NOTE =
  'Barnehagefeiring: Helsedirektoratet anbefaler å begrense kake, godteri og saft. ' +
  'Vi viser frukt, bursdagskrone og sang i stedet for søtsaker.';
