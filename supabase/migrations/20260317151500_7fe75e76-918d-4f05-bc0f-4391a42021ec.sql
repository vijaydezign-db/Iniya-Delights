
-- Update RLS policies to require authentication

-- ingredients
DROP POLICY IF EXISTS "Allow all access to ingredients" ON public.ingredients;
CREATE POLICY "Authenticated users can select ingredients"
  ON public.ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ingredients"
  ON public.ingredients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ingredients"
  ON public.ingredients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete ingredients"
  ON public.ingredients FOR DELETE TO authenticated USING (true);

-- products
DROP POLICY IF EXISTS "Allow all access to products" ON public.products;
CREATE POLICY "Authenticated users can select products"
  ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert products"
  ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update products"
  ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete products"
  ON public.products FOR DELETE TO authenticated USING (true);

-- product_ingredients
DROP POLICY IF EXISTS "Allow all access to product_ingredients" ON public.product_ingredients;
CREATE POLICY "Authenticated users can select product_ingredients"
  ON public.product_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert product_ingredients"
  ON public.product_ingredients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update product_ingredients"
  ON public.product_ingredients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete product_ingredients"
  ON public.product_ingredients FOR DELETE TO authenticated USING (true);
