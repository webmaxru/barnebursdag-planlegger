import { useEffect } from 'react';
import Footer from './Footer';

type ContentPageProps = {
  path: string;
};

const pages = {
  '/om-kakeklar': {
    title: 'Om Kakeklar',
    description: 'Slik ble Kakeklar laget, hvem den er for, og hvordan beregningene fungerer.',
    content: (
      <>
        <p className="content-lead">Kakeklar er laget for foreldre som vil planlegge en hyggelig barnebursdag uten å gjette seg frem til mengdene.</p>
        <h2>Et praktisk verktøy for norske bursdager</h2>
        <p>Velg alder, barn, voksne og matvalg, så lager Kakeklar en handleliste med avrundede pakningsstørrelser. Listen dekker mat, drikke, servise, pynt og en enkel sjekkliste. Du kan endre forslagene selv når du kjenner gjestene eller menyen bedre.</p>
        <p>Rådene er bevisste tommelfingerregler, ikke fasitsvar. Barn spiser ulikt, og en bursdag hjemme er annerledes enn en feiring i barnehagen. Derfor viser vi anbefalinger som er lette å justere.</p>
        <h2>Hvem står bak?</h2>
        <p>Kakeklar er et norsk, selvstendig prosjekt laget av Maxim Salnikov. Prosjektet utvikles åpent, og du kan følge arbeidet eller melde fra om feil via <a href="https://github.com/webmaxru/barnebursdag-planlegger">GitHub</a> eller <a href="https://www.linkedin.com/in/webmax/" rel="noopener noreferrer">LinkedIn</a>.</p>
        <h2>Hvordan beregningene virker</h2>
        <p>Motoren kombinerer antall gjester med aldersintervaller, målgruppe og varetype. Behovet rundes opp til hele pakker slik at handlelisten blir gjennomførbar i en vanlig norsk butikk. Du kan lese mer om metodikken i <a href="/slik-beregner-kakeklar">guiden om beregningene</a>.</p>
        <p className="content-updated">Sist oppdatert: 7. august 2026</p>
      </>
    )
  },
  '/personvern': {
    title: 'Personvern',
    description: 'Personvernerklæring for Kakeklar.',
    content: (
      <>
        <p className="content-lead">Kakeklar er laget for å kunne brukes uten konto. Her forklarer vi kort hva som skjer med informasjon når du bruker tjenesten.</p>
        <h2>Ingen konto og ingen annonseprofil</h2>
        <p>Vi ber ikke om navn, e-postadresse eller fødselsdato. Planen din ligger i nettleserens URL når du deler en lenke. Tilpasninger av varelisten og at veiviseren er fullført kan lagres lokalt i nettleserens <code>localStorage</code>.</p>
        <h2>Analyse</h2>
        <p>Produksjonssiden kan bruke Microsoft Application Insights for enkel, cookieløs bruksstatistikk, som for eksempel om kalkulatoren blir brukt eller en handleliste blir skrevet ut. Vi bruker ikke informasjonskapsler, vedvarende bruker-ID eller øktlagring for denne analysen. Analyse er deaktivert når tjenesten ikke har en konfigurasjon for den.</p>
        <h2>Prisoppslag og eksterne tjenester</h2>
        <p>Hvis du velger «Sjekk pris», sendes søkeordet til vår server og videre til Kassal.app. Hvis du velger MENY-funksjonen, kan du bli sendt til meny.no, og nettleseren din kommuniserer med den tjenesten. Disse tjenestene har egne personvernregler.</p>
        <h2>Dine valg og kontakt</h2>
        <p>Du kan slette lokale data i nettleserens innstillinger. For spørsmål om personvern, bruk <a href="https://github.com/webmaxru/barnebursdag-planlegger/issues">GitHub Issues</a> eller kontakt utvikleren via <a href="https://www.linkedin.com/in/webmax/" rel="noopener noreferrer">LinkedIn</a>.</p>
        <p className="content-updated">Sist oppdatert: 7. august 2026</p>
      </>
    )
  },
  '/kontakt': {
    title: 'Kontakt Kakeklar',
    description: 'Slik gir du tilbakemelding på Kakeklar.',
    content: (
      <>
        <p className="content-lead">Har du funnet en feil, mangler en matvare eller har du et forslag? Tilbakemeldinger gjør kalkulatoren bedre for flere foreldre.</p>
        <h2>Feil og forslag</h2>
        <p>Bruk <a href="https://github.com/webmaxru/barnebursdag-planlegger/issues">GitHub Issues</a> for konkrete feil og forbedringsforslag. Skriv gjerne hvilken alder, hvor mange gjester og hvilken enhet du brukte. Ikke del navn på barn eller annen privat informasjon.</p>
        <h2>Følg prosjektet</h2>
        <p>Du finner kildekoden på <a href="https://github.com/webmaxru/barnebursdag-planlegger">GitHub</a>. Utvikleren kan også kontaktes via <a href="https://www.linkedin.com/in/webmax/" rel="noopener noreferrer">LinkedIn</a>.</p>
        <h2>Ansvar for forslagene</h2>
        <p>Kakeklar gir generelle planleggingsforslag. Sjekk alltid ingredienslister og allergenmerking på emballasjen, og gjør egne vurderinger for barn med allergier eller andre behov.</p>
      </>
    )
  },
  '/guider': {
    title: 'Guider til barnebursdag',
    description: 'Praktiske guider om matmengder, barnehagebursdag og allergier.',
    content: (
      <>
        <p className="content-lead">Korte, praktiske råd fra Kakeklar for deg som planlegger bursdag for barn i barnehage- og småskolealder.</p>
        <div className="content-links">
          <a className="content-link" href="/slik-beregner-kakeklar"><strong>Slik beregner Kakeklar mengdene</strong><span>Forstå aldersintervaller, voksne, porsjoner og pakningsstørrelser.</span></a>
          <a className="content-link" href="/barnehagebursdag"><strong>Barnebursdag i barnehagen</strong><span>En enkel plan for mat, allergier, opprydding og informasjon.</span></a>
          <a className="content-link" href="/allergier-i-barnebursdag"><strong>Allergier i barnebursdag</strong><span>Slik lager du en tryggere og mindre stressende handleliste.</span></a>
        </div>
      </>
    )
  },
  '/slik-beregner-kakeklar': {
    title: 'Slik beregner Kakeklar mengdene',
    description: 'Metoden bak Kakeklars aldersjusterte handleliste.',
    content: (
      <>
        <p className="content-lead">Kakeklar prøver ikke å vite nøyaktig hvor mye hvert barn spiser. Målet er et godt utgangspunkt som er enkelt å justere.</p>
        <h2>1. Antall barn og voksne</h2>
        <p>Barn og voksne kan telles ulikt for varer som hovedsakelig går til barna. Voksne tas likevel med når de sannsynligvis bruker drikke, servise eller mat. På den måten blir listen mer realistisk for en familiefeiring.</p>
        <h2>2. Alder påvirker appetitt</h2>
        <p>Forslagene skaleres etter aldersintervaller: yngre barn får mindre porsjoner enn barn i tidlig skolealder. Dette er en praktisk forenkling, ikke en ernæringsmessig anbefaling.</p>
        <h2>3. Hele pakker i handlelisten</h2>
        <p>Butikker selger pølser, lomper, servietter og drikke i pakker. Kakeklar runder derfor opp til en hel pakke i stedet for å vise 1,4 pakker. Det kan bli litt til overs, men du slipper å stå uten nok til alle.</p>
        <h2>4. Tilpass før du handler</h2>
        <p>Bruk listen som et forslag. Juster for meny, varighet, om barna allerede har spist, og om det serveres kake eller is. Ved usikkerhet er det lurt å ha litt ekstra av drikke og enkle alternativer.</p>
      </>
    )
  },
  '/barnehagebursdag': {
    title: 'Barnebursdag i barnehagen',
    description: 'Praktiske råd når bursdagen feires i barnehagen.',
    content: (
      <>
        <p className="content-lead">En barnehagefeiring fungerer best når den er enkel, forutsigbar og avklart med personalet på forhånd.</p>
        <h2>Avklar rammene først</h2>
        <p>Spør barnehagen om antall barn, tidspunkt, allergier, regler for mat og om de ønsker at foreldrene tar med pynt eller godteposer. Noen barnehager har egne sukker- og bursdagsrutiner.</p>
        <h2>Velg mat som er lett å servere</h2>
        <p>Små porsjoner, ferdig oppskåret frukt og drikke i tydelig merkede beholdere er ofte enklere enn mange ulike retter. Ta med servietter og en plan for søppel og rester.</p>
        <h2>Ta allergier på alvor</h2>
        <p>Bruk informasjonen fra barnehagen, hold alternativer adskilt og sjekk emballasjen hver gang. Ikke gjett når du er usikker på en ingrediens.</p>
      </>
    )
  },
  '/allergier-i-barnebursdag': {
    title: 'Allergier i barnebursdag',
    description: 'En sjekkliste for tryggere matplanlegging når gjester har allergier.',
    content: (
      <>
        <p className="content-lead">God planlegging gjør det lettere å inkludere alle. Kakeklar kan hjelpe med å huske alternativer, men erstatter ikke medisinske råd eller emballasjekontroll.</p>
        <h2>Få informasjon tidlig</h2>
        <p>Spør foresatte eller barnehagen konkret hva barnet må unngå, og om det finnes en trygg merkevare eller matpakke. «Uten nøtter» og «uten spor av» kan bety ulike ting for ulike familier.</p>
        <h2>Hold maten oversiktlig</h2>
        <p>Server allergivennlige alternativer i egne skåler, bruk rene redskaper og merk dem tydelig. Unngå å flytte mat mellom beholdere uten å sjekke innholdet.</p>
        <h2>Bruk kalkulatoren som huskeliste</h2>
        <p>Velg relevante restriksjoner i veiviseren, les bytteforslagene, og kontroller deretter alle produkter i butikken. Ved alvorlig allergi bør foresatte ta den endelige vurderingen.</p>
      </>
    )
  }
} as const;

export function isContentPath(path: string) {
  return path in pages;
}

export default function ContentPage({ path }: ContentPageProps) {
  const page = pages[path as keyof typeof pages] || pages['/guider'];
  useEffect(() => {
    document.title = `${page.title} · Kakeklar`;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', page.description);
    const canonical = document.querySelector('link[rel="canonical"]');
    canonical?.setAttribute('href', `https://kakeklar.no${path}`);
  }, [page.description, page.title, path]);

  return (
    <div className="content-page">
      <a className="content-back" href="/">← Til Kakeklar</a>
      <header className="content-header">
        <p className="hero-eyebrow">Kakeklar · kunnskap</p>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
      </header>
      <main className="content-body">{page.content}</main>
      <Footer />
    </div>
  );
}
