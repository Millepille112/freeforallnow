# FreeForAllNow – startprojekt

Detta är en enkel, mobilanpassad startversion av webbplatsen med:
- startsida
- sökfält som filtrerar innehåll
- kategorifilter
- enkel profilsektion
- svensk text och mörkt tema

## Testa lokalt
Öppna `index.html` i en webbläsare.

## Publicera på Vercel
1. Lägg upp hela projektmappen i ett GitHub-repository.
2. Gå till https://vercel.com/new och importera repositoryt.
3. Behåll standardinställningarna för ett statiskt projekt och tryck Deploy.

## Viktigt om Vercel Daemons
Den här första webbplatsversionen innehåller ingen daemon. En daemon är en separat bakgrundsworker för att hämta och bearbeta jobb från en kö eller annan källa. Det vore missvisande att lägga till en worker utan att veta vilket jobb den ska utföra och vilken kö/databas den ska läsa från. När det är bestämt kan en Dockerfile och `daemons`-konfiguration läggas till enligt Vercels dokumentation.

Dokumentation: https://vercel.com/docs/daemons
