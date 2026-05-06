import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Product, ProductIngredient, Ingredient, PACK_SIZE_OPTIONS, PACK_MULTIPLIERS } from '@/types/costing';
import { getIngredients, getProducts, saveProduct, updateProduct, deleteProduct, calculateProduct, formatLKR } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Pencil, X, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// Extract base product name by stripping trailing pack size suffixes
function getBaseName(name: string): string {
  return name.replace(/\s+(100g|150g|200g|250g|400g|500g|1kg)$/i, '').trim();
}

interface ProductGroup {
  baseName: string;
  products: Product[];
}

interface ProductFormState {
  name: string;
  packSizes: string[];
  ingredients: ProductIngredient[];
  labourCost: string;
  packingCost: string;
  electricityGasCost: string;
  marginPercent: string;
}

const emptyForm: ProductFormState = {
  name: '',
  packSizes: ['250g'],
  ingredients: [],
  labourCost: '0',
  packingCost: '0',
  electricityGasCost: '0',
  marginPercent: '30',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [addIngredientId, setAddIngredientId] = useState('');
  const [addIngredientQty, setAddIngredientQty] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const [ings, prods] = await Promise.all([getIngredients(), getProducts()]);
      setAllIngredients(ings);
      setProducts(prods);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = async () => {
    setEditingId(null);
    setForm(emptyForm);
    try { setAllIngredients(await getIngredients()); } catch {}
    setSheetOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      packSizes: [p.packSize],
      ingredients: [...p.ingredients],
      labourCost: p.labourCost.toString(),
      packingCost: p.packingCost.toString(),
      electricityGasCost: p.electricityGasCost.toString(),
      marginPercent: p.marginPercent.toString(),
    });
    setSheetOpen(true);
  };

  const handleAddIngredient = () => {
    if (!addIngredientId || !addIngredientQty) return;
    if (form.ingredients.some(i => i.ingredientId === addIngredientId)) {
      toast.error('Ingredient already added');
      return;
    }
    setForm({
      ...form,
      ingredients: [...form.ingredients, { ingredientId: addIngredientId, quantityGrams: parseFloat(addIngredientQty) || 0 }],
    });
    setAddIngredientId('');
    setAddIngredientQty('');
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setForm({ ...form, ingredients: form.ingredients.filter(i => i.ingredientId !== ingredientId) });
  };

  const handleIngredientQtyChange = (ingredientId: string, qty: string) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map(i =>
        i.ingredientId === ingredientId ? { ...i, quantityGrams: parseFloat(qty) || 0 } : i
      ),
    });
  };

  const togglePackSize = (size: string) => {
    setForm(prev => ({
      ...prev,
      packSizes: prev.packSizes.includes(size)
        ? prev.packSizes.filter(s => s !== size)
        : [...prev.packSizes, size],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Product name required'); return; }
    if (form.ingredients.length === 0) { toast.error('Add at least one ingredient'); return; }
    if (form.packSizes.length === 0) { toast.error('Select at least one pack size'); return; }

    const baseName = form.name.trim();
    const baseLabour = parseFloat(form.labourCost) || 0;
    const basePacking = parseFloat(form.packingCost) || 0;
    const baseElecGas = parseFloat(form.electricityGasCost) || 0;
    const baseMargin = parseFloat(form.marginPercent) || 0;

    try {
      if (editingId) {
        // Edit: save exactly what the user entered (no scaling)
        const existingProduct = products.find(p => p.id === editingId);
        await updateProduct(editingId, {
          name: baseName,
          packSize: form.packSizes[0],
          ingredients: form.ingredients,
          labourCost: baseLabour,
          packingCost: basePacking,
          electricityGasCost: baseElecGas,
          marginPercent: baseMargin,
          sellingPrice: existingProduct?.sellingPrice ?? null,
        });
        toast.success('Product updated');
      } else {
        // Create: scale ingredients & costs from 250g base to each selected pack size
        for (const size of form.packSizes) {
          const multiplier = PACK_MULTIPLIERS[size] || 1;
          const scaledIngredients = form.ingredients.map(i => ({
            ingredientId: i.ingredientId,
            quantityGrams: parseFloat((i.quantityGrams * multiplier).toFixed(2)),
          }));
          await saveProduct({
            name: `${baseName} ${size}`,
            packSize: size,
            ingredients: scaledIngredients,
            labourCost: parseFloat((baseLabour * multiplier).toFixed(2)),
            packingCost: parseFloat((basePacking * multiplier).toFixed(2)),
            electricityGasCost: parseFloat((baseElecGas * multiplier).toFixed(2)),
            marginPercent: baseMargin,
            sellingPrice: null,
          });
        }
        toast.success(`${form.packSizes.length} product(s) created`);
      }
      setSheetOpen(false);
      await loadData();
    } catch (e: any) {
      toast.error('Failed to save product');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const getIngredientName = (id: string) => allIngredients.find(i => i.id === id)?.name || 'Unknown';

  // Preview uses form values directly (no scaling) — shows cost for the entered quantities
  const formPreview = useMemo(() => {
    const packSize = editingId ? form.packSizes[0] : '250g';
    const tempProduct: Product = {
      id: '', name: '', packSize,
      ingredients: form.ingredients,
      labourCost: parseFloat(form.labourCost) || 0,
      packingCost: parseFloat(form.packingCost) || 0,
      electricityGasCost: parseFloat(form.electricityGasCost) || 0,
      marginPercent: parseFloat(form.marginPercent) || 0,
      sellingPrice: null,
    };
    return calculateProduct(tempProduct, allIngredients);
  }, [form, allIngredients, editingId]);

  const totalRecipeGrams = form.ingredients.reduce((s, i) => s + i.quantityGrams, 0);
  const availableIngredients = allIngredients.filter(i => !form.ingredients.some(fi => fi.ingredientId === i.id));

  // Group products by base name
  const productGroups = useMemo<ProductGroup[]>(() => {
    const groupMap = new Map<string, Product[]>();
    products.forEach(p => {
      const base = getBaseName(p.name);
      if (!groupMap.has(base)) groupMap.set(base, []);
      groupMap.get(base)!.push(p);
    });
    return Array.from(groupMap.entries()).map(([baseName, prods]) => ({ baseName, products: prods }));
  }, [products]);

  const toggleGroup = (baseName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(baseName)) next.delete(baseName);
      else next.add(baseName);
      return next;
    });
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Products</h1>
        <Button onClick={openCreate} size="sm" className="sm:h-10 sm:px-4 sm:text-sm"><Plus className="h-4 w-4 mr-1" />Add Product</Button>
      </div>

      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {productGroups.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No products added yet. Tap "Add Product" to get started.</CardContent></Card>
        )}
        {productGroups.map(group => {
          const isMulti = group.products.length > 1;
          const isExpanded = expandedGroups.has(group.baseName);
          return (
            <div key={group.baseName} className="space-y-1">
              {isMulti ? (
                <button
                  onClick={() => toggleGroup(group.baseName)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-muted/60 text-sm font-semibold text-foreground"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  {group.baseName}
                  <span className="text-xs font-normal text-muted-foreground ml-auto">{group.products.length} variants</span>
                </button>
              ) : null}
              {(isMulti ? (isExpanded ? group.products : []) : group.products).map(p => {
                const calc = calculateProduct(p, allIngredients);
                return (
                  <Card key={p.id} className={isMulti ? 'ml-4 border-l-2 border-primary/20' : ''}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{isMulti ? p.packSize : p.name}</p>
                          {!isMulti && <p className="text-xs text-muted-foreground">{p.packSize}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Cost</span>
                          <p className="font-medium">{formatLKR(calc.actualCost)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Selling</span>
                          <p className="font-bold text-primary">{formatLKR(calc.sellingPrice)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Profit</span>
                          <p className="font-medium">{Math.round(calc.profitPercent)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Desktop table view */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Pack</TableHead>
                  <TableHead>Ing.Cost (LKR)</TableHead>
                  <TableHead>Labour (LKR)</TableHead>
                  <TableHead>Packing (LKR)</TableHead>
                  <TableHead>Elec & Gas (LKR)</TableHead>
                  <TableHead>Actual Cost (LKR)</TableHead>
                  <TableHead>Margin %</TableHead>
                  <TableHead>Margin (LKR)</TableHead>
                  <TableHead>Selling Price (LKR)</TableHead>
                  <TableHead>Profit %</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productGroups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                      No products added yet. Click "Add Product" to get started.
                    </TableCell>
                  </TableRow>
                )}
                {productGroups.map(group => {
                  const isMulti = group.products.length > 1;
                  const isExpanded = expandedGroups.has(group.baseName);

                  if (!isMulti) {
                    // Single product — render normally
                    const p = group.products[0];
                    const calc = calculateProduct(p, allIngredients);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.packSize}</TableCell>
                        <TableCell>{formatLKR(calc.ingredientCost)}</TableCell>
                        <TableCell>{formatLKR(p.labourCost)}</TableCell>
                        <TableCell>{formatLKR(p.packingCost)}</TableCell>
                        <TableCell>{formatLKR(p.electricityGasCost)}</TableCell>
                        <TableCell className="font-medium">{formatLKR(calc.actualCost)}</TableCell>
                        <TableCell>{p.marginPercent}%</TableCell>
                        <TableCell>{formatLKR(calc.marginLKR)}</TableCell>
                        <TableCell className="font-bold text-primary">{formatLKR(calc.sellingPrice)}</TableCell>
                        <TableCell>{Math.round(calc.profitPercent)}%</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  // Multi-variant group
                  return (
                    <Fragment key={group.baseName}>
                      {/* Group header row */}
                      <TableRow
                        className="bg-muted/40 hover:bg-muted/60 cursor-pointer"
                        onClick={() => toggleGroup(group.baseName)}
                      >
                        <TableCell colSpan={12} className="py-2">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <span className="font-semibold">{group.baseName}</span>
                            <span className="text-xs text-muted-foreground">({group.products.length} variants)</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Variant rows */}
                      {isExpanded && group.products.map(p => {
                        const calc = calculateProduct(p, allIngredients);
                        return (
                          <TableRow key={p.id} className="border-l-2 border-primary/20">
                            <TableCell className="pl-10 text-muted-foreground">{p.packSize}</TableCell>
                            <TableCell>{p.packSize}</TableCell>
                            <TableCell>{formatLKR(calc.ingredientCost)}</TableCell>
                            <TableCell>{formatLKR(p.labourCost)}</TableCell>
                            <TableCell>{formatLKR(p.packingCost)}</TableCell>
                            <TableCell>{formatLKR(p.electricityGasCost)}</TableCell>
                            <TableCell className="font-medium">{formatLKR(calc.actualCost)}</TableCell>
                            <TableCell>{p.marginPercent}%</TableCell>
                            <TableCell>{formatLKR(calc.marginLKR)}</TableCell>
                            <TableCell className="font-bold text-primary">{formatLKR(calc.sellingPrice)}</TableCell>
                            <TableCell>{Math.round(calc.profitPercent)}%</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Product' : 'Create Product'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 py-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Product Name</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Protein Laddu 250g" />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Pack Sizes {!editingId && <span className="text-xs text-muted-foreground font-normal">(separate product created per size, scaled from 250g base)</span>}
              </label>
              {editingId ? (
                <Select value={form.packSizes[0]} onValueChange={v => setForm(prev => ({ ...prev, packSizes: [v] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PACK_SIZE_OPTIONS.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {PACK_SIZE_OPTIONS.map(size => (
                    <label key={size} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.packSizes.includes(size)}
                        onCheckedChange={() => togglePackSize(size)}
                      />
                      <span className="text-sm">{size}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Ingredients {!editingId ? '(per 250g base)' : `(for ${form.packSizes[0]})`}
                </label>
                <span className={`text-xs ${!editingId && Math.abs(totalRecipeGrams - 250) < 1 ? 'text-success' : ''} ${!editingId && Math.abs(totalRecipeGrams - 250) >= 1 ? 'text-destructive' : ''}`}>
                  Total: {Math.round(totalRecipeGrams)}g
                </span>
              </div>

              {form.ingredients.length > 0 && (
                <div className="border rounded-md mb-3 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead className="w-24 text-right">Qty (g)</TableHead>
                        <TableHead className="w-28 text-right">Cost</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.ingredients.map(fi => {
                        const ing = allIngredients.find(i => i.id === fi.ingredientId);
                        const cost = ing ? (ing.pricePerKg / 1000) * fi.quantityGrams : 0;
                        return (
                          <TableRow key={fi.ingredientId}>
                            <TableCell className="text-sm">{getIngredientName(fi.ingredientId)}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={fi.quantityGrams || ''}
                                onChange={e => handleIngredientQtyChange(fi.ingredientId, e.target.value)}
                                className="w-20 ml-auto text-right h-8"
                              />
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {formatLKR(cost)}
                            </TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemoveIngredient(fi.ingredientId)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1">
                  <Select value={addIngredientId} onValueChange={setAddIngredientId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select ingredient" /></SelectTrigger>
                    <SelectContent>
                      {availableIngredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input type="number" value={addIngredientQty} onChange={e => setAddIngredientQty(e.target.value)} placeholder="Grams" className="h-9 w-24" />
                  <Button size="sm" variant="secondary" onClick={handleAddIngredient}><Plus className="h-3 w-3 mr-1" />Add</Button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Operational Costs {!editingId ? '(for 250g base — auto-scaled per pack)' : `(for ${form.packSizes[0]})`} (LKR)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Labour</label>
                  <Input type="number" value={form.labourCost} onChange={e => setForm({ ...form, labourCost: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Packing</label>
                  <Input type="number" value={form.packingCost} onChange={e => setForm({ ...form, packingCost: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Elec. & Gas</label>
                  <Input type="number" value={form.electricityGasCost} onChange={e => setForm({ ...form, electricityGasCost: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="w-full sm:w-36">
              <label className="text-xs text-muted-foreground mb-1 block">Margin (%)</label>
              <Input type="number" value={form.marginPercent} onChange={e => setForm({ ...form, marginPercent: e.target.value })} />
            </div>

            {form.ingredients.length > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Cost Preview {editingId ? `(${form.packSizes[0]})` : '(250g base)'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Ingredient Cost</span>
                      <p className="font-medium">{formatLKR(formPreview.ingredientCost)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Actual Cost</span>
                      <p className="font-medium">{formatLKR(formPreview.actualCost)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Selling Price</span>
                      <p className="font-bold text-primary">{formatLKR(formPreview.sellingPrice)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Profit</span>
                      <p className="font-medium">{Math.round(formPreview.profitPercent)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <SheetFooter className="pt-4 flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">
              {editingId ? 'Update' : `Create ${form.packSizes.length} Product(s)`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
