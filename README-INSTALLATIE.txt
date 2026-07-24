STiTch 5.2.3 - Communicatie-instellingen

Kopieer de map src uit deze patch over de src-map van je huidige STiTch-project.
De patch voegt alleen de communicatie-instellingen toe en wijzigt geen leveranciersgegevens.

Daarna uitvoeren:
rm -rf .next
npm run dev

Nieuwe pagina:
Instellingen > E-mail & documenten

Functionaliteit:
- Meerdere eigen afzenderadressen
- Naam afzender, e-mailadres, reply-to en handtekening
- Actief/inactief en definitief verwijderen
- Standaard afzender per documenttype
- Onderwerp en e-mailtekst per documenttype
- CC, BCC en PDF meesturen
- Ondersteuning voor templatevariabelen
