
-- Combo packs table
CREATE TABLE public.combo_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  labour_cost NUMERIC NOT NULL DEFAULT 0,
  packing_cost NUMERIC NOT NULL DEFAULT 0,
  electricity_gas_cost NUMERIC NOT NULL DEFAULT 0,
  margin_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Combo pack items (products in the combo with their chosen pack size)
CREATE TABLE public.combo_pack_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_pack_id UUID NOT NULL REFERENCES public.combo_packs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  pack_size TEXT NOT NULL DEFAULT '250g',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.combo_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_pack_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for combo_packs
CREATE POLICY "Authenticated users can select combo_packs" ON public.combo_packs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert combo_packs" ON public.combo_packs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update combo_packs" ON public.combo_packs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete combo_packs" ON public.combo_packs FOR DELETE TO authenticated USING (true);

-- RLS policies for combo_pack_items
CREATE POLICY "Authenticated users can select combo_pack_items" ON public.combo_pack_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert combo_pack_items" ON public.combo_pack_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update combo_pack_items" ON public.combo_pack_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete combo_pack_items" ON public.combo_pack_items FOR DELETE TO authenticated USING (true);

-- Trigger for updated_at on combo_packs
CREATE TRIGGER update_combo_packs_updated_at
BEFORE UPDATE ON public.combo_packs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
