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
      "a": "De fleste standardprisene er ordinære priser hos Oda, hentet 25. oktober 2026, fra billigste variant til kjent merke. Varer som Oda ikke selger, som kake, iskake, pynt og godteposer, har et grovt anslag. Sjekk alltid prisen der du handler."
    }
  ],
  "sources": [
    {
      "title": "Oda: ordinære priser hentet 25. oktober 2026",
      "url": "https://oda.com/no/"
    }
  ]
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

Du kan ikke kjøpe 1,5 pakke pølser. Derfor regner Kakeklar først ut hvor mye du trenger, og runder så opp til hele pakker. Lomper og pølsebrød regnes i pakker à 10, potetgull i poser på 200 g, og en flaske saftkonsentrat på 1,5 liter regnes som 7,5 liter ferdig saft. Grillpølser selges etter vekt. Pakkene hos Oda som oppgir både vekt og antall, ligger på 62–80 g per pølse, så Kakeklar regner en pakke på 600 g som 8 pølser.

Eksempel: 10 barn på 5 år trenger 20 pølser. Med 8 i pakken blir det 3 pakker (1,8 kg), altså rundt 24 pølser. De ekstra er buffer.

## 15 prosent ekstra brød

Når hovedretten er pølser, kan du velge hvor stor andel som skal være lomper og hvor mye som skal være pølsebrød. Standard er halvparten av hver. Fordi barn ofte ombestemmer seg, legger Kakeklar 15 prosent ekstra på begge brødtypene.

For de samme 10 barna blir det 20 × 0,5 × 1,15 = 11,5 lomper, rundet opp til 12, altså 2 pakker à 10. Det samme for pølsebrød.

## Voksne som blir

Legger du inn voksne, regnes de med på mat, drikke og servise. For varer som regnes per barn, får voksne samme mengde som 7–9-åringer. Med 2 voksne i eksemplet over blir det 20 + 2 × 2,5 = 25 pølser, altså 4 pakker. Voksne regnes ikke med på godteposer, smågodt og ballonger.

## Barnehage eller hjemme

I barnehagemodus fjernes varer som er merket «bare hjemme»: kake, iskake, snacks, brus, godteposer og godteri, og de allergivennlige kake- og godterialternativene. Resten, som frukt, drikke, servise og bursdagskrone, blir stående. Valget er basert på at mange barnehager ønsker mindre søtt ved feiringer, men sjekk alltid hva din barnehage sier.

## Allergier

Du kan skru på gluten, melk, egg, nøtter og uten svin, og skrive hvor mange gjester det gjelder. Da legger Kakeklar til en egen vare beregnet for akkurat det antallet, for eksempel glutenfri lompe, melkefri eller eggfri kake, nøttefritt godteri eller kyllingpølser uten svin. Hvis en vanlig vare på listen ofte inneholder allergenet, vises et notat ved den. Kalkulatoren vet ikke hva som står på pakken i din butikk, så les alltid ingredienslisten. Se [guiden om allergier](/guider/allergier-i-barnebursdag).

## Hvor prisene kommer fra

Hver vare med pris har et spenn per pakke, og totalen er antall pakker ganget med spennet. For de vanligste varene bruker jeg ordinære priser hos nettbutikken Oda, hentet 25. oktober 2026 (varer på tilbud er holdt utenfor). Den lave prisen er den billigste varianten som passer, den høye er som regel et kjent merke.

| Vare | Pakning i kalkulatoren | Produkter hos Oda (lav – høy pris) | Pris per pakke |
|---|---|---|---|
| Grillpølser | pakke 600 g (regnet som 8 stk) | Gilde Go' & Magrere 600 g – Gilde Grillpølser 600 g | 39,00–64,90 kr |
| Kyllingpølser (uten svin) | pakke 400–460 g (regnet som 6 stk) | Solvinge grillpølser av kylling 460 g – Åkeberg Skoglunn grillpølse kylling 6 stk | 33,60–42,90 kr |
| Lomper | pakke à 10 | Vår Laveste Pris frosne lomper – Buer Lomper Original | 10,90–17,20 kr |
| Pølsebrød | pakke à 10–12 (regnet som 10) | Prima Lavpris 12 stk – Hatting grove pølsebrød 10 stk | 18,90–26,70 kr |
| Glutenfrie lomper | pakke à 6 | Engers Lefsebakeri | 32,50 kr |
| Ketchup | flaske | Idun Tomatketchup 530 g – Heinz Tomatketchup 1 kg | 26,90–54,40 kr |
| Sennep | tube ca. 500 g | Idun Pølsesennep 490 g – Bergbys Sennep 510 g | 22,90–29,90 kr |
| Sprøstekt løk | boks 100 g | Prima Lavpris – Ps | 9,90–19,70 kr |
| Potetgull | pose 200–240 g (regnet som 200 g) | KiMs Salt crunch 200 g – Maarud classic salt 240 g | 37,20–41,90 kr |
| Saftkonsentrat | flaske 1,5 l (regnet som 7,5 l ferdig) | Prima Lavpris husholdningssaft – Lerum husholdningssaft uten tilsatt sukker | 36,40–69,40 kr |
| Brus | 10 × 0,33 l | Solo Super – Coca-Cola | 89,00–97,40 kr |
| Papptallerkener | pakke à 25 | REMA 1000 papptallerken 18 cm – dyp 19 cm | 31,40–36,50 kr |
| Drikkebeger | pakke à 80 | R Drikkebeger 200 ml | 53,60 kr |
| Servietter | pakke à 50–75 (regnet som 50) | Prima Lavpris bordpakning 75 stk – R Servietter hvit 50 stk | 22,40–28,60 kr |
| Bestikk | 20 gafler + 20 skjeer i tre | R engangsgafler + R engangsskjeer, 20 stk av hver | 42,60 kr |

Kake, iskake, minipizza, allergivennlig bakst, papirduk, ballonger, bursdagskrone, kakelys og godteposer selges ikke hos Oda. De har et grovt anslag og er merket «anslag» i handlelisten. Frukt og smågodt har ingen standardpris. Servise med motiv koster mange ganger mer enn de enkle variantene over, det viser [budsjettguiden](/guider/budsjett-for-barnebursdag). Prisene endrer seg, så sjekk prisen der du handler. Kalkulatoren kan også hente faktiske priser fra norske butikker for enkeltvarer når det er tilgjengelig.

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
