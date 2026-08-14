INSERT INTO public.rewards (title, description, kind, points_cost, active, stock) VALUES
('$10 MAXOUT shop credit', 'Redeem for a $10 credit code toward any order on maxoutshop.com.', 'discount', 1000, true, NULL),
('Free MAXOUT beanie', 'A MAXOUT beanie shipped to you, on the house.', 'product', 2500, true, 25),
('One month of MAXOUT ELITE', 'A free month of ELITE added to your membership.', 'membership', 4000, true, 50)
ON CONFLICT DO NOTHING;