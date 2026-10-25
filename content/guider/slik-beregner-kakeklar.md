---
{
  "title": "Slik beregner Kakeklar mengdene",
  "description": "Hvordan Kakeklar regner ut handlelisten: aldersgrupper, mengde per barn og per bord, avrunding til hele pakker, brødbuffer, voksne, allergier og prisspenn.",
  "slug": "slik-beregner-kakeklar",
  "section": "guider",
  "category": "mengder",
  "date": "2026-10-17",
  "updated": "2026-10-25",
  "related": [
    "hvor-mye-mat-til-barnebursdag",
    "hvor-mye-drikke-til-barnebursdag",
    "budsjett-for-barnebursdag",
    "allergier-i-barnebursdag"
  ],
  "faq": [
    {
      "q": "Hvilke aldersgrupper bruker Kakeklar?",
      "a": "Kalkulatoren deler inn i tre grupper: 3–4 år, 5–6 år og 7–9 år. Yngre barn regnes som 3–4 år, og barn over 9 som 7–9 år."
    },
    {
      "q": "Hvorfor får jeg flere pølser enn jeg trenger?",
      "a": "Kakeklar runder alltid opp til hele pakker. Trenger du 20 pølser og pakken har 8, får du 3 pakker, altså 24 pølser."
    },
    {
      "q": "Regner Kakeklar med voksne?",
      "a": "Ja, hvis du legger inn voksne som blir. De regnes med på mat, drikke og servise, med samme mengde som 7–9-åringer, men ikke på godteposer og ballonger."
    },
    {
      "q": "Kan jeg endre mengdene i kalkulatoren?",
      "a": "Ja. Under «Tilpass» kan du endre mengder per aldersgruppe, pakkestørrelser og priser, skru varer av og på, og eksportere eller importere varelisten som en JSON-fil."
    },
    {
      "q": "Er prisene i Kakeklar oppdaterte?",
      "a": "Standardprisene er typiske spenn per pakke, ikke dagens pris i en bestemt butikk. Sjekk alltid prisen der du handler."
    }
  ],
  "sources": []
}
---
Jeg bygde Kakeklar rundt tre spørsmål. Hvor mange barn kommer, hvor gamle er de, og hva slags fest blir det (hjemme eller i barnehagen, pølser eller pizza, voksne og allergier)? Hver vare har en mengde per barn, per gjest eller per bord, og resultatet rundes alltid opp til hele pakker. Her er metoden forklart enkelt, og her står også hva kalkulatoren ikke gjør.

## Tre aldersgrupper

Barn spiser og drikker ulikt etter alder. Kakeklar bruker tre aldersgrupper:

| Alder | Gruppe |
|---|---|
| Til og med 4 år | 3–4 år |
| 5 og 6 år | 5–6 år |
| 7 år og eldre | 7–9 år |

Alle varer som regnes «per barn», har en egen mengde for hver gruppe. Noen eksempler fra standardlisten:

| Vare | 3–4 år | 5–6 år | 7–9 år |
|---|---|---|---|
| Pølser | 1,5 | 2 | 2,5 |
| Lomper / pølsebrød | 1,5 | 2 | 2,5 |
| Minipizza | 1,5 | 2 | 2,5 |
| Bursdagskake (biter) | 1 | 1 | 1,25 |
| Frukt, oppkuttet | 120 g | 130 g | 140 g |
| Snacks | 30 g | 35 g | 40 g |
| Saft, ferdig blandet | 4 dl | 5 dl | 6 dl |
| Brus (boks) | 0 | 0 | 1 |
| Smågodt til poser | 50 g | 100 g | 125 g |

Tallene finner du forklart nærmere i [guiden om mat per barn](/guider/hvor-mye-mat-til-barnebursdag) og [guiden om drikke](/guider/hvor-mye-drikke-til-barnebursdag).

## Fem måter å regne på

Ikke alt passer å regne per barn. Hver vare har derfor én av fem beregningsmåter:

- **Per barn, etter alder:** mat og drikke, som i tabellen over.
- **Per gjest:** et fast antall per person, for eksempel 1,2 tallerkener og 1,2 kopper (litt ekstra fordi noen søler eller bytter), 2 servietter, ett sett bestikk og 2 ballonger per gjest.
- **Per bord:** noe man deler. Kakeklar regner én ketchup per 20 gjester, én sennep per 25, én boks stekt løk per 15, én papirduk per 8 og én iskake per 10. Antallet rundes opp, så 21 gjester gir to flasker ketchup.
- **Antall etter alder:** kakelys er alder pluss én.
- **Fast antall:** én bursdagskrone, uansett antall gjester.

## Avrunding til hele pakker

Du kan ikke kjøpe 1,5 pakke pølser. Derfor regner Kakeklar først ut hvor mye du trenger, og runder så opp til hele pakker. Pølser, lomper og pølsebrød regnes i 8-pakninger, potetgull i poser på 165 g, og en flaske saftkonsentrat regnes som ca. 3 liter ferdig saft.

Eksempel: 10 barn på 5 år trenger 20 pølser. Med 8 i pakken blir det 3 pakker, altså 24 pølser. De fire ekstra er buffer.

## 15 prosent ekstra brød

Når hovedretten er pølser, kan du velge hvor stor andel som skal være lomper og hvor mye som skal være pølsebrød. Standard er halvparten av hver. Fordi barn ofte ombestemmer seg, legger Kakeklar 15 prosent ekstra på begge brødtypene.

For de samme 10 barna blir det 20 × 0,5 × 1,15 = 11,5 lomper, rundet opp til 12, altså 2 pakker. Det samme for pølsebrød.

## Voksne som blir

Legger du inn voksne, regnes de med på mat, drikke og servise. For varer som regnes per barn, får voksne samme mengde som 7–9-åringer. Med 2 voksne i eksemplet over blir det 20 + 2 × 2,5 = 25 pølser, altså 4 pakker. Voksne regnes ikke med på godteposer, smågodt og ballonger.

## Barnehage eller hjemme

I barnehagemodus fjernes varer som er merket «bare hjemme»: kake, iskake, snacks, brus, godteposer og godteri, og de allergivennlige kake- og godterialternativene. Resten, som frukt, drikke, servise og bursdagskrone, blir stående. Valget er basert på at mange barnehager ønsker mindre søtt ved feiringer, men sjekk alltid hva din barnehage sier.

## Allergier

Du kan skru på gluten, melk, egg, nøtter og uten svin, og skrive hvor mange gjester det gjelder. Da legger Kakeklar til en egen vare beregnet for akkurat det antallet, for eksempel glutenfri lompe, melkefri eller eggfri kake, nøttefritt godteri eller kyllingpølser uten svin. Hvis en vanlig vare på listen ofte inneholder allergenet, vises et notat ved den. Kalkulatoren vet ikke hva som står på pakken i din butikk, så les alltid ingredienslisten. Se [guiden om allergier](/guider/allergier-i-barnebursdag).

## Priser er spenn

Hver vare med pris har et typisk spenn per pakke, og totalen er antall pakker ganget med spennet. Frukt og smågodt har ingen standardpris. Prisene er ment som et grovt anslag, ikke dagens pris i en bestemt butikk. I [budsjettguiden](/guider/budsjett-for-barnebursdag) har jeg sammenlignet anslagene med ordinære priser hos Oda 25. oktober 2026. Kalkulatoren kan også hente faktiske priser fra norske butikker for enkeltvarer når det er tilgjengelig.

## Slik endrer du varelisten

Alt i varelisten kan endres under «Tilpass». Der kan du:

- endre navn, enhet og beregningsmåte
- endre mengde per aldersgruppe, antall per gjest eller gjester per bord
- endre pakkestørrelse og prisspenn
- skru varer av og på (sugerør, vimpler, premier og pinata er av som standard)
- eksportere varelisten som JSON-fil og importere den igjen, for eksempel for å dele med en annen forelder
- tilbakestille til standardlisten

Endringene lagres i nettleseren din.

## Begrensninger

Kakeklar er en forenkling. Mengdene er gjennomsnitt for en vanlig barnebursdag, ikke ernæringsråd. Barn er forskjellige, og en gjeng fotballspillere på 9 år spiser mer enn en rolig gruppe treåringer. Festens lengde endrer foreløpig ikke mengdene. Kalkulatoren kjenner ikke til hva du har hjemme fra før, og den erstatter ikke en samtale med foreldrene om allergier.

Bruk tallene som et trygt utgangspunkt, og juster etter det du kjenner til. Prøv selv i [kalkulatoren på forsiden](/).
