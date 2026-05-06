import { useState, useEffect, useMemo } from 'react';
import { Product, Ingredient, PACK_MULTIPLIERS } from '@/types/costing';
import { getProducts, getIngredients, calculateProduct, formatLKR, updateProduct } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CalculatorPage() {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [prods, ings] = await Promise.all([getProducts(), getIngredients()]);
        setProducts(prods);
        setAllIngredients(ings);
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const product = products.find((p) => p.id === selectedProduct);

  const [overrides, setOverrides] = useState({
    labourCost: '',
    packingCost: '',
    electricityGasCost: '',
    marginPercent: '',
    sellingPrice: ''
  });
  const [sellingPriceLocked, setSellingPriceLocked] = useState(false);

  useEffect(() => {
    if (product) {
      const tempCalc = calculateProduct(product, allIngredients);
      // If product has a stored selling price, use it and back-calculate margin
      if (product.sellingPrice != null) {
        const sp = product.sellingPrice;
        const ingCost = product.ingredients.reduce((total, item) => {
          const ing = allIngredients.find(i => i.id === item.ingredientId);
          if (!ing) return total;
          return total + item.quantityGrams * (ing.pricePerKg / 1000);
        }, 0);
        const actual = ingCost + product.labourCost + product.packingCost + product.electricityGasCost;
        const margin = actual > 0 ? ((sp - actual) / actual) * 100 : 0;
        setOverrides({
          labourCost: product.labourCost.toString(),
          packingCost: product.packingCost.toString(),
          electricityGasCost: product.electricityGasCost.toString(),
          marginPercent: margin.toFixed(2),
          sellingPrice: sp.toFixed(2)
        });
        setSellingPriceLocked(true);
      } else {
        setOverrides({
          labourCost: product.labourCost.toString(),
          packingCost: product.packingCost.toString(),
          electricityGasCost: product.electricityGasCost.toString(),
          marginPercent: product.marginPercent.toString(),
          sellingPrice: tempCalc.sellingPrice.toFixed(2)
        });
        setSellingPriceLocked(false);
      }
    }
  }, [selectedProduct]);

  const calcProduct = useMemo(() => {
    if (!product) return null;
    return {
      ...product,
      labourCost: parseFloat(overrides.labourCost) || 0,
      packingCost: parseFloat(overrides.packingCost) || 0,
      electricityGasCost: parseFloat(overrides.electricityGasCost) || 0,
      marginPercent: parseFloat(overrides.marginPercent) || 0
    } as Product;
  }, [product, overrides]);

  const calc = calcProduct ? calculateProduct(calcProduct, allIngredients) : null;
  const multiplier = product ? PACK_MULTIPLIERS[product.packSize] || 1 : 1;

  // When selling price is manually edited, back-calculate margin % without re-syncing selling price
  const handleSellingPriceChange = (value: string) => {
    setSellingPriceLocked(true);
    setOverrides(o => {
      const sp = parseFloat(value) || 0;
      const labour = parseFloat(o.labourCost) || 0;
      const packing = parseFloat(o.packingCost) || 0;
      const elecGas = parseFloat(o.electricityGasCost) || 0;
      let actualCost = labour + packing + elecGas;
      if (product) {
        actualCost += product.ingredients.reduce((total, item) => {
          const ing = allIngredients.find(i => i.id === item.ingredientId);
          if (!ing) return total;
          return total + item.quantityGrams * (ing.pricePerKg / 1000);
        }, 0);
      }
      const newMargin = actualCost > 0 ? ((sp - actualCost) / actualCost) * 100 : 0;
      return { ...o, sellingPrice: value, marginPercent: newMargin.toFixed(2) };
    });
  };

  // When non-selling-price fields change, sync selling price from calculated value
  const handleCostOverrideChange = (field: string, value: string) => {
    setOverrides(o => {
      const next = { ...o, [field]: value };
      const labour = parseFloat(field === 'labourCost' ? value : next.labourCost) || 0;
      const packing = parseFloat(field === 'packingCost' ? value : next.packingCost) || 0;
      const elecGas = parseFloat(field === 'electricityGasCost' ? value : next.electricityGasCost) || 0;
      const margin = parseFloat(field === 'marginPercent' ? value : next.marginPercent) || 0;
      if (product) {
        const ingCost = product.ingredients.reduce((total, item) => {
          const ing = allIngredients.find(i => i.id === item.ingredientId);
          if (!ing) return total;
          return total + item.quantityGrams * (ing.pricePerKg / 1000);
        }, 0);
        const actual = ingCost + labour + packing + elecGas;
        if (sellingPriceLocked && field !== 'marginPercent') {
          // Keep selling price fixed, recalculate margin
          const sp = parseFloat(next.sellingPrice) || 0;
          const newMargin = actual > 0 ? ((sp - actual) / actual) * 100 : 0;
          next.marginPercent = newMargin.toFixed(2);
        } else {
          // Recalculate selling price from margin
          const sp = actual + actual * (margin / 100);
          next.sellingPrice = sp.toFixed(2);
        }
      }
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (!product || !calcProduct) return;
    try {
      const toSave = {
        ...calcProduct,
        sellingPrice: sellingPriceLocked ? parseFloat(overrides.sellingPrice) || null : null,
      };
      const { id, ...rest } = toSave;
      await updateProduct(product.id, rest);
      setProducts((prev) => prev.map((p) => p.id === product.id ? toSave : p));
      toast.success('Product costs updated');
    } catch {
      toast.error('Failed to save changes');
    }
  };

  const hasChanges = product && (
  parseFloat(overrides.labourCost) !== product.labourCost ||
  parseFloat(overrides.packingCost) !== product.packingCost ||
  parseFloat(overrides.electricityGasCost) !== product.electricityGasCost ||
  parseFloat(overrides.marginPercent) !== product.marginPercent);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Cost Calculator</h1>
        {hasChanges &&
        <Button onClick={handleSaveChanges} className="w-full sm:w-auto">Save Changes to Product</Button>
        }
      </div>

      <div className="flex-col gap-4 mb-6 sm:items-center justify-between sm:gap-[24px] flex sm:flex-row">
        <div className="w-full sm:w-72">
          <label className="text-xs text-muted-foreground mb-1 block">Select Product</label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger><SelectValue placeholder="Choose a product" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.packSize})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {calc &&
        <div className="flex items-center bg-gray-200 px-[10px] py-[10px] rounded-xl gap-[24px] ml-auto">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Profit %</div>
              <div className="text-lg font-bold">{calc.profitPercent.toFixed(2)}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Profit (LKR)</div>
              <div className="text-lg font-bold">{formatLKR(calc.sellingPrice - calc.actualCost)}</div>
            </div>
          </div>
        }
      </div>

      {!product &&
      <Card><CardContent className="py-8 text-center text-muted-foreground">Select a product to view cost breakdown.</CardContent></Card>
      }

      {product && calc &&
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ingredients — {product.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="text-right">Qty (g)</TableHead>
                    <TableHead className="text-right">Cost (LKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.ingredients.map((pi) => {
                  const ing = allIngredients.find((i) => i.id === pi.ingredientId);
                  const cost = ing ? ing.pricePerKg / 1000 * pi.quantityGrams * multiplier : 0;
                  return (
                    <TableRow key={pi.ingredientId}>
                        <TableCell className="text-sm">{ing?.name || 'Unknown'}</TableCell>
                        <TableCell className="text-right text-sm">{Math.round(pi.quantityGrams * multiplier)}g</TableCell>
                        <TableCell className="text-right text-sm">{formatLKR(cost)}</TableCell>
                      </TableRow>);

                })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cost Breakdown — {product.packSize}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Ingredient Cost</TableCell>
                    <TableCell className="text-right text-sm">{formatLKR(calc.ingredientCost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Labour</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" value={overrides.labourCost} onChange={(e) => handleCostOverrideChange('labourCost', e.target.value)} className="w-24 sm:w-28 ml-auto text-right h-8 text-sm" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Packing Charge</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" value={overrides.packingCost} onChange={(e) => handleCostOverrideChange('packingCost', e.target.value)} className="w-24 sm:w-28 ml-auto text-right h-8 text-sm" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Electricity & Gas</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" value={overrides.electricityGasCost} onChange={(e) => handleCostOverrideChange('electricityGasCost', e.target.value)} className="w-24 sm:w-28 ml-auto text-right h-8 text-sm" />
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold text-sm">Actual Cost</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatLKR(calc.actualCost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Margin (%)</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" value={overrides.marginPercent} onChange={(e) => handleCostOverrideChange('marginPercent', e.target.value)} className="w-24 sm:w-28 ml-auto text-right h-8 text-sm" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Margin (LKR)</TableCell>
                    <TableCell className="text-right text-sm">{formatLKR(calc.marginLKR)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold text-primary text-sm">Selling Price</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" value={overrides.sellingPrice} onChange={(e) => handleSellingPriceChange(e.target.value)} className="w-24 sm:w-28 ml-auto text-right h-8 text-sm font-bold text-primary" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      }
    </div>);

}