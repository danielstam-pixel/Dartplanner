# Dartsapp Tournament Control Room Design

**Datum:** 2026-05-14

## Doel

De app volledig visueel en interactioneel revampen naar een volwaardig darts-toernooipaneel, terwijl de bestaande basislogica voor setup, loting, poules, wedstrijden, score-invoer en knock-outdoorstroming behouden blijft.

## Richting

De gekozen richting ligt vast:

- `tournament-first`
- radicale front-end herbouw toegestaan
- `Wedstrijden` wordt het hoofdscherm van de app
- `Loting` blijft een aparte stap/omgeving

De revamp moet visuele en UX-principes lenen van populaire darts-apps met grote adoptie, maar zonder de bestaande app om te vormen tot een trainings- of pure scorekeeper-app.

## Externe Referentierichting

Actuele referenties met grote distributie bevestigen het volgende patroon:

- `DartCounter` op Google Play toont een sterke focus op live-score, duidelijke status, directe scanbaarheid en multiplayer scoreflow.
- `My Dart Training` op Google Play combineert scoreboard-structuur, veel statistiekcontext en duidelijke spelerstatus in compacte schermblokken.

De revamp gebruikt daarvan vooral:

- sterke visuele hiërarchie
- grote actuele wedstrijdblokken
- compacte, directe statuscommunicatie
- scanbare naam- en teamweergave
- duidelijk onderscheid tussen `nu`, `hierna` en `vervolg`

Niet overnemen:

- trainingsgerichte complexiteit
- overdaad aan modes
- statistiekoverload die afleidt van het toernooibeheer

## Huidige Situatie

De app gebruikt nu:

- `index.html` als vaste schermstructuur
- `styles.css` als volledige layout- en responsive laag
- `app.js` als centrale state-, render- en toernooilogica
- `server.js` plus `tournament-state.json` voor server-backed state

Belangrijk:

- De logica voor setup, draw, pool matches, tie-breaks, halve finales en finale is al aanwezig.
- Het scherm `Wedstrijden` is recent omgebouwd naar twee live-borden bovenaan.
- De `Loting`-tab toont nu al direct de uitslag na `Loting maken`, maar is nog steeds visueel te fragmentarisch en onvoldoende onderscheidend als aparte modus.

## Productvisie

De app moet voelen als een wedstrijdregie-app voor een live dartstoernooi:

- je opent de app en begrijpt direct wat er nu gespeeld wordt
- je ziet welke twee borden actief zijn en wat de volgende relevante partijen zijn
- je kunt snel terug naar loting en poules zonder de flow kwijt te raken
- de loting voelt als een echte voorbereidings- en controlemodule
- de bracket en doorstroming voelen logisch verbonden aan het wedstrijdscherm

## Informatiearchitectuur

## 1. Wedstrijden als Home Base

`Wedstrijden` wordt het primaire scherm van de app.

Dit scherm moet vier lagen combineren:

1. `Live borden`
2. `Nu en straks`
3. `Poulevoortgang`
4. `Knock-outvervolg`

### Live borden

De twee actieve borden blijven bovenaan dominant aanwezig:

- Bord 1
- Bord 2

Per bord:

- actuele of eerstvolgende open partij
- ronde / poulelabel
- directe score-invoer in de context van de kaart of duidelijke doorgeleiding ernaartoe

### Nu en straks

Onder de live-borden komt een echte wedstrijdregielijst:

- actuele en komende wedstrijden in speelvolgorde
- dus niet eerst alle wedstrijden van bord 1 en dan bord 2
- de lijst volgt de logische planning van het moment

Deze lijst moet aanvoelen als een match queue:

- `nu bovenin`
- `volgende`
- `later in deze fase`

### Poulevoortgang

Compacte contextcomponenten tonen:

- aantal gespeelde poolwedstrijden
- resterende poolwedstrijden
- beslissende legs indien nodig

Dit is ondersteunende context, geen volledige tabellaag als primaire focus.

### Knock-outvervolg

Een compacte bracket-preview of knock-out statusmodule toont:

- of halve finales al bepaald zijn
- wie vermoedelijk doorstroomt
- of de finale al wacht op winnaars

## 2. Loting als Aparte Premium Omgeving

De `Loting`-tab blijft zelfstandig bestaan en krijgt een compleet eigen karakter.

De lotingpagina krijgt twee toestanden:

### Pre-draw toestand

Voor `Loting maken` toont de pagina:

- format / toernooivorm
- aantal spelers of koppels
- aantal poules
- speelvloerinfo
- duidelijke call-to-action om de loting uit te voeren

Dit deel moet aanvoelen als voorbereiding en bevestiging.

### Post-draw toestand

Na `Loting maken` verschuift de pagina direct naar de uitslag.

De uitslag is het hoofdproduct van deze pagina:

- gemaakte spelers of koppels
- poule-indeling
- directe controle en handmatige correctie via drag-and-drop

De lotingtab moet nu niet meer voelen als een losse verzameling kaarten, maar als één gefocust indelingsscherm.

## 3. Setup als Kortere Voorfase

`Toernooi` blijft bestaan, maar wordt compacter en helderder:

- instellingen eerst
- spelers/koppels invoeren als tweede blok
- duidelijke bevestiging

Dit scherm is functioneel belangrijk, maar niet het pronkstuk van de app.

## 4. Standen als Analyse- en Eindfase

`Standen` blijft de plek voor:

- volledige poulestanden
- volledige knock-outboom
- winnaarspresentatie

Na de revamp moet dit scherm minder aanvoelen als een losse rapportagepagina en meer als de analytische weerslag van wat in `Wedstrijden` en `Loting` gebeurt.

## Navigatieconcept

Hoewel de bestaande basisstappen blijven bestaan, moet de UI niet meer aanvoelen als een rigide wizard.

Nieuwe interpretatie:

- `Toernooi` = voorbereiding
- `Loting` = indelingsmodus
- `Wedstrijden` = hoofdregie
- `Standen` = analyse en uitkomst

De navigatie mag visueel veel sterker worden:

- iconischer
- duidelijkere actieve staat
- minder “formulierenwizard”, meer “control panel”

## Visuele Richting

De stijl moet frisser, contrastrijker en moderner zijn dan de huidige versie.

Kernkenmerken:

- helder en fris kleurpalet met sportieve energie
- sterke contrasten voor live status en primaire acties
- duidelijke kaartblokken met grote scanbaarheid
- visuele rust in formulieren en tabellen
- uitgesproken live- en queue-hiërarchie in het wedstrijdscherm

De app moet niet donker worden om “premium” te lijken; het mag juist fris, helder en energiek zijn.

## Componentrichtlijnen

## 1. Speler- en Teamblokken

Namen moeten eenduidig, compact en herkenbaar zijn:

- geen dubbele naamweergave binnen één kaart
- spelers als herkenbare chips/blokken
- teams als bundels van leden in één kaart

## 2. Live-board kaarten

De live-kaarten zijn hoofdcomponenten van de app:

- sterk visueel onderscheid
- bordnummer altijd prominent
- tegenstanders en fase direct leesbaar

## 3. Match queue

De queue onder de live-borden moet scanbaar blijven bij veel wedstrijden.

Benodigde signalen:

- bordnummer
- fase / poule
- status
- positie in de actuele speelvolgorde

## 4. Lotingresultaten

De resultaten na loting moeten direct leesbaar zijn zonder extra interactie:

- links of boven: gemaakte spelers/koppels
- rechts of onder: poules
- duidelijke scheiding tussen bronlijst en indeling

## UX-principes

1. `Nu speelt` moet altijd in één oogopslag duidelijk zijn.
2. `Wat volgt hierna` moet bijna even duidelijk zijn.
3. De loting moet onmiddellijk resultaat tonen na de actie.
4. Belangrijke status mag nooit verstopt zitten in kleine helpertekst.
5. De app moet mobiel bruikbaar blijven zonder desktop-informatie tot pap te persen.

## Responsive Richting

### Desktop

- wedstrijdscherm als breed control panel
- live-borden naast elkaar
- queue en contextmodules in duidelijke secties
- loting met gescheiden resultaatkolommen

### Tablet

- dezelfde hiërarchie, maar met sneller stapelende modules
- live-borden mogen onder elkaar gaan als nodig

### Mobiel

- live-borden onder elkaar
- match queue als compacte verticale feed
- lotingresultaten in éénkolomsvolgorde
- navigatie blijft duidelijk aanwijsbaar

## Technische Richting

De basislogica blijft behouden.

Dat betekent expliciet:

- geen herschrijving van toernooiregels
- geen nieuwe backendarchitectuur
- geen frameworkmigratie

Wel toegestaan en gewenst:

- sterke herschikking van DOM-structuur in `index.html`
- nieuwe renderzones in `app.js`
- extra renderhelpers om UI-concerns te isoleren
- grondige herbouw van `styles.css`

Waarschijnlijke renderzones na revamp:

- `home-live-boards`
- `home-match-queue`
- `home-pool-progress`
- `home-knockout-status`
- `draw-preflight`
- `draw-results`
- `draw-entrants`
- `draw-pools`

## Test- en Verificatieverwachting

Minimale verificatie na implementatie:

1. De app opent en toont nog steeds geldige state.
2. `Loting maken` toont direct gemaakte spelers/koppels en poules.
3. `Wedstrijden` toont bord 1 en 2 plus match queue in speelvolgorde.
4. Score-invoer werkt nog steeds.
5. Tie-break, halve finales en finale blijven genereren.
6. Mobiele weergave blijft bruikbaar.

## Scopegrenzen

In scope:

- radicale front-end revamp
- andere schermhiërarchie
- sterk vernieuwde `Loting`- en `Wedstrijden`-ervaring
- UI/UX-principes geïnspireerd door populaire darts-apps

Niet in scope:

- online multiplayer
- trainingsmodes
- gebruikersaccounts
- statistiekplatform zoals in grote score-apps
- vervanging van de bestaande toernooilogica

## Openstaande Beslissing Voor Implementatie

Geen fundamentele productbeslissingen staan nog open.

De enige implementatiebeslissing die tijdens uitvoering pragmatisch gemaakt mag worden:

- hoeveel van de huidige HTML-structuur behouden blijft versus vervangen wordt

Maar de functionele en UX-richting van de revamp ligt vast in dit document.

## Opmerking Over Versiebeheer

Deze workflow vraagt normaal om het spec-bestand te committen, maar de workspace is geen Git-repository. Het document kan daarom wel worden opgeslagen, maar niet worden gecommit zolang de app niet in een geldige repository staat.
