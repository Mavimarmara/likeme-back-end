-- Seed categorias (nomes em português, alinhados ao filterCategory do frontend)
-- Só insere se a tabela estiver vazia (evita duplicar ao rodar de novo)
INSERT INTO "category" ("id", "created_at", "updated_at", "name")
SELECT gen_random_uuid()::text, NOW(), NOW(), name
FROM (VALUES
  ('Estresse'),
  ('Relacionamento'),
  ('Saúde Bucal'),
  ('Nutrição'),
  ('Sono'),
  ('Espiritualidade'),
  ('Autoestima'),
  ('Propósito'),
  ('Ambiente'),
  ('Movimento')
) AS v(name)
WHERE (SELECT COUNT(*) FROM "category") = 0;

