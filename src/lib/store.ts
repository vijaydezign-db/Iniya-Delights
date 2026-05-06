import { supabase } from '@/integrations/supabase/client';
import { Ingredient, Product, ProductCalculation, ProductIngredient, PACK_MULTIPLIERS, ComboPack, ComboPackItem, ComboCalculation } from '@/types/costing';

// Ingredients
export async function getIngredients(): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    pricePerKg: Number(row.price_per_kg),
  }));
}

export async function saveIngredient(ingredient: Omit<Ingredient, 'id'>): Promise<Ingredient> {
  const { data, error } = await supabase
    .from('ingredients')
    .insert({ name: ingredient.name, price_per_kg: ingredient.pricePerKg })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, pricePerKg: Number(data.price_per_kg) };
}

export async function updateIngredient(id: string, updates: Partial<Ingredient>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.pricePerKg !== undefined) payload.price_per_kg = updates.pricePerKg;
  const { error } = await supabase.from('ingredients').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteIngredient(id: string): Promise<void> {
  const { error } = await supabase.from('ingredients').delete().eq('id', id);
  if (error) throw error;
}

// Products (with their ingredients)
export async function getProducts(): Promise<Product[]> {
  const { data: productsData, error: pErr } = await supabase
    .from('products')
    .select('*, product_ingredients(*)')
    .order('name');
  if (pErr) throw pErr;

  return (productsData || []).map(row => ({
    id: row.id,
    name: row.name,
    packSize: row.pack_size,
    ingredients: (row.product_ingredients || []).map((pi: any) => ({
      ingredientId: pi.ingredient_id,
      quantityGrams: Number(pi.quantity_grams),
    })),
    labourCost: Number(row.labour_cost),
    packingCost: Number(row.packing_cost),
    electricityGasCost: Number(row.electricity_gas_cost),
    marginPercent: Number(row.margin_percent),
    sellingPrice: row.selling_price != null ? Number(row.selling_price) : null,
  }));
}

export async function saveProduct(product: Omit<Product, 'id'>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name,
      pack_size: product.packSize,
      labour_cost: product.labourCost,
      packing_cost: product.packingCost,
      electricity_gas_cost: product.electricityGasCost,
      margin_percent: product.marginPercent,
      selling_price: product.sellingPrice,
    })
    .select()
    .single();
  if (error) throw error;

  if (product.ingredients.length > 0) {
    const { error: piErr } = await supabase.from('product_ingredients').insert(
      product.ingredients.map(i => ({
        product_id: data.id,
        ingredient_id: i.ingredientId,
        quantity_grams: i.quantityGrams,
      }))
    );
    if (piErr) throw piErr;
  }

  return { ...product, id: data.id };
}

export async function updateProduct(id: string, product: Omit<Product, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      name: product.name,
      pack_size: product.packSize,
      labour_cost: product.labourCost,
      packing_cost: product.packingCost,
      electricity_gas_cost: product.electricityGasCost,
      margin_percent: product.marginPercent,
      selling_price: product.sellingPrice,
    })
    .eq('id', id);
  if (error) throw error;

  // Replace product_ingredients
  const { error: delErr } = await supabase.from('product_ingredients').delete().eq('product_id', id);
  if (delErr) throw delErr;

  if (product.ingredients.length > 0) {
    const { error: piErr } = await supabase.from('product_ingredients').insert(
      product.ingredients.map(i => ({
        product_id: id,
        ingredient_id: i.ingredientId,
        quantity_grams: i.quantityGrams,
      }))
    );
    if (piErr) throw piErr;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// Calculations (pure functions, unchanged)
export function calculateProduct(product: Product, allIngredients: Ingredient[]): ProductCalculation {
  // Each product stores its actual ingredient quantities and costs — no multiplier scaling needed
  const ingredientCost = product.ingredients.reduce((total, item) => {
    const ingredient = allIngredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return total;
    const pricePerGram = ingredient.pricePerKg / 1000;
    return total + item.quantityGrams * pricePerGram;
  }, 0);

  const actualCost = ingredientCost + product.labourCost + product.packingCost + product.electricityGasCost;
  
  if (product.sellingPrice != null) {
    const sellingPrice = product.sellingPrice;
    const marginLKR = sellingPrice - actualCost;
    const profitPercent = actualCost > 0 ? (marginLKR / actualCost) * 100 : 0;
    return { ingredientCost, actualCost, marginLKR, sellingPrice, profitPercent };
  }

  const marginLKR = actualCost * (product.marginPercent / 100);
  const sellingPrice = actualCost + marginLKR;
  const profitPercent = actualCost > 0 ? (marginLKR / actualCost) * 100 : 0;

  return { ingredientCost, actualCost, marginLKR, sellingPrice, profitPercent };
}

export function formatLKR(amount: number): string {
  return amount.toFixed(2);
}

// Combo Packs
export async function getComboPacks(): Promise<ComboPack[]> {
  const { data, error } = await supabase
    .from('combo_packs')
    .select('*, combo_pack_items(*)')
    .order('name');
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    packSize: row.pack_size,
    items: (row.combo_pack_items || []).map((item: any) => ({
      productId: item.product_id,
      packSize: item.pack_size,
    })),
    labourCost: Number(row.labour_cost),
    packingCost: Number(row.packing_cost),
    electricityGasCost: Number(row.electricity_gas_cost),
    marginPercent: Number(row.margin_percent),
  }));
}

export async function saveComboPack(combo: Omit<ComboPack, 'id'>): Promise<ComboPack> {
  const { data, error } = await supabase
    .from('combo_packs')
    .insert({
      name: combo.name,
      pack_size: combo.packSize,
      labour_cost: combo.labourCost,
      packing_cost: combo.packingCost,
      electricity_gas_cost: combo.electricityGasCost,
      margin_percent: combo.marginPercent,
    })
    .select()
    .single();
  if (error) throw error;

  if (combo.items.length > 0) {
    const { error: itemErr } = await supabase.from('combo_pack_items').insert(
      combo.items.map(item => ({
        combo_pack_id: data.id,
        product_id: item.productId,
        pack_size: item.packSize,
      }))
    );
    if (itemErr) throw itemErr;
  }

  return { ...combo, id: data.id };
}

export async function updateComboPack(id: string, combo: Omit<ComboPack, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('combo_packs')
    .update({
      name: combo.name,
      pack_size: combo.packSize,
      labour_cost: combo.labourCost,
      packing_cost: combo.packingCost,
      electricity_gas_cost: combo.electricityGasCost,
      margin_percent: combo.marginPercent,
    })
    .eq('id', id);
  if (error) throw error;

  const { error: delErr } = await supabase.from('combo_pack_items').delete().eq('combo_pack_id', id);
  if (delErr) throw delErr;

  if (combo.items.length > 0) {
    const { error: itemErr } = await supabase.from('combo_pack_items').insert(
      combo.items.map(item => ({
        combo_pack_id: id,
        product_id: item.productId,
        pack_size: item.packSize,
      }))
    );
    if (itemErr) throw itemErr;
  }
}

export async function deleteComboPack(id: string): Promise<void> {
  const { error } = await supabase.from('combo_packs').delete().eq('id', id);
  if (error) throw error;
}

export function calculateComboPack(
  combo: ComboPack,
  products: Product[],
  allIngredients: Ingredient[]
): ComboCalculation {
  const itemBreakdown = combo.items.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return { productId: item.productId, packSize: item.packSize, ingredientCost: 0 };

    const multiplier = PACK_MULTIPLIERS[item.packSize] || 1;
    // Use the product's base ingredients (250g) and scale to the chosen pack size
    const ingredientCost = product.ingredients.reduce((total, pi) => {
      const ing = allIngredients.find(i => i.id === pi.ingredientId);
      if (!ing) return total;
      return total + (ing.pricePerKg / 1000) * pi.quantityGrams * multiplier;
    }, 0);

    return { productId: item.productId, packSize: item.packSize, ingredientCost };
  });

  const totalIngredientCost = itemBreakdown.reduce((sum, item) => sum + item.ingredientCost, 0);
  const actualCost = totalIngredientCost + combo.labourCost + combo.packingCost + combo.electricityGasCost;
  const marginLKR = actualCost * (combo.marginPercent / 100);
  const sellingPrice = actualCost + marginLKR;
  const profitPercent = actualCost > 0 ? (marginLKR / actualCost) * 100 : 0;

  return { totalIngredientCost, actualCost, marginLKR, sellingPrice, profitPercent, itemBreakdown };
}
