export interface Ingredient {
  id: string;
  name: string;
  pricePerKg: number; // LKR
}

export interface ProductIngredient {
  ingredientId: string;
  quantityGrams: number;
}

export interface Product {
  id: string;
  name: string;
  packSize: string; // e.g. "100g", "250g", "500g", "1kg"
  ingredients: ProductIngredient[];
  labourCost: number;
  packingCost: number;
  electricityGasCost: number;
  marginPercent: number;
  sellingPrice: number | null; // user-locked selling price; null = auto-calculate from margin
}

// Legacy types kept for migration compatibility
export interface RecipeItem {
  productId: string;
  ingredientId: string;
  quantityGrams: number;
}

export type PackSize = '250g' | '500g' | '1kg';

export interface PackCost {
  productId: string;
  packSize: PackSize;
  labourCost: number;
  packingCost: number;
  electricityCost: number;
  gasCost: number;
}

export interface ProductCalculation {
  ingredientCost: number;
  actualCost: number;
  marginLKR: number;
  sellingPrice: number;
  profitPercent: number;
}

export const PACK_SIZE_OPTIONS = ['100g', '150g', '200g', '250g', '400g', '500g', '1kg'] as const;

// Multipliers relative to 250g base
export const PACK_MULTIPLIERS: Record<string, number> = {
  '100g': 100 / 250,
  '150g': 150 / 250,
  '200g': 200 / 250,
  '250g': 1,
  '400g': 400 / 250,
  '500g': 500 / 250,
  '1kg': 1000 / 250,
};

export interface ComboPackItem {
  productId: string;
  packSize: string;
}

export interface ComboPack {
  id: string;
  name: string;
  packSize: string;
  items: ComboPackItem[];
  labourCost: number;
  packingCost: number;
  electricityGasCost: number;
  marginPercent: number;
}

export interface ComboCalculation {
  totalIngredientCost: number;
  actualCost: number;
  marginLKR: number;
  sellingPrice: number;
  profitPercent: number;
  itemBreakdown: { productId: string; packSize: string; ingredientCost: number }[];
}
