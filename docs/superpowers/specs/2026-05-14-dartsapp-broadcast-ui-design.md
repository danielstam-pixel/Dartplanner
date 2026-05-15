# Dartsapp Broadcast UI Design

**Datum:** 2026-05-14

## Doel

De huidige dartsapp visueel sterker, duidelijker en responsiever maken voor mobiel en desktop, terwijl het wedstrijdscherm functioneel wordt aangepast zodat beide beschikbare borden tegelijk zichtbaar en logisch gepresenteerd worden.

## Huidige Situatie

De app is een kleine browserapp met drie kernbestanden:

- `index.html` voor de schermstructuur
- `styles.css` voor de volledige styling en responsive breakpoints
- `app.js` voor state, loting, planning, live-weergave en standen

Belangrijke observaties uit de huidige code:

- De app gebruikt al `boardCount = 2`.
- Nieuwe wedstrijden krijgen al een `board`-nummer mee in `buildPoolMatches()` en `makeSingleEliminationMatches()`.
- Het wedstrijdscherm toont nu maar een enkele centrale live-weergave via `state.liveMatchId`.
- De knophiërarchie en spacing zijn bruikbaar, maar nog niet strak genoeg voor een premium tournament/broadcast-uitstraling.
- De loting is functioneel, maar visueel nog te kaal en te weinig scanbaar.

## Ontwerpdoelen

1. De app moet voelen als een modern toernooidashboard met broadcast-karakter.
2. De layout moet op mobiel en desktop bewust ontworpen aanvoelen, niet alleen “ingekrompen”.
3. De loting moet overzichtelijker en visueel sterker worden zonder speelse of overmatige animatie.
4. Actieknoppen moeten per scherm duidelijk, recht uitgelijnd en hiërarchisch logisch staan.
5. Het wedstrijdscherm moet beide borden tegelijk zichtbaar maken zolang er voor beide borden geplande of actieve wedstrijden bestaan.

## Visuele Richting

De gekozen stijl is `tournament / broadcast`.

Kenmerken:

- Strakkere, modernere dashboard-uitstraling
- Sterkere visuele hiërarchie tussen header, secties, live-status en planning
- Meer scorebordgevoel in live-componenten
- Minder “gezellige pub”-uitstraling, meer premium toernooipresentatie
- Geen zware animatie-afhankelijkheid; polish vooral via compositie, contrast, kaarten en duidelijke statusweergave

## Scope

In scope:

- Herontwerp van header, sectieheaders, kaarten en algemene spacing
- Verbetering van stapnavigatie en layoutbalans op desktop en mobiel
- Duidelijkere plaatsing en hiërarchie van actieknoppen
- Visuelere maar overzichtsgerichte draw-weergave
- Aanpassing van matchweergave van één live-wedstrijd naar twee bordsloten
- Verbetering van responsive gedrag voor setup, draw, wedstrijden en standen

Niet in scope:

- Volledige herbouw van de applicatiearchitectuur
- Migratie naar framework/component library
- Complexe animatieflow voor de loting
- Uitbreiding naar meer dan twee borden

## Informatiearchitectuur

### Setup

Het setupscherm blijft de invoerplek voor toernooi-instellingen en spelers, maar krijgt een strakkere visuele hiërarchie:

- Duidelijkere scheiding tussen configuratie en spelerslijst
- Primair actiepunt rechtsboven in de sectie
- Consistente kaartverhoudingen op mobiel en desktop

### Draw

Het drawscherm blijft bestaan uit:

- samenvattende statuskaarten
- deelnemers- of koppellijst
- poule-overzicht

Maar krijgt een duidelijker layoutritme:

- informatiekaarten worden sterker vormgegeven
- deelnemers en poules worden beter scanbaar
- de draw-actieflow wordt visueel logischer: eerst genereren, daarna afronden

De focus ligt hier op overzicht, niet op ceremonie.

### Matches

Het wedstrijdscherm verandert inhoudelijk het meest:

- De bestaande enkele `livePanel`-presentatie wordt vervangen door een compacte live-strip met twee slots: `Bord 1` en `Bord 2`.
- Elk slot toont de eerstvolgende relevante wedstrijd voor dat bord.
- Onder de live-strip blijft de volledige wedstrijdenlijst zichtbaar.
- De lijst blijft gegroepeerd per fase, maar wordt visueel beter scanbaar en consistenter gepresenteerd.

### Standings

Het standen- en bracketgedeelte blijft functioneel grotendeels gelijk, maar krijgt:

- betere kaartpresentatie
- nettere responsive tabelweergave
- visueel sterkere bracket- en winnaarspresentatie passend bij de broadcast-stijl

## Functioneel Ontwerp: Twee Borden Tegelijk Zichtbaar

### Probleem

De app kent wedstrijden al toe aan `board 1` en `board 2`, maar de UI modelleert live-presentatie nog als één geselecteerde wedstrijd via `liveMatchId`. Daardoor wordt de parallelle speelopzet niet correct in beeld gebracht.

### Gewenst gedrag

De app toont bovenaan het wedstrijdscherm altijd een live-strip met maximaal twee tegels:

- `Bord 1`
- `Bord 2`

Per bord geldt:

- toon eerst een nog niet afgeronde wedstrijd op dat bord als die bestaat
- als er geen open wedstrijd meer is voor dat bord, toon een afgeronde of lege status in compacte vorm
- de strip is informatief en hoeft niet afhankelijk te zijn van handmatig schakelen

### Impact op state en logica

De bestaande `liveMatchId`-benadering is niet langer het primaire model voor live-presentatie.

Ontwerpkeuze:

- live-weergave wordt afgeleid uit `state.matches`
- per bord wordt een helper gebruikt die de eerstvolgende niet-afgeronde match bepaalt
- handmatige `set live` kan blijven bestaan als secundaire highlight in de lijst, maar is niet langer nodig voor de hoofdweergave

Voorkeursrichting:

- `liveMatchId` verwijderen als centrale driver van de topweergave
- live-strip baseren op bord-gefilterde afgeleide data
- knop `Volgende live` verwijderen of herdefiniëren als die geen duidelijke meerwaarde meer heeft

## Functioneel Ontwerp: Loting Overzichtelijker

De loting moet visueler worden via betere presentatie van bestaande informatie:

- sterkere stat cards voor deelnemers, poules en borden
- duidelijkere deelnemerskaarten met naamhiërarchie
- poulekaarten met meer rust, contrast en ruimtelijke scheiding
- betere visuele feedback bij drag-and-drop

De loting hoeft geen reveal-animatie of “trek uit een trommel”-flow te krijgen.

## Knoppen en Uitlijning

Algemene regels:

- primaire actie per scherm staat consequent rechts in de sectieheader
- secundaire acties staan gegroepeerd daarnaast of eronder, afhankelijk van viewport
- op mobiel worden actieknoppen full-width of logisch gestapeld
- knoppen moeten optisch op één lijn staan en niet onrustig verspringen

Toepassing:

- setup: `Opzet bevestigen` blijft primaire CTA
- draw: `Loting maken` is primair, `Loting afronden` secundair tot er een loting bestaat
- matches: huidige `Volgende live` wordt waarschijnlijk verwijderd; vervanging alleen als functioneel nodig
- standings: export en print blijven secundaire utilities

## Responsive Ontwerp

### Desktop

- dashboard-gevoel met duidelijke sectieblokken
- sterke kaarten en nette horizontale balans
- live-strip met twee compacte bordtegels boven de lijst

### Tablet

- overgang naar een lossere éénkolomsstructuur waar nodig
- knoppen mogen wrapen, maar moeten visueel geordend blijven

### Mobiel

- geen gepropt desktopgrid
- kaarten en CTA’s full-width waar dat de leesbaarheid verbetert
- live-strip mag onder elkaar stapelen als breedte tekortschiet
- standen blijven leesbaar in kaartvorm zonder horizontale frustratie

## Technische Wijzigingsrichting

### `index.html`

Verwachte wijzigingen:

- sectiekoppen en button-structuur aanscherpen waar nodig
- `livePanel` structureren voor twee bordslots in plaats van één enkel live-element
- eventueel extra wrappers toevoegen voor betere uitlijning en responsive controle

### `styles.css`

Verwachte wijzigingen:

- variabelen en componentstijlen aanscherpen richting broadcast-look
- betere kaartstijlen voor draw, live-strip en matchlijsten
- sterkere knophiërarchie en consistente alignment
- responsive regels verfijnen voor mobiel en tablet

### `app.js`

Verwachte wijzigingen:

- helpers toevoegen om wedstrijden per bord te selecteren
- renderlogica van live-weergave herschrijven
- afhankelijkheid van `liveMatchId` verminderen of verwijderen
- knoppenlogica voor live-navigatie opschonen
- draw-presentatie verbeteren zonder de basisplanning te wijzigen

## Teststrategie

Handmatige verificatie moet minimaal deze scenario’s afdekken:

1. Setup werkt op desktop en mobiel met nette uitlijning van invoervelden en CTA’s.
2. Draw-scherm toont deelnemers en poules duidelijker en blijft bruikbaar tijdens drag-and-drop.
3. Na afronden van een loting met meerdere poolwedstrijden toont het wedstrijdscherm tegelijk `Bord 1` en `Bord 2`.
4. Als nog maar één wedstrijd openstaat, degradeert de tweede bordtegel netjes naar lege of afgeronde status.
5. Standen en bracket blijven leesbaar op mobiel.
6. Bestaande score-invoer en voortgang naar halve finales/finale blijven werken.

## Risico’s en Aandachtspunten

- `app.js` is momenteel monolithisch; wijzigingen in live-logica kunnen snel meerdere renders raken.
- Het verwijderen van `liveMatchId` moet gecontroleerd gebeuren omdat het nu op meerdere plekken wordt gebruikt.
- De sortering van wedstrijden blijft belangrijk; bordspecifieke live-selectie mag de bestaande fasevolgorde niet onbedoeld breken.
- Responsive verbetering mag de printweergave niet onnodig beschadigen.

## Implementatiebeslissingen Voor De Planfase

Deze beslissingen liggen vast voor de vervolgstap:

- visuele richting: `broadcast`
- loting: `meer overzicht`, geen ceremonieel reveal-concept
- wedstrijdscherm: `live-strip bovenaan + volledige lijst eronder`
- functionele interpretatie van het schema-probleem: beide borden tegelijk tonen als er parallel speelbare wedstrijden beschikbaar zijn

## Openstaande Onzekerheden

Geen functionele blokkades meer bekend voor de geplande scope.

Wel moet tijdens implementatie expliciet worden besloten of:

- `liveMatchId` volledig verdwijnt
- of als secundaire lijst-highlight blijft bestaan

De voorkeur in dit ontwerp is verwijderen tenzij tijdens implementatie blijkt dat er nog een nuttige admin-functie aan hangt.

## Opmerking Over Versiebeheer

De brainstorm-skill vraagt om het designdocument te committen, maar in deze workspace is geen Git-repository beschikbaar. Daardoor kan het document wel worden opgeslagen, maar niet worden gecommit zonder eerst versiebeheer te initialiseren of in de juiste repository te werken.
