import { useState, useEffect } from 'react';
import { Ingredient } from '@/types/costing';
import { getIngredients, saveIngredient, updateIngredient, deleteIngredient, formatLKR } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [name, setName] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setIngredients(await getIngredients());
    } catch (e: any) {
      toast.error('Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = async () => {
    if (!name.trim() || !pricePerKg) return;
    try {
      const newItem = await saveIngredient({ name: name.trim(), pricePerKg: parseFloat(pricePerKg) });
      setIngredients(prev => [...prev, newItem]);
      setName('');
      setPricePerKg('');
      toast.success('Ingredient added');
    } catch (e: any) {
      toast.error('Failed to add ingredient');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteIngredient(id);
      setIngredients(prev => prev.filter(i => i.id !== id));
      toast.success('Ingredient deleted');
    } catch (e: any) {
      toast.error('Failed to delete ingredient');
    }
  };

  const startEdit = (i: Ingredient) => {
    setEditId(i.id);
    setEditPrice(i.pricePerKg.toString());
  };

  const handleSaveEdit = async (id: string) => {
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice)) return;
    try {
      await updateIngredient(id, { pricePerKg: newPrice });
      setIngredients(prev => prev.map(i => i.id === id ? { ...i, pricePerKg: newPrice } : i));
      setEditId(null);
      toast.success('Price updated');
    } catch (e: any) {
      toast.error('Failed to update price');
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading…</div>;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Ingredients</h1>
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm">Add Ingredient</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cashew Nuts" />
            </div>
            <div className="w-full sm:w-48">
              <label className="text-xs text-muted-foreground mb-1 block">Price per kg (LKR)</label>
              <Input type="number" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} placeholder="0.00" />
            </div>
            <Button onClick={handleAdd} className="shrink-0 w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile card view */}
      <div className="block sm:hidden space-y-3">
        {ingredients.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No ingredients added yet.</CardContent></Card>
        )}
        {ingredients.map(i => (
          <Card key={i.id}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{i.name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span>{formatLKR(i.pricePerKg)}/kg</span>
                    <span>{formatLKR(i.pricePerKg / 1000)}/g</span>
                  </div>
                </div>
                {editId === i.id ? (
                  <div className="flex items-center gap-1">
                    <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-24 text-right h-8 text-sm" />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveEdit(i.id)}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(i)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table view */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Price/kg (LKR)</TableHead>
                <TableHead className="text-right">Price/g (LKR)</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No ingredients added yet.</TableCell></TableRow>
              )}
              {ingredients.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="text-right">
                    {editId === i.id ? (
                      <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-32 ml-auto text-right" />
                    ) : formatLKR(i.pricePerKg)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatLKR(i.pricePerKg / 1000)}</TableCell>
                  <TableCell className="text-right">
                    {editId === i.id ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(i.id)}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(i)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
