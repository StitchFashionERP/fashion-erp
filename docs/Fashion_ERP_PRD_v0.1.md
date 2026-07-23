# Fashion ERP — Product Requirements Document

**Versie:** 0.1  
**Status:** Concept  
**Datum:** 10 juli 2026  
**Doel:** MVP voor een kledingmerk dat inkoopt, voorraad beheert, verkoopt, pakbonnen maakt en factureert.

---

## 1. Productvisie

Fashion ERP is een webapplicatie voor kleine en middelgrote kledingmerken die hun collectie, maten, kleuren, voorraad, inkoop, verkoop en facturatie overzichtelijk willen beheren.

Het systeem moet vertrouwd aanvoelen voor gebruikers van Exact Online, maar beter aansluiten op de praktijk van kledingmerken:

- collecties wisselen per seizoen;
- één product bestaat uit meerdere maten en kleuren;
- voorraad wordt beheerd per variant;
- inkopen en verkopen gebeuren vaak in matrices;
- oude collecties moeten bewaard blijven voor historie;
- pakbonnen en facturen moeten snel kunnen worden gemaakt.

Fashion ERP vervangt in de eerste fase niet de volledige boekhouding. De applicatie ondersteunt de operationele processen en kan later koppelen met Exact Online.

---

## 2. Doelgroep

### Primaire doelgroep

Kleine en middelgrote kledingmerken die:

- zelf inkopen;
- voorraad houden;
- leveren aan winkels of consumenten;
- geen zwaar ERP-systeem willen;
- werken met collecties, maten en kleuren;
- behoefte hebben aan eenvoudige pakbonnen en facturen.

### Primaire gebruiker

De eigenaar of operationeel medewerker van een kledingmerk.

### Secundaire gebruikers

- magazijnmedewerker;
- verkoopmedewerker;
- financieel medewerker;
- externe boekhouder.

---

## 3. Probleem

Algemene boekhoud- en ERP-systemen behandelen elke maat-kleurcombinatie als een los artikel. Daardoor ontstaat snel een lange, onoverzichtelijke artikellijst.

Bij kleding is de natuurlijke structuur:

```text
Collectie
└── Product
    ├── Kleur
    │   ├── Maat XS
    │   ├── Maat S
    │   ├── Maat M
    │   └── Maat L
    └── Kleur
        ├── Maat XS
        ├── Maat S
        ├── Maat M
        └── Maat L
```

De applicatie moet deze structuur direct ondersteunen.

---

## 4. MVP-doelen

De eerste bruikbare versie moet het volgende proces volledig ondersteunen:

```text
Collectie aanmaken
→ Product aanmaken
→ Kleuren en maten toevoegen
→ Varianten genereren
→ Inkooporder maken
→ Goederen ontvangen
→ Voorraad bijwerken
→ Klant aanmaken
→ Verkooporder maken
→ Pakbon genereren
→ Factuur genereren
→ Factuur e-mailen of printen
```

---

## 5. Buiten scope van de eerste versie

De volgende onderdelen worden bewust niet in de eerste MVP gebouwd:

- volledige financiële boekhouding;
- bankkoppelingen;
- btw-aangifte;
- salarisadministratie;
- geavanceerde webshop;
- kassasysteem;
- meerdere juridische entiteiten;
- EDI met leveranciers;
- meerdere valuta;
- meerdere magazijnen;
- automatische inkoopvoorspellingen;
- mobiele app;
- AI-assistent;
- volledige Exact Online-koppeling.

Deze onderdelen kunnen later als modules worden toegevoegd.

---

## 6. Productprincipes

### 6.1 Vertrouwd

De interface sluit qua structuur aan op zakelijke software zoals Exact Online:

- vaste navigatie links;
- compacte tabellen;
- duidelijke paginatitels;
- actieknoppen rechtsboven;
- statuslabels;
- filters en zoekfuncties;
- weinig decoratie;
- veel bruikbare informatie per scherm.

### 6.2 Snel

Veel voorkomende handelingen moeten met zo weinig mogelijk klikken kunnen:

- productvarianten genereren;
- voorraad ontvangen;
- verkooporder maken;
- pakbon genereren;
- factuur versturen.

### 6.3 Controleerbaar

Iedere voorraadwijziging moet herleidbaar zijn.

### 6.4 Veilig

Definitieve documenten en voorraadmutaties mogen niet ongemerkt worden overschreven.

### 6.5 Schaalbaar

De eerste versie wordt voor één kledingmerk gebouwd, maar de architectuur moet later meerdere bedrijven kunnen ondersteunen.

---

## 7. Hoofdnavigatie

De vaste navigatie bevat:

1. Dashboard
2. Verkoop
3. Inkoop
4. Voorraad
5. Artikelen
6. Collecties
7. Klanten
8. Leveranciers
9. Facturen
10. Rapportages
11. Instellingen

### Subnavigatie

#### Verkoop

- Verkooporders
- Nieuwe verkooporder
- Pakbonnen
- Retouren

#### Inkoop

- Inkooporders
- Nieuwe inkooporder
- Ontvangsten

#### Voorraad

- Voorraadoverzicht
- Voorraadmutaties
- Voorraadcorrecties
- Lage voorraad

#### Artikelen

- Producten
- Varianten
- Categorieën
- Maten
- Kleuren

#### Facturen

- Concept
- Openstaand
- Betaald
- Vervallen
- Creditfacturen

---

## 8. Gebruikersrollen

### 8.1 Beheerder

Mag alles bekijken en wijzigen.

### 8.2 Verkoop

Mag:

- klanten bekijken en wijzigen;
- verkooporders aanmaken;
- pakbonnen maken;
- facturen voorbereiden.

Mag niet:

- instellingen wijzigen;
- voorraadmutaties verwijderen;
- gebruikers beheren.

### 8.3 Magazijn

Mag:

- voorraadoverzicht bekijken;
- ontvangsten verwerken;
- orders gereedmelden;
- pakbonnen printen;
- voorraadcorrecties voorstellen.

Mag niet:

- facturen aanpassen;
- prijzen aanpassen;
- gebruikers beheren.

### 8.4 Financieel

Mag:

- facturen bekijken en versturen;
- betalingen registreren;
- klanten bekijken;
- rapportages bekijken.

---

## 9. Kernentiteiten

### 9.1 Organisatie

Velden:

- naam;
- handelsnaam;
- adres;
- postcode;
- plaats;
- land;
- btw-nummer;
- KvK-nummer;
- IBAN;
- e-mailadres;
- telefoonnummer;
- logo;
- standaard betaaltermijn;
- factuurnummerreeks;
- creditfactuurnummerreeks.

### 9.2 Gebruiker

Velden:

- naam;
- e-mailadres;
- rol;
- status;
- laatste login.

### 9.3 Collectie

Velden:

- naam;
- seizoen;
- jaar;
- code;
- startdatum;
- einddatum;
- status;
- omschrijving.

Voorbeeld:

```text
Naam: Autumn/Winter 2027
Code: AW27
Seizoen: Autumn/Winter
Jaar: 2027
Status: Actief
```

### 9.4 Product

Velden:

- productnaam;
- productcode;
- collectie;
- categorie;
- leverancier;
- merk;
- omschrijving;
- materiaal;
- land van oorsprong;
- inkoopprijs;
- verkoopprijs;
- btw-tarief;
- productfoto;
- status.

### 9.5 Productvariant

Iedere unieke combinatie van product, kleur en maat is één variant.

Velden:

- product;
- kleur;
- maat;
- SKU;
- EAN;
- inkoopprijs;
- verkoopprijs;
- actieve status;
- fysieke voorraad;
- gereserveerde voorraad;
- beschikbare voorraad;
- voorraad in bestelling.

Berekening:

```text
Beschikbare voorraad = fysieke voorraad - gereserveerde voorraad
```

### 9.6 Maat

Velden:

- naam;
- sorteervolgorde;
- maattype;
- actieve status.

Voorbeelden:

```text
XS, S, M, L, XL
34, 36, 38, 40, 42
One Size
```

### 9.7 Kleur

Velden:

- naam;
- interne code;
- kleurcode;
- actieve status.

### 9.8 Leverancier

Velden:

- bedrijfsnaam;
- contactpersoon;
- e-mailadres;
- telefoon;
- factuuradres;
- afleveradres;
- btw-nummer;
- betaaltermijn;
- valuta;
- opmerkingen.

### 9.9 Klant

Velden:

- klantnummer;
- type klant;
- bedrijfsnaam;
- contactpersoon;
- e-mailadres;
- telefoon;
- factuuradres;
- afleveradres;
- btw-nummer;
- betaaltermijn;
- kortingspercentage;
- prijsafspraak;
- opmerkingen.

Klanttypen:

- consument;
- retailer;
- groothandel;
- agent;
- marketplace.

### 9.10 Inkooporder

Velden:

- ordernummer;
- leverancier;
- collectie;
- orderdatum;
- verwachte leverdatum;
- status;
- valuta;
- totaal exclusief btw;
- btw;
- totaal inclusief btw;
- interne notitie.

Statussen:

- concept;
- verzonden;
- deels ontvangen;
- volledig ontvangen;
- geannuleerd.

### 9.11 Inkooporderregel

Velden:

- variant;
- besteld aantal;
- ontvangen aantal;
- openstaand aantal;
- inkoopprijs;
- korting;
- regelbedrag.

### 9.12 Voorraadmutatie

Velden:

- datum en tijd;
- variant;
- mutatietype;
- aantal;
- voorraad voor mutatie;
- voorraad na mutatie;
- bron;
- bronnummer;
- gebruiker;
- toelichting.

Mutatietypen:

- inkoopontvangst;
- verkoop;
- verkoopretour;
- leveranciersretour;
- beschadiging;
- correctie;
- beginvoorraad;
- annulering;
- reservering;
- vrijgave reservering.

### 9.13 Verkooporder

Velden:

- ordernummer;
- klant;
- orderdatum;
- gewenste leverdatum;
- afleveradres;
- status;
- betaaltermijn;
- totaal exclusief btw;
- btw;
- totaal inclusief btw;
- interne notitie;
- klantnotitie.

Statussen:

- concept;
- bevestigd;
- gereserveerd;
- in behandeling;
- gereed voor verzending;
- verzonden;
- gefactureerd;
- geannuleerd.

### 9.14 Verkooporderregel

Velden:

- variant;
- aantal;
- prijs;
- korting;
- btw;
- regelbedrag;
- geleverd aantal;
- gefactureerd aantal.

### 9.15 Pakbon

Velden:

- pakbonnummer;
- verkooporder;
- klant;
- afleveradres;
- aanmaakdatum;
- verzenddatum;
- status;
- PDF-bestand.

### 9.16 Factuur

Velden:

- factuurnummer;
- verkooporder;
- klant;
- factuurdatum;
- vervaldatum;
- status;
- totaal exclusief btw;
- btw;
- totaal inclusief btw;
- betaald bedrag;
- openstaand bedrag;
- PDF-bestand;
- verzonden op;
- verzonden naar.

Statussen:

- concept;
- definitief;
- verzonden;
- deels betaald;
- betaald;
- vervallen;
- gecrediteerd.

---

## 10. Functionele eisen per module

# 10.1 Dashboard

Het dashboard toont:

- omzet deze maand;
- openstaande facturen;
- aantal openstaande verkooporders;
- aantal openstaande inkooporders;
- aantal artikelen met lage voorraad;
- recente voorraadmutaties;
- recente verkooporders;
- verwachte leveringen.

Acties:

- nieuwe verkooporder;
- nieuwe inkooporder;
- nieuw product;
- nieuwe klant.

---

# 10.2 Collecties

Gebruiker kan:

- collectie aanmaken;
- collectie wijzigen;
- collectie archiveren;
- producten per collectie bekijken;
- collectie dupliceren;
- filteren op seizoen, jaar en status.

Een gearchiveerde collectie blijft zichtbaar in historie.

---

# 10.3 Artikelen

## Productlijst

Kolommen:

- foto;
- productcode;
- productnaam;
- collectie;
- categorie;
- leverancier;
- aantal varianten;
- totale voorraad;
- verkoopprijs;
- status.

Filters:

- collectie;
- leverancier;
- categorie;
- status;
- voorraadstatus.

Zoeken op:

- productnaam;
- productcode;
- SKU;
- EAN.

## Productdetail

Tabbladen:

1. Algemeen
2. Varianten
3. Voorraad
4. Inkoop
5. Verkoop
6. Historie

## Variantenmatrix

Voorbeeld:

| Kleur / maat | XS | S | M | L | XL |
|---|---:|---:|---:|---:|---:|
| Beige | 2 | 7 | 9 | 4 | 1 |
| Blauw | 0 | 3 | 8 | 6 | 2 |
| Zwart | 4 | 5 | 7 | 3 | 0 |

Gebruiker kan:

- maten selecteren;
- kleuren selecteren;
- varianten automatisch genereren;
- SKU-regel instellen;
- prijzen per variant aanpassen;
- EAN handmatig invoeren;
- varianten deactiveren.

Voorbeeld SKU-regel:

```text
{COLLECTIE}-{PRODUCT}-{KLEUR}-{MAAT}
```

Resultaat:

```text
AW27-OLIVIA-BEI-M
```

---

# 10.4 Inkoop

## Inkooporder aanmaken

Gebruiker kiest:

- leverancier;
- collectie;
- verwachte leverdatum;
- producten;
- aantallen per maat en kleur.

De orderinvoer gebruikt bij voorkeur een matrix.

## Ontvangst verwerken

Gebruiker ziet per regel:

- besteld;
- eerder ontvangen;
- nu ontvangen;
- resterend.

Na bevestiging:

- wordt fysieke voorraad verhoogd;
- wordt een voorraadmutatie aangemaakt;
- wordt het ontvangen aantal bijgewerkt;
- verandert de orderstatus automatisch.

Een ontvangst mag niet stilzwijgend worden verwijderd. Correcties gebeuren via een tegenboeking.

---

# 10.5 Voorraad

## Voorraadoverzicht

Kolommen:

- product;
- variant;
- SKU;
- EAN;
- fysieke voorraad;
- gereserveerd;
- beschikbaar;
- in bestelling;
- minimumvoorraad.

Filters:

- collectie;
- product;
- kleur;
- maat;
- leverancier;
- voorraadstatus.

## Voorraadcorrectie

Gebruiker voert in:

- variant;
- correctietype;
- aantal;
- reden;
- toelichting.

Correcties worden altijd gelogd.

## Lage voorraad

Een variant is laag in voorraad als:

```text
Beschikbare voorraad <= minimumvoorraad
```

---

# 10.6 Klanten

Gebruiker kan:

- klant aanmaken;
- adressen beheren;
- betaaltermijn instellen;
- korting instellen;
- orderhistorie bekijken;
- factuurhistorie bekijken;
- openstaand saldo bekijken.

---

# 10.7 Verkoop

## Verkooporder aanmaken

Gebruiker kiest:

- klant;
- afleveradres;
- gewenste leverdatum;
- producten;
- aantallen;
- prijzen;
- korting.

Tijdens invoer toont het systeem:

- fysieke voorraad;
- gereserveerde voorraad;
- beschikbare voorraad.

## Voorraadreservering

Bij orderbevestiging wordt voorraad gereserveerd.

Bij annulering wordt de reservering vrijgegeven.

Bij verzending:

- daalt fysieke voorraad;
- daalt gereserveerde voorraad;
- ontstaat een verkoopmutatie.

## Pakbon

Vanuit een verkooporder kan een pakbon worden gemaakt.

De pakbon bevat:

- logo;
- bedrijfsgegevens;
- klantgegevens;
- afleveradres;
- ordernummer;
- pakbonnummer;
- datum;
- productnaam;
- SKU;
- kleur;
- maat;
- aantal;
- opmerkingen.

Prijzen staan standaard niet op de pakbon.

## Verkoopretour

Retouren worden gekoppeld aan de oorspronkelijke verkooporder.

Gebruiker kiest:

- variant;
- aantal;
- reden;
- terug op voorraad: ja/nee.

---

# 10.8 Facturatie

## Factuur maken

Een factuur kan worden gemaakt vanuit:

- één verkooporder;
- meerdere leveringen van één order;
- handmatige factuur.

## Factuurnummering

Definitieve factuurnummers moeten:

- uniek zijn;
- oplopend zijn;
- niet hergebruikt worden;
- niet meer gewijzigd kunnen worden.

Voorbeeld:

```text
2026-00001
```

## Factuur versturen

Gebruiker kan:

- PDF bekijken;
- PDF downloaden;
- factuur per e-mail versturen;
- factuur printen;
- e-mailtekst aanpassen;
- kopie naar eigen administratie sturen.

## Betaling registreren

Gebruiker kan handmatig registreren:

- betaaldatum;
- bedrag;
- betaalmethode;
- referentie.

Automatische bankkoppeling valt buiten de MVP.

## Creditfactuur

Een creditfactuur:

- verwijst naar de oorspronkelijke factuur;
- krijgt een eigen nummer;
- bevat negatieve bedragen;
- kan volledig of gedeeltelijk zijn.

---

## 11. Belangrijkste workflows

# 11.1 Nieuw product

```text
Collectie selecteren
→ Productgegevens invullen
→ Kleuren selecteren
→ Maten selecteren
→ Varianten genereren
→ SKU's controleren
→ Prijzen invoeren
→ Product opslaan
```

# 11.2 Inkoop en ontvangst

```text
Inkooporder aanmaken
→ Leverancier selecteren
→ Varianten en aantallen invullen
→ Order bevestigen
→ Goederen arriveren
→ Ontvangst registreren
→ Voorraad wordt verhoogd
```

# 11.3 Verkoop en verzending

```text
Klant selecteren
→ Verkooporder aanmaken
→ Voorraad controleren
→ Order bevestigen
→ Voorraad reserveren
→ Pakbon maken
→ Order verzenden
→ Voorraad afboeken
→ Factuur maken
```

# 11.4 Factuur

```text
Factuur als concept maken
→ Controleren
→ Definitief maken
→ PDF genereren
→ E-mailen of printen
→ Betaling registreren
```

---

## 12. Validatieregels

### Product

- productnaam is verplicht;
- productcode is verplicht en uniek;
- collectie is verplicht;
- minimaal één maat en één kleur zijn vereist voordat varianten kunnen worden gegenereerd.

### Variant

- combinatie product + kleur + maat is uniek;
- SKU is verplicht en uniek;
- EAN is optioneel maar moet uniek zijn indien ingevuld;
- voorraad kan niet direct handmatig worden overschreven.

### Inkooporder

- leverancier is verplicht;
- minimaal één orderregel;
- aantal moet groter zijn dan nul;
- ontvangst kan niet hoger zijn dan besteld zonder waarschuwing.

### Verkooporder

- klant is verplicht;
- minimaal één orderregel;
- bij onvoldoende voorraad volgt een waarschuwing;
- gebruiker met juiste rechten kan backorder toestaan.

### Factuur

- klantgegevens zijn verplicht;
- factuurdatum is verplicht;
- definitieve factuur kan niet worden verwijderd;
- correctie gebeurt via creditfactuur.

---

## 13. Auditlog

Het systeem legt kritieke acties vast:

- gebruiker;
- datum en tijd;
- actie;
- entiteit;
- oud gegeven;
- nieuw gegeven.

Minimaal voor:

- voorraadcorrecties;
- prijswijzigingen;
- orderstatus;
- factuurstatus;
- gebruikersrollen;
- verwijderde concepten.

---

## 14. Zoekfunctionaliteit

De globale zoekbalk zoekt in:

- producten;
- SKU's;
- EAN-codes;
- klanten;
- leveranciers;
- verkooporders;
- inkooporders;
- facturen;
- pakbonnen.

Zoekresultaten worden gegroepeerd per type.

---

## 15. Meldingen

In de applicatie:

- lage voorraad;
- inkooporder over verwachte leverdatum;
- verkooporder wacht op verzending;
- factuur vervallen;
- ontbrekende productinformatie.

E-mailmeldingen worden later toegevoegd.

---

## 16. Documenten

PDF-documenten:

- orderbevestiging;
- inkooporder;
- pakbon;
- factuur;
- creditfactuur.

Eisen:

- A4-formaat;
- printbaar in zwart-wit;
- logo en bedrijfsgegevens;
- uniek documentnummer;
- datum;
- paginanummer bij meerdere pagina's;
- bedragen correct afgerond;
- PDF wordt na definitief maken opgeslagen.

---

## 17. Rapportages MVP

### Omzet

- omzet per maand;
- omzet per klant;
- omzet per collectie;
- omzet per product;
- omzet per variant.

### Voorraad

- voorraadwaarde tegen inkoopprijs;
- voorraad per collectie;
- lage voorraad;
- niet-bewegende voorraad.

### Inkoop

- besteld per leverancier;
- ontvangen per leverancier;
- openstaande inkooporders.

Rapportages mogen in de MVP eenvoudige tabellen zijn. Grafieken zijn optioneel.

---

## 18. Niet-functionele eisen

### Snelheid

- normale pagina's laden binnen circa 2 seconden;
- zoeken reageert snel;
- tabellen ondersteunen paginering.

### Beschikbaarheid

- dagelijkse databaseback-up;
- foutmeldingen worden gelogd;
- productie en ontwikkeling zijn gescheiden.

### Beveiliging

- gebruikers moeten inloggen;
- wachtwoorden worden niet zelf onversleuteld opgeslagen;
- rollen en rechten worden server-side gecontroleerd;
- gevoelige acties vereisen bevestiging;
- alle productieverbindingen gebruiken HTTPS.

### Privacy

- alleen noodzakelijke persoonsgegevens worden opgeslagen;
- klantgegevens kunnen worden geëxporteerd;
- bewaartermijnen kunnen later worden ingesteld.

---

## 19. Technische richting

Voorgestelde architectuur:

- webapplicatie;
- TypeScript;
- relationele database;
- server-side validatie;
- API-laag;
- objectopslag voor PDF's en afbeeldingen;
- e-mailprovider voor facturen;
- afzonderlijke ontwikkel-, test- en productieomgeving.

Belangrijk:

- voorraad wordt berekend vanuit mutaties en gecontroleerde totalen;
- financiële documenten worden na definitief maken niet overschreven;
- alle bedrijfsdata krijgt een organisatie-ID, zodat multi-tenant gebruik later mogelijk is.

---

## 20. Concept database-relaties

```text
Organization
├── Users
├── Collections
│   └── Products
│       └── ProductVariants
│           └── StockMovements
├── Suppliers
│   └── PurchaseOrders
│       └── PurchaseOrderLines
├── Customers
│   └── SalesOrders
│       ├── SalesOrderLines
│       ├── PackingSlips
│       └── Invoices
│           └── InvoiceLines
└── Settings
```

---

## 21. MVP-schermen

### Algemene schermen

- login;
- dashboard;
- profiel;
- organisatie-instellingen.

### Collecties

- collectielijst;
- collectie aanmaken;
- collectiedetail.

### Artikelen

- productlijst;
- product aanmaken;
- productdetail;
- variantenmatrix;
- matenbeheer;
- kleurenbeheer;
- categoriebeheer.

### Inkoop

- inkooporderlijst;
- inkooporder aanmaken;
- inkooporderdetail;
- ontvangst verwerken.

### Voorraad

- voorraadoverzicht;
- mutatiehistorie;
- correctie aanmaken;
- lage voorraad.

### Verkoop

- verkooporderlijst;
- verkooporder aanmaken;
- verkooporderdetail;
- pakbon bekijken;
- retour verwerken.

### Relaties

- klantenlijst;
- klantdetail;
- leverancierslijst;
- leverancierdetail.

### Facturen

- factuurlijst;
- factuurdetail;
- factuur-PDF;
- creditfactuur maken;
- betaling registreren.

---

## 22. UI-richtlijnen

### Layout

- vaste donkere of donkerblauwe zijbalk;
- lichte werkruimte;
- compacte bovenbalk;
- breadcrumb;
- paginatitel links;
- primaire actie rechts;
- filters boven tabellen;
- detailpagina's met tabbladen.

### Statuskleuren

- groen: voltooid, betaald, actief;
- oranje: aandacht, deels ontvangen, bijna vervallen;
- rood: fout, vervallen, onvoldoende voorraad;
- blauw: concept of informatief;
- grijs: inactief of geannuleerd.

### Tabellen

- sorteerbare kolommen;
- instelbare kolommen later;
- vaste actieknop per rij;
- bulkselectie waar nuttig;
- lege status met duidelijke vervolgstap.

### Formulieren

- labels boven velden;
- verplichte velden herkenbaar;
- validatie direct zichtbaar;
- opslaan en annuleren altijd op dezelfde plek;
- waarschuwing bij verlaten met niet-opgeslagen wijzigingen.

---

## 23. Acceptatiecriteria MVP

De MVP is bruikbaar wanneer een gebruiker zonder databasekennis:

1. een collectie kan aanmaken;
2. een product met maten en kleuren kan aanmaken;
3. automatisch varianten kan genereren;
4. een inkooporder kan maken;
5. een levering gedeeltelijk of volledig kan ontvangen;
6. de correcte voorraad per variant kan bekijken;
7. een klant kan aanmaken;
8. een verkooporder kan maken;
9. voorraad kan reserveren en afboeken;
10. een pakbon als PDF kan maken;
11. een factuur als PDF kan maken;
12. een factuur per e-mail kan versturen;
13. een betaling kan registreren;
14. de historie van voorraadmutaties kan bekijken.

---

## 24. Bouwfasen

### Fase 1 — Applicatieschil

- hoofdlayout;
- navigatie;
- dashboard;
- basiscomponenten;
- lege modulepagina's.

### Fase 2 — Artikelbeheer

- collecties;
- producten;
- maten;
- kleuren;
- varianten;
- SKU-generatie.

### Fase 3 — Voorraad en inkoop

- leveranciers;
- inkooporders;
- ontvangsten;
- voorraadmutaties;
- voorraadoverzicht.

### Fase 4 — Verkoop

- klanten;
- verkooporders;
- reserveringen;
- verzending;
- retouren.

### Fase 5 — Documenten

- pakbonnen;
- facturen;
- creditfacturen;
- PDF-generatie;
- e-mail.

### Fase 6 — Stabilisatie

- rollen en rechten;
- auditlog;
- rapportages;
- back-ups;
- foutafhandeling;
- testscenario's.

### Fase 7 — Exact Online-koppeling

- authenticatie;
- relaties synchroniseren;
- verkoopfacturen doorzetten;
- foutlog;
- synchronisatiestatus.

---

## 25. Eerste sprint

Doel van de eerste sprint:

Een professionele, klikbare applicatieschil met Exact Online-achtige uitstraling.

Op te leveren:

- vaste zijbalk;
- bovenbalk;
- dashboard;
- pagina's voor:
  - verkoop;
  - inkoop;
  - voorraad;
  - artikelen;
  - collecties;
  - klanten;
  - leveranciers;
  - facturen;
- herbruikbare tabelcomponent;
- herbruikbare statusbadge;
- herbruikbare paginakop;
- responsive basis.

Nog zonder databasefunctionaliteit.

---

## 26. Open beslissingen

Deze punten moeten nog met de gebruiker worden afgestemd:

1. Is verkoop voornamelijk B2B, B2C of beide?
2. Moet één order meerdere leveringen ondersteunen?
3. Zijn de verkoopprijzen inclusief of exclusief btw?
4. Worden kortingen per klant, product of order gebruikt?
5. Moeten productfoto's per product of per kleur worden opgeslagen?
6. Werkt het bedrijf met EAN-codes?
7. Moet beginvoorraad via import kunnen worden ingevoerd?
8. Moeten bestaande klanten, artikelen en voorraad worden geïmporteerd?
9. Welke betaaltermijnen worden gebruikt?
10. Moeten pakbonnen aantallen per doos tonen?
11. Is één magazijn voorlopig voldoende?
12. Moet de applicatie Nederlands, Engels of beide ondersteunen?
13. Moet de Exact Online-koppeling alleen facturen of ook klanten en artikelen synchroniseren?
14. Moeten serienummers of batchnummers worden ondersteund?
15. Moeten retouren direct een creditfactuur kunnen aanmaken?

---

## 27. Eerstvolgende stap

Na goedkeuring van dit PRD bouwen we eerst de applicatieschil.

Technische eerstvolgende acties:

1. huidige standaard Next.js-pagina vervangen;
2. mapstructuur voor modules maken;
3. navigatieconfiguratie toevoegen;
4. basislayout bouwen;
5. dashboard bouwen;
6. eerste lege modulepagina's toevoegen;
7. visuele controle uitvoeren;
8. daarna databaseontwerp definitief maken.

