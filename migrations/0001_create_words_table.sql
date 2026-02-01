-- Create words table
CREATE TABLE words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  word TEXT NOT NULL,
  explanation TEXT NOT NULL,
  example TEXT NOT NULL
);

-- Seed with initial words (2026-01-23 through 2026-02-01)
INSERT INTO words (date, word, explanation, example) VALUES
  ('2026-01-23', 'serendipiteit', 'Het onverwacht ontdekken van iets moois of waardevols terwijl je naar iets anders op zoek bent.', 'Door serendipiteit vond ze haar favoriete boek terwijl ze eigenlijk op zoek was naar een woordenboek.'),
  ('2026-01-24', 'schemering', 'Het zachte licht tussen dag en nacht, wanneer de zon net onder of boven de horizon staat.', 'Tijdens de schemering kleurt de lucht in prachtige tinten oranje en paars.'),
  ('2026-01-25', 'geborgenheid', 'Een diep gevoel van veiligheid, warmte en bescherming, vaak in de nabijheid van geliefden.', 'Bij haar grootouders thuis voelde ze altijd een gevoel van geborgenheid.'),
  ('2026-01-26', 'verwondering', 'Een gevoel van verbazing en bewondering bij het zien van iets bijzonders of onverwachts.', 'Het kind keek met verwondering naar de sterrenhemel op die heldere winternacht.'),
  ('2026-01-27', 'voorpret', 'Het plezier en de opwinding die je voelt in afwachting van iets leuks dat nog moet komen.', 'De voorpret voor de vakantie was bijna net zo fijn als de reis zelf.'),
  ('2026-01-28', 'uitwaaien', 'Naar buiten gaan om in de frisse wind het hoofd leeg te maken en tot rust te komen.', 'Na een drukke werkweek ging hij naar het strand om even lekker uit te waaien.'),
  ('2026-01-29', 'ijsbloemen', 'De sierlijke, bloemachtige ijskristallen die zich bij vriesweer op ramen vormen.', 'Op koude winterochtenden verschenen er prachtige ijsbloemen op het slaapkamerraam.'),
  ('2026-01-30', 'ochtendgloren', 'Het eerste licht van de dag, wanneer de hemel langzaam oplicht bij zonsopkomst.', 'Ze stond vroeg op om het ochtendgloren boven de zee te aanschouwen.'),
  ('2026-01-31', 'heimwee', 'Een verlangend gevoel van gemis naar huis, een vertrouwde plek of een voorbije tijd.', 'Tijdens haar studie in het buitenland had ze soms last van heimwee naar haar familie.'),
  ('2026-02-01', 'fluisterwind', 'Een heel zacht briesje dat nauwelijks voelbaar is, als een fluistering van de natuur.', 'Een fluisterwind streek door de bladeren van de oude eikenboom in de tuin.');
