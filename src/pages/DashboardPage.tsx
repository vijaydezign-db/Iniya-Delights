import { useEffect, useState } from 'react';
import { getIngredients, getProducts } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wheat, Package } from 'lucide-react';

export default function DashboardPage() {
  const [counts, setCounts] = useState({ ingredients: 0, products: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ingredients, products] = await Promise.all([getIngredients(), getProducts()]);
        setCounts({ ingredients: ingredients.length, products: products.length });
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const stats = [
    { label: 'Ingredients', value: counts.ingredients, icon: Wheat },
    { label: 'Products', value: counts.products, icon: Package },
  ];

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="text-2xl sm:text-3xl font-bold">{loading ? '…' : value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-4 sm:mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Guide</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Add your <strong>Ingredients</strong> with prices per kg in LKR.</p>
          <p>2. Create <strong>Products</strong> — select ingredients, set pack size, costs, and margin.</p>
          <p>3. Use the <strong>Cost Calculator</strong> to view detailed cost breakdowns.</p>
        </CardContent>
      </Card>
    </div>
  );
}
