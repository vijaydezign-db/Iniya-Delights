import { useState, useEffect, useMemo } from 'react';
import { Product, Ingredient, ComboPack, PACK_SIZE_OPTIONS } from '@/types/costing';
import {
  getProducts, getIngredients, getComboPacks, saveComboPack, updateComboPack,
  deleteComboPack, calculateComboPack, formatLKR,
} from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, X } from 'lucide-react';

interface ComboFormItem {
  productId: string;
  packSize: string;
}

interface ComboForm {
  name: string;
  packSize: string;
  items: ComboFormItem[];
  labourCost: string;
  packingCost: string;
  electricityGasCost: string;
  marginPercent: string;
}

const emptyForm: ComboForm = {
  name: '',
  packSize: '250g',
  items: [],
  labourCost: '0',
  packingCost: '0',
  electricityGasCost: '0',
  marginPercent: '0',
};

export default function ComboPacksPage() {
  const [combos, setCombos] = useState<ComboPack[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ComboForm>(emptyForm);
  const [selectedCombo, setSelectedCombo] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const [prods, ings, combosData] = await Promise.all([getProducts(), getIngredients(), getComboPacks()]);
        setProducts(prods);
        setAllIngredients(ings);
        setCombos(combosData);
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Get unique product names (products have multiple pack size entries)
  const uniqueProducts = useMemo(() => {
    const seen = new Map<string, Product>();
    products.forEach(p => {
      const baseName = p.name.replace(/\s+\d+g$/, '').replace(/\s+1kg$/, '');
      if (!seen.has(baseName)) seen.set(baseName, p);
    });
    return Array.from(seen.entries());
  }, [products]);

  const handleAddItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { productId: '', packSize: '250g' }] }));
  };

  const handleRemoveItem = (index: number) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const handleItemChange = (index: number, field: keyof ComboFormItem, value: string) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (combo: ComboPack) => {
    setEditingId(combo.id);
    setForm({
      name: combo.name,
      packSize: combo.packSize,
      items: combo.items.map(item => ({ productId: item.productId, packSize: item.packSize })),
      labourCost: combo.labourCost.toString(),
      packingCost: combo.packingCost.toString(),
      electricityGasCost: combo.electricityGasCost.toString(),
      marginPercent: combo.marginPercent.toString(),
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.items.length === 0) { toast.error('Add at least one product'); return; }
    if (form.items.some(i => !i.productId)) { toast.error('Select a product for each item'); return; }

    const payload = {
      name: form.name.trim(),
      packSize: form.packSize,
      items: form.items,
      labourCost: parseFloat(form.labourCost) || 0,
      packingCost: parseFloat(form.packingCost) || 0,
      electricityGasCost: parseFloat(form.electricityGasCost) || 0,
      marginPercent: parseFloat(form.marginPercent) || 0,
    };

    try {
      if (editingId) {
        await updateComboPack(editingId, payload);
        setCombos(prev => prev.map(c => c.id === editingId ? { ...payload, id: editingId } : c));
        toast.success('Combo pack updated');
      } else {
        const saved = await saveComboPack(payload);
        setCombos(prev => [...prev, saved]);
        toast.success('Combo pack created');
      }
      setSheetOpen(false);
    } catch {
      toast.error('Failed to save combo pack');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteComboPack(id);
      setCombos(prev => prev.filter(c => c.id !== id));
      if (selectedCombo === id) setSelectedCombo('');
      toast.success('Combo pack deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const activeCombo = combos.find(c => c.id === selectedCombo);
  const calc = activeCombo ? calculateComboPack(activeCombo, products, allIngredients) : null;

  const getProductName = (productId: string) => {
    const p = products.find(pr => pr.id === productId);
    return p ? p.name.replace(/\s+\d+g$/, '').replace(/\s+1kg$/, '') : 'Unknown';
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Combo Packs</h1>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> New Combo Pack
        </Button>
      </div>

      {/* Combo list */}
      {combos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No combo packs yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Pack Sizes</TableHead>
                  <TableHead>Labour (LKR)</TableHead>
                  <TableHead>Packing (LKR)</TableHead>
                  <TableHead>Elec & Gas (LKR)</TableHead>
                  <TableHead>Margin %</TableHead>
                  <TableHead>Selling Price (LKR)</TableHead>
                  <TableHead>Profit (LKR)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combos.map(combo => {
                  const comboCalc = calculateComboPack(combo, products, allIngredients);
                  return (
                    <TableRow
                      key={combo.id}
                      className={`cursor-pointer ${selectedCombo === combo.id ? 'bg-accent' : ''}`}
                      onClick={() => setSelectedCombo(combo.id)}
                    >
                      <TableCell className="font-medium text-sm">{combo.name}</TableCell>
                      <TableCell className="text-sm">{combo.packSize}</TableCell>
                      <TableCell className="text-sm">{formatLKR(combo.labourCost)}</TableCell>
                      <TableCell className="text-sm">{formatLKR(combo.packingCost)}</TableCell>
                      <TableCell className="text-sm">{formatLKR(combo.electricityGasCost)}</TableCell>
                      <TableCell className="text-sm">{combo.marginPercent}%</TableCell>
                      <TableCell className="text-sm font-semibold">{formatLKR(comboCalc.sellingPrice)}</TableCell>
                      <TableCell className="text-sm">{formatLKR(comboCalc.sellingPrice - comboCalc.actualCost)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(combo); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(combo.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cost breakdown for selected combo */}
      {activeCombo && calc && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Products in Combo — {activeCombo.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Pack Size</TableHead>
                    <TableHead>Ing. Cost (LKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calc.itemBreakdown.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">{getProductName(item.productId)}</TableCell>
                      <TableCell className="text-sm">{item.packSize}</TableCell>
                      <TableCell className="text-sm">{formatLKR(item.ingredientCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cost Breakdown — {activeCombo.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Total Ingredient Cost</TableCell>
                    <TableCell className="text-sm">{formatLKR(calc.totalIngredientCost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Labour</TableCell>
                    <TableCell className="text-sm">{formatLKR(activeCombo.labourCost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Packing Charge</TableCell>
                    <TableCell className="text-sm">{formatLKR(activeCombo.packingCost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Electricity & Gas</TableCell>
                    <TableCell className="text-sm">{formatLKR(activeCombo.electricityGasCost)}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold text-sm">Actual Cost</TableCell>
                    <TableCell className="font-semibold text-sm">{formatLKR(calc.actualCost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Margin ({activeCombo.marginPercent}%)</TableCell>
                    <TableCell className="text-sm">{formatLKR(calc.marginLKR)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold text-primary text-sm">Selling Price</TableCell>
                    <TableCell className="font-bold text-primary text-sm">{formatLKR(calc.sellingPrice)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Profit %</TableCell>
                    <TableCell className="text-sm">{Math.round(calc.profitPercent)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground text-sm">Profit (LKR)</TableCell>
                    <TableCell className="text-sm">{formatLKR(calc.sellingPrice - calc.actualCost)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit' : 'New'} Combo Pack</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Combo Pack Name</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Diwali Gift Box" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Pack Size</label>
                <Select value={form.packSize} onValueChange={v => setForm(f => ({ ...f, packSize: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PACK_SIZE_OPTIONS.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground">Products</label>
                <Button variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                </Button>
              </div>
              {form.items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3 border rounded-md border-dashed">
                  No products added yet.
                </p>
              )}
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={item.productId} onValueChange={v => handleItemChange(idx, 'productId', v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueProducts.map(([name, p]) => (
                          <SelectItem key={p.id} value={p.id}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={item.packSize} onValueChange={v => handleItemChange(idx, 'packSize', v)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PACK_SIZE_OPTIONS.map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => handleRemoveItem(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Labour (LKR)</label>
                <Input type="number" value={form.labourCost} onChange={e => setForm(f => ({ ...f, labourCost: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Packing (LKR)</label>
                <Input type="number" value={form.packingCost} onChange={e => setForm(f => ({ ...f, packingCost: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Elec & Gas (LKR)</label>
                <Input type="number" value={form.electricityGasCost} onChange={e => setForm(f => ({ ...f, electricityGasCost: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Margin %</label>
                <Input type="number" value={form.marginPercent} onChange={e => setForm(f => ({ ...f, marginPercent: e.target.value }))} />
              </div>
            </div>
          </div>

          <SheetFooter className="pt-4 flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">{editingId ? 'Update' : 'Create'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
