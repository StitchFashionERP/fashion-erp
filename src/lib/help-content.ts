export type HelpStep = {
  title: string;
  description: string;
  href?: string;
};

export type HelpArticle = {
  id: string;
  category: string;
  title: string;
  summary: string;
  keywords: string[];
  href?: string;
  steps: HelpStep[];
  tips?: string[];
  warnings?: string[];
  screenshot?: string;
  videoUrl?: string;
};

export const helpCategories = [
  "Eerste stappen",
  "Verkoop",
  "Inkoop",
  "Voorraad",
  "Financieel",
  "Rapportages",
  "Supply Intelligence",
  "Instellingen",
  "Veelgestelde vragen",
] as const;

export const helpArticles: HelpArticle[] = [
  {
    id: "eerste-stappen",
    category: "Eerste stappen",
    title: "Beginnen met STITCH",
    summary:
      "Richt eerst het bedrijf, de gebruikers, voorraadlocaties en stamgegevens in.",
    keywords: [
      "beginnen",
      "inrichten",
      "start",
      "eerste stappen",
    ],
    href: "/instellingen",
    steps: [
      {
        title: "Vul de bedrijfsgegevens in",
        description:
          "Open Bedrijfsinstellingen en vul bedrijfsnaam, adres, KvK, btw-nummer, bankgegevens en contactgegevens in.",
        href: "/instellingen/bedrijf",
      },
      {
        title: "Voeg het bedrijfslogo toe",
        description:
          "Het bedrijfslogo wordt gebruikt op facturen, pakbonnen, orderbevestigingen, creditfacturen en inkooporders.",
        href: "/instellingen/bedrijf",
      },
      {
        title: "Maak gebruikers aan",
        description:
          "Voeg gebruikers toe en geef iedere gebruiker alleen de benodigde rol en rechten.",
        href: "/instellingen/gebruikers",
      },
      {
        title: "Controleer voorraadlocaties",
        description:
          "Maak de magazijnen en voorraadlocaties aan die bij het bedrijf worden gebruikt.",
        href: "/instellingen/voorraadlocaties",
      },
      {
        title: "Maak klanten, leveranciers en artikelen aan",
        description:
          "Vul de belangrijkste stamgegevens voordat de eerste order wordt ingevoerd.",
      },
    ],
    tips: [
      "Test de volledige orderflow eerst met één klant en één artikel.",
      "Maak regelmatig een lokale back-up zolang STITCH nog met testdata werkt.",
    ],
  },
  {
    id: "dashboard",
    category: "Eerste stappen",
    title: "Het dashboard gebruiken",
    summary:
      "Bekijk actuele KPI’s, recente verkooporders, leveringen, Top 10-klanten en snelkoppelingen.",
    keywords: [
      "dashboard",
      "kpi",
      "omzet",
      "top 10",
      "snelkoppelingen",
    ],
    href: "/",
    steps: [
      {
        title: "Open een KPI",
        description:
          "Klik op een KPI-kaart om direct naar de bijbehorende module te gaan.",
      },
      {
        title: "Open een recente order",
        description:
          "Klik op het ordernummer of de klant in Recente verkooporders.",
      },
      {
        title: "Gebruik snelkoppelingen",
        description:
          "Gebruik de onderste tegels om veelgebruikte handelingen direct te openen.",
      },
    ],
  },
  {
    id: "klant-aanmaken",
    category: "Verkoop",
    title: "Een klant aanmaken of bewerken",
    summary:
      "Leg contact-, fiscale, taal- en betaalgegevens van een klant vast.",
    keywords: [
      "klant",
      "aanmaken",
      "bewerken",
      "btw",
      "kvk",
      "taal",
    ],
    href: "/klanten",
    steps: [
      {
        title: "Open Klanten",
        description:
          "Ga via Verkoop naar Klanten.",
        href: "/klanten",
      },
      {
        title: "Klik op Nieuwe klant",
        description:
          "Vul bedrijfsnaam, contactpersoon, e-mailadres, telefoon, plaats en land in.",
      },
      {
        title: "Vul fiscale gegevens in",
        description:
          "Bij Nederlandse klanten kan het KvK-nummer worden ingevuld. Bij buitenlandse klanten is het buitenlandse btw-nummer verplicht.",
      },
      {
        title: "Kies de taal",
        description:
          "De gekozen taal wordt gebruikt voor documenten en e-mails wanneer die vertalingen beschikbaar zijn.",
      },
      {
        title: "Sla de klant op",
        description:
          "Controleer betaaltermijn, prijslijst en eventuele klantkorting voordat je opslaat.",
      },
    ],
  },
  {
    id: "verkooporder-aanmaken",
    category: "Verkoop",
    title: "Een verkooporder aanmaken",
    summary:
      "Maak een order aan, voeg varianten toe en controleer prijzen en levering.",
    keywords: [
      "verkooporder",
      "order",
      "aanmaken",
      "bestelling",
    ],
    href: "/verkoop/nieuw",
    steps: [
      {
        title: "Open Nieuwe verkooporder",
        description:
          "Gebruik de snelkoppeling op het dashboard of ga naar Verkoop.",
        href: "/verkoop/nieuw",
      },
      {
        title: "Selecteer de klant",
        description:
          "STITCH neemt de klantgegevens, prijslijst, korting en betaaltermijn over.",
      },
      {
        title: "Voeg artikelen en varianten toe",
        description:
          "Kies per regel het artikel, de kleur, maat en het bestelde aantal.",
      },
      {
        title: "Controleer prijs en korting",
        description:
          "Controleer de netto verkoopprijs en eventuele regelkorting.",
      },
      {
        title: "Vul de gewenste leverdatum in",
        description:
          "De leverdatum wordt ook op de orderbevestiging getoond.",
      },
      {
        title: "Sla de order op",
        description:
          "De order blijft eerst in Concept totdat deze wordt bevestigd.",
      },
    ],
    warnings: [
      "Controleer aantallen, prijzen en leverdatum voordat de orderbevestiging wordt verstuurd.",
    ],
  },
  {
    id: "orderbevestiging",
    category: "Verkoop",
    title: "Een orderbevestiging versturen",
    summary:
      "Open of mail de PDF en laat de klant de orderbevestiging ondertekenen en retourneren.",
    keywords: [
      "orderbevestiging",
      "pdf",
      "ondertekenen",
      "handtekening",
      "mailen",
    ],
    href: "/verkoop",
    steps: [
      {
        title: "Open de verkooporder",
        description:
          "Ga naar Verkoop en open de juiste order.",
      },
      {
        title: "Controleer de PDF",
        description:
          "Klik op Orderbevestiging PDF en controleer klant, artikelen, prijzen en leverdatum.",
      },
      {
        title: "Mail de orderbevestiging",
        description:
          "Klik op Orderbevestiging mailen. De begeleidende tekst vraagt de klant de PDF te controleren, ondertekenen en retour te sturen.",
      },
      {
        title: "Wacht op de ondertekende PDF",
        description:
          "Neem de bestelling pas definitief in behandeling nadat de getekende orderbevestiging retour is ontvangen.",
      },
    ],
  },
  {
    id: "levering-pakbon",
    category: "Verkoop",
    title: "Een levering en pakbon verwerken",
    summary:
      "Reserveer voorraad, meld de order gereed en boek de verzending.",
    keywords: [
      "levering",
      "pakbon",
      "verzenden",
      "voorraad reserveren",
    ],
    href: "/verkoop",
    steps: [
      {
        title: "Bevestig de verkooporder",
        description:
          "Na akkoord kan de order worden bevestigd.",
      },
      {
        title: "Alloceer voorraad",
        description:
          "STITCH reserveert beschikbare voorraad voor de order.",
      },
      {
        title: "Meld de order gereed",
        description:
          "Controleer de gereserveerde aantallen voordat de order gereed wordt gemeld.",
      },
      {
        title: "Open de pakbon",
        description:
          "De pakbon is het enige klantdocument waarop de documentbarcode staat.",
      },
      {
        title: "Boek de verzending",
        description:
          "Bij verzending wordt de voorraad definitief afgeboekt.",
      },
    ],
  },
  {
    id: "retour-credit",
    category: "Verkoop",
    title: "Een retour en creditfactuur verwerken",
    summary:
      "Koppel de retour aan een eerdere levering en maak daarna een creditfactuur.",
    keywords: [
      "retour",
      "credit",
      "creditfactuur",
      "terug",
    ],
    href: "/retouren",
    steps: [
      {
        title: "Maak een retour aan",
        description:
          "Selecteer de eerdere levering waarop de retour betrekking heeft.",
        href: "/retouren",
      },
      {
        title: "Kies de voorraadlocatie",
        description:
          "Bepaal waar de retourartikelen worden teruggeboekt.",
      },
      {
        title: "Controleer de retour",
        description:
          "Controleer aantallen en retourreden voordat de retour wordt verwerkt.",
      },
      {
        title: "Maak de creditfactuur",
        description:
          "De creditfactuur wordt gebaseerd op de retour en de eerdere factuur.",
      },
      {
        title: "Mail de creditfactuur",
        description:
          "De creditfactuur kan net als een normale factuur vanuit STITCH worden verstuurd.",
      },
    ],
  },
  {
    id: "leverancier-aanmaken",
    category: "Inkoop",
    title: "Een leverancier aanmaken of bewerken",
    summary:
      "Leg contactgegevens, taal, btw-nummer en betaaltermijn vast.",
    keywords: [
      "leverancier",
      "aanmaken",
      "bewerken",
      "btw nummer",
    ],
    href: "/leveranciers",
    steps: [
      {
        title: "Open Leveranciers",
        description:
          "Ga via Inkoop naar Leveranciers.",
        href: "/leveranciers",
      },
      {
        title: "Vul de relatiegegevens in",
        description:
          "Vul bedrijfsnaam, contactpersoon, e-mail, telefoon en land in.",
      },
      {
        title: "Controleer buitenlandse btw",
        description:
          "Bij een buitenlandse leverancier is een btw-nummer verplicht.",
      },
      {
        title: "Kies taal en betaaltermijn",
        description:
          "Deze gegevens worden gebruikt bij inkoopdocumenten en communicatie.",
      },
    ],
  },
  {
    id: "inkooporder",
    category: "Inkoop",
    title: "Een inkooporder aanmaken en ontvangen",
    summary:
      "Bestel kant-en-klare artikelen bij een leverancier en boek de ontvangst.",
    keywords: [
      "inkooporder",
      "inkoop",
      "ontvangst",
      "leverancier",
    ],
    href: "/inkoop/nieuw",
    steps: [
      {
        title: "Maak een inkooporder aan",
        description:
          "Selecteer leverancier, collectie, leverdatum en artikelen.",
        href: "/inkoop/nieuw",
      },
      {
        title: "Controleer inkoopprijzen",
        description:
          "Controleer per variant het bestelde aantal en de inkoopprijs.",
      },
      {
        title: "Verstuur de inkooporder",
        description:
          "Open of mail de inkooporder vanuit STITCH.",
      },
      {
        title: "Boek de ontvangst",
        description:
          "Boek alleen werkelijk ontvangen aantallen. De voorraad wordt daarna verhoogd.",
        href: "/inkoop/ontvangsten",
      },
    ],
  },
  {
    id: "artikel-aanmaken",
    category: "Voorraad",
    title: "Een artikel en varianten aanmaken",
    summary:
      "Leg Product DNA, btw, prijzen en varianten per kleur en maat vast.",
    keywords: [
      "artikel",
      "product",
      "variant",
      "maat",
      "kleur",
      "materiaal",
    ],
    href: "/artikelen/nieuw",
    steps: [
      {
        title: "Open Nieuw artikel",
        description:
          "Gebruik de dashboard-snelkoppeling of ga naar Artikelen.",
        href: "/artikelen/nieuw",
      },
      {
        title: "Vul Product DNA in",
        description:
          "Leg type kledingstuk, materiaal, pasvorm, kleurfamilie en seizoenstype vast.",
      },
      {
        title: "Kies Nederlandse btw",
        description:
          "Het artikel bevat de btw-code die voor Nederlandse verkopen geldt.",
      },
      {
        title: "Maak varianten aan",
        description:
          "Maak de benodigde kleur- en maatcombinaties met SKU, barcode, voorraad en prijzen.",
      },
      {
        title: "Sla het artikel op",
        description:
          "Controleer de gegevens voordat het artikel actief wordt gebruikt.",
      },
    ],
  },
  {
    id: "voorraad",
    category: "Voorraad",
    title: "Voorraad controleren en corrigeren",
    summary:
      "Bekijk voorraad per artikel, variant en locatie en registreer correcties.",
    keywords: [
      "voorraad",
      "warehouse",
      "correctie",
      "locatie",
      "telling",
    ],
    href: "/voorraad",
    steps: [
      {
        title: "Open Voorraadoverzicht",
        description:
          "Bekijk de actuele fysieke voorraad en minimumvoorraad.",
        href: "/voorraad",
      },
      {
        title: "Controleer voorraadlocaties",
        description:
          "Voorraad wordt per ingestelde locatie bijgehouden.",
      },
      {
        title: "Voer een telling uit",
        description:
          "Gebruik Voorraadtellingen om fysieke aantallen te vergelijken met STITCH.",
        href: "/warehouse/tellingen",
      },
      {
        title: "Registreer verschillen",
        description:
          "Gebruik een correctie en leg altijd een duidelijke reden vast.",
      },
    ],
    warnings: [
      "Corrigeer voorraad niet door een verkoop- of inkoopdocument te verwijderen.",
    ],
  },
  {
    id: "factuur",
    category: "Financieel",
    title: "Een factuur maken en versturen",
    summary:
      "Maak de factuur vanuit de levering, controleer btw en mail de PDF.",
    keywords: [
      "factuur",
      "mailen",
      "btw",
      "qr",
      "betaling",
    ],
    href: "/facturen",
    steps: [
      {
        title: "Open de geleverde verkooporder",
        description:
          "De factuur wordt gebaseerd op de werkelijk geleverde aantallen.",
      },
      {
        title: "Maak de factuur",
        description:
          "Controleer klantgegevens, btw-code, betaaltermijn en bedragen.",
      },
      {
        title: "Controleer de PDF",
        description:
          "De factuur bevat geen barcode. Wanneer IBAN en betaalgegevens zijn ingevuld, wordt een betaal-QR getoond.",
      },
      {
        title: "Mail de factuur",
        description:
          "Verstuur de factuur rechtstreeks vanuit STITCH.",
      },
      {
        title: "Controleer Exact Bridge",
        description:
          "De compacte verzamelfactuur wordt klaargezet voor de administratie in Exact.",
        href: "/instellingen/exact-online",
      },
    ],
  },
  {
    id: "debiteuren",
    category: "Financieel",
    title: "Openstaande posten, herinneringen en aanmaningen",
    summary:
      "Volg vervaldata en verstuur herinneringen vanuit STITCH.",
    keywords: [
      "debiteuren",
      "openstaand",
      "herinnering",
      "aanmaning",
      "vervallen",
    ],
    href: "/debiteuren",
    steps: [
      {
        title: "Open Debiteuren",
        description:
          "Bekijk openstaande en vervallen facturen.",
        href: "/debiteuren",
      },
      {
        title: "Controleer betalingen",
        description:
          "Controleer of betalingen uit Exact correct zijn verwerkt.",
      },
      {
        title: "Verstuur een herinnering",
        description:
          "Herinneringen en aanmaningen worden vanuit STITCH verstuurd.",
      },
    ],
  },
  {
    id: "rapportages",
    category: "Rapportages",
    title: "Rapportages en KPI’s gebruiken",
    summary:
      "Analyseer omzet, klanten, artikelen, voorraad en marges.",
    keywords: [
      "rapportage",
      "omzet",
      "kpi",
      "analyse",
      "marge",
    ],
    href: "/rapportages",
    steps: [
      {
        title: "Open Rapportages",
        description:
          "Gebruik de filters voor periode, klant, collectie en artikel.",
        href: "/rapportages",
      },
      {
        title: "Controleer de databron",
        description:
          "Omzet wordt bij voorkeur gebaseerd op geboekte facturen.",
      },
      {
        title: "Open onderliggende gegevens",
        description:
          "Gebruik doorkliklinks om de orders, facturen of artikelen achter een KPI te bekijken.",
      },
    ],
  },
  {
    id: "supply-intelligence",
    category: "Supply Intelligence",
    title: "Supply Intelligence begrijpen",
    summary:
      "Gebruik historische data voor analyses op maat, kleur, materiaal, pasvorm en seizoen.",
    keywords: [
      "supply",
      "forecast",
      "maatcurve",
      "kleur",
      "materiaal",
      "besteladvies",
    ],
    href: "/supply-intelligence",
    steps: [
      {
        title: "Bouw betrouwbare historie op",
        description:
          "STITCH registreert orders, leveringen, facturen, retouren, inkooporders en ontvangsten.",
      },
      {
        title: "Vergelijk eigenschappen",
        description:
          "Analyseer prestaties op maat, kleur, materiaal, pasvorm en type kledingstuk.",
      },
      {
        title: "Gebruik adviezen als ondersteuning",
        description:
          "Besteladviezen zijn een hulpmiddel. Controleer collectie, seizoen en commerciële planning altijd zelf.",
      },
    ],
  },
  {
    id: "bedrijfsinstellingen",
    category: "Instellingen",
    title: "Bedrijfsinstellingen beheren",
    summary:
      "Beheer bedrijfsgegevens, huisstijl, voorraadlocaties, gebruikers en koppelingen.",
    keywords: [
      "instellingen",
      "logo",
      "bedrijf",
      "gebruikers",
      "exact",
    ],
    href: "/instellingen",
    steps: [
      {
        title: "Bedrijfsgegevens",
        description:
          "Beheer NAW, KvK, btw, IBAN, contactgegevens en logo.",
        href: "/instellingen/bedrijf",
      },
      {
        title: "Gebruikers en rechten",
        description:
          "Beheer gebruikers, rollen en toegang.",
        href: "/instellingen/gebruikers",
      },
      {
        title: "Voorraadlocaties",
        description:
          "Voeg locaties toe, wijzig namen en archiveer ongebruikte locaties.",
        href: "/instellingen/voorraadlocaties",
      },
      {
        title: "Exact Online",
        description:
          "Controleer queue, logging, fouten en synchronisatiestatus.",
        href: "/instellingen/exact-online",
      },
      {
        title: "Back-up",
        description:
          "Download of herstel een lokale STITCH-back-up.",
        href: "/instellingen/backup",
      },
    ],
  },
  {
    id: "niet-verwijderen",
    category: "Veelgestelde vragen",
    title: "Waarom kan ik een klant, leverancier of artikel niet verwijderen?",
    summary:
      "STITCH beschermt gegevens die al in transacties of voorraadhistorie zijn gebruikt.",
    keywords: [
      "verwijderen",
      "archiveren",
      "kan niet verwijderen",
    ],
    steps: [
      {
        title: "Controleer de melding",
        description:
          "STITCH toont welke orders, facturen, retouren, inkooporders of voorraadposities het verwijderen blokkeren.",
      },
      {
        title: "Archiveer het record",
        description:
          "Gearchiveerde gegevens blijven in de historie beschikbaar, maar worden niet meer standaard geselecteerd.",
      },
    ],
  },
  {
    id: "pdf-ontbreekt",
    category: "Veelgestelde vragen",
    title: "Waarom opent een PDF niet?",
    summary:
      "Controleer pop-upblokkering, bedrijfsinstellingen en de actuele document-engine.",
    keywords: [
      "pdf",
      "opent niet",
      "download",
      "popup",
    ],
    steps: [
      {
        title: "Sta pop-ups toe",
        description:
          "De browser kan het nieuwe PDF-venster blokkeren.",
      },
      {
        title: "Probeer Downloaden",
        description:
          "Gebruik de downloadknop wanneer openen in een nieuw tabblad niet werkt.",
      },
      {
        title: "Controleer bedrijfsgegevens",
        description:
          "Onvolledige instellingen kunnen onderdelen van een document beïnvloeden.",
      },
    ],
  },
];

export function findHelpArticles(query: string) {
  const normalized = query
    .trim()
    .toLowerCase();

  if (!normalized) {
    return helpArticles;
  }

  return helpArticles.filter((article) =>
    [
      article.title,
      article.summary,
      article.category,
      ...article.keywords,
      ...article.steps.map(
        (step) =>
          `${step.title} ${step.description}`,
      ),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function getHelpForPath(
  pathname: string,
) {
  const routeMatches = helpArticles.filter(
    (article) =>
      article.href &&
      (pathname === article.href ||
        pathname.startsWith(
          `${article.href}/`,
        )),
  );

  return routeMatches.length
    ? routeMatches
    : helpArticles.filter(
        (article) =>
          article.category ===
          "Veelgestelde vragen",
      );
}
