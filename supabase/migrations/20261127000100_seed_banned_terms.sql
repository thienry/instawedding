-- Terms of the Brazilian political polarization, kept off the projector.
-- Normalized as in src/utils/banned-terms.ts: lower case, no accents.
-- Left out on purpose, as they would catch innocent posts at a wedding:
-- food (coxinha, mortadela, picanha), common surnames (Moraes, Moro, Silva)
-- and everyday words (gado, mito, golpe, patriota, minions, "pt", and the
-- slogans "ele não" and "ele sim", which match ordinary sentences).
-- "lula" stays, though it also names the squid dish and is a nickname.
-- Moderators remove or add terms in the admin.
INSERT INTO public.banned_terms (term)
VALUES
  -- Politicians and their circle
  ('lula'),
  ('bolsonaro'),
  ('dilma rousseff'),
  ('fernando haddad'),
  ('alexandre de moraes'),
  ('xandao'),
  ('sergio moro'),
  ('michelle bolsonaro'),
  ('eduardo bolsonaro'),
  ('flavio bolsonaro'),
  ('carlos bolsonaro'),
  ('janja'),
  ('nikolas ferreira'),
  ('guilherme boulos'),
  ('damares'),
  -- Supporters and movements
  ('bolsonarista'),
  ('bolsonaristas'),
  ('bolsonarismo'),
  ('lulista'),
  ('lulistas'),
  ('lulismo'),
  ('petista'),
  ('petistas'),
  ('petismo'),
  ('lulopetismo'),
  -- Insults between the sides
  ('bolsominion'),
  ('bolsominions'),
  ('bolsonazi'),
  ('bozo'),
  ('petralha'),
  ('petralhas'),
  ('petralhada'),
  ('esquerdopata'),
  ('esquerdopatas'),
  ('esquerdista'),
  ('esquerdistas'),
  ('comunista'),
  ('comunistas'),
  ('isentao'),
  ('isentoes'),
  ('gado bolsonarista'),
  ('gado petista'),
  ('pao com mortadela'),
  ('luladrao'),
  ('nove dedos'),
  ('molusco'),
  ('descondenado'),
  ('genocida'),
  ('golpista'),
  ('golpistas'),
  ('imbrochavel'),
  ('inelegivel'),
  -- Slogans and catchphrases
  ('faz o l'),
  ('fiz o l'),
  ('lula ladrao'),
  ('lula livre'),
  ('lula la'),
  ('fora lula'),
  ('fora bolsonaro'),
  ('fora pt'),
  ('brasil acima de tudo'),
  ('intervencao militar'),
  ('8 de janeiro'),
  ('mamadeira de piroca'),
  ('kit gay')
ON CONFLICT (term) DO NOTHING;
