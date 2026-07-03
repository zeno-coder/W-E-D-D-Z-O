INSERT INTO templates (name, slug, preview_image)
VALUES
  ('Royal Gold', 'royal-gold', '/assets/templates/royal-gold.svg'),
  ('Traditional Kerala', 'traditional-kerala', '/assets/templates/traditional-kerala.svg'),
  ('Modern Luxury', 'modern-luxury', '/assets/templates/modern-luxury.svg'),
  ('Floral Elegance', 'floral-elegance', '/assets/templates/floral-elegance.svg')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  preview_image = EXCLUDED.preview_image;
