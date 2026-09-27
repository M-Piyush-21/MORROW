import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  Eye,
  Minus,
  Plus as PlusIcon,
  IndianRupee,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getCategories, getSuppliers } from '@/services/api';
import { getSalesForProduct, generateForecastData, categoryNameById, supplierNameById } from '@/data/mockData';
import type { Product, Category, Supplier, SortConfig, SortDirection } from '@/types';
import { formatCurrency, formatNumber, formatShortDate } from '@/utils/format';
import { StockStatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 8;

export function InventoryPage() {
  const { products, addProduct, updateProduct, adjustStock, deleteProduct, settings } = useApp();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) {
      setSearch(q);
      setCurrentPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    getCategories().then(setCategories);
    getSuppliers().then(setSuppliers);
  }, []);

  const filtered = useMemo(() => {
    let result = [...products];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.categoryId === categoryFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (supplierFilter !== 'all') {
      result = result.filter((p) => p.supplierId === supplierFilter);
    }

    result.sort((a, b) => {
      const { key, direction } = sortConfig;
      let aVal: string | number = a[key as keyof Product];
      let bVal: string | number = b[key as keyof Product];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [products, search, categoryFilter, statusFilter, supplierFilter, sortConfig]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-sm text-muted-foreground">
            {formatNumber(products.length)} products · {formatCurrency(
              products.reduce((s, p) => s + p.currentStock * p.costPrice, 0),
              settings.currency,
            )} total value
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search by product name or SKU..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px] gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              <Select value={supplierFilter} onValueChange={(v) => { setSupplierFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                  Product {getSortIcon('name')}
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('sku')}>
                  SKU {getSortIcon('sku')}
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('currentStock')}>
                  Stock {getSortIcon('currentStock')}
                </TableHead>
                <TableHead className="text-right">Avg Daily</TableHead>
                <TableHead className="text-right">Reorder Pt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Days Left</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((product) => {
                const daysLeft = product.averageDailyDemand > 0
                  ? Math.floor(product.currentStock / product.averageDailyDemand)
                  : null;
                return (
                  <TableRow key={product.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => setDetailProduct(product)}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{product.sku}</TableCell>
                    <TableCell className="text-sm">{categoryNameById(product.categoryId)}</TableCell>
                    <TableCell className="text-right font-medium">{formatNumber(product.currentStock)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{product.averageDailyDemand}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{product.reorderPoint}</TableCell>
                    <TableCell><StockStatusBadge status={product.status} /></TableCell>
                    <TableCell className="text-right">
                      {daysLeft !== null ? (
                        <span className={daysLeft <= 7 ? 'text-destructive font-medium' : daysLeft <= 14 ? 'text-warning font-medium' : 'text-muted-foreground'}>
                          {daysLeft}d
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailProduct(product)}>
                            <Eye className="mr-2 h-3.5 w-3.5" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditProduct(product)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAdjustProduct(product)}>
                            <PlusIcon className="mr-2 h-3.5 w-3.5" /> Adjust Stock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => { deleteProduct(product.id); }}>
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No products found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Product Modal */}
      <AddProductModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addProduct}
        categories={categories}
        suppliers={suppliers}
      />

      {/* Edit Product Modal */}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          open={!!editProduct}
          onClose={() => setEditProduct(null)}
          onUpdate={updateProduct}
          categories={categories}
          suppliers={suppliers}
        />
      )}

      {/* Adjust Stock Modal */}
      {adjustProduct && (
        <AdjustStockModal
          product={adjustProduct}
          open={!!adjustProduct}
          onClose={() => setAdjustProduct(null)}
          onAdjust={adjustStock}
        />
      )}

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        product={detailProduct}
        open={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        currency={settings.currency}
      />
    </div>
  );
}

// ─── Add Product Modal ────────────────────────────────────────────────────
function AddProductModal({
  open, onClose, onAdd, categories, suppliers,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (p: Omit<Product, 'id' | 'status' | 'createdAt'>) => void;
  categories: Category[];
  suppliers: Supplier[];
}) {
  const [form, setForm] = useState({
    name: '', sku: '', categoryId: '', supplierId: '',
    price: 0, costPrice: 0, currentStock: 0, reorderPoint: 0,
    targetStockLevel: 0, safetyStock: 0, averageDailyDemand: 0, unit: 'units',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.sku.trim()) e.sku = 'SKU is required';
    if (!form.categoryId) e.categoryId = 'Category is required';
    if (!form.supplierId) e.supplierId = 'Supplier is required';
    if (form.price <= 0) e.price = 'Price must be greater than 0';
    if (form.costPrice <= 0) e.costPrice = 'Cost price must be greater than 0';
    if (form.currentStock < 0) e.currentStock = 'Stock cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onAdd(form);
    setForm({ name: '', sku: '', categoryId: '', supplierId: '', price: 0, costPrice: 0, currentStock: 0, reorderPoint: 0, targetStockLevel: 0, safetyStock: 0, averageDailyDemand: 0, unit: 'units' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Enter the product details below.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Product Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tata Coffee Gold" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. BEV-001" />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Supplier</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.supplierId && <p className="text-xs text-destructive">{errors.supplierId}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Selling Price (₹)</Label>
              <Input type="number" value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="0" />
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cost Price (₹)</Label>
              <Input type="number" value={form.costPrice || ''} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} placeholder="0" />
              {errors.costPrice && <p className="text-xs text-destructive">{errors.costPrice}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Stock</Label>
              <Input type="number" value={form.currentStock || ''} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reorder Point</Label>
              <Input type="number" value={form.reorderPoint || ''} onChange={(e) => setForm({ ...form, reorderPoint: Number(e.target.value) })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Level</Label>
              <Input type="number" value={form.targetStockLevel || ''} onChange={(e) => setForm({ ...form, targetStockLevel: Number(e.target.value) })} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Safety Stock</Label>
              <Input type="number" value={form.safetyStock || ''} onChange={(e) => setForm({ ...form, safetyStock: Number(e.target.value) })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Avg Daily Demand</Label>
              <Input type="number" value={form.averageDailyDemand || ''} onChange={(e) => setForm({ ...form, averageDailyDemand: Number(e.target.value) })} placeholder="0" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Product</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Product Modal ───────────────────────────────────────────────────
function EditProductModal({
  product, open, onClose, onUpdate, categories, suppliers,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Product>) => void;
  categories: Category[];
  suppliers: Supplier[];
}) {
  const [form, setForm] = useState({
    name: product.name, sku: product.sku, categoryId: product.categoryId,
    supplierId: product.supplierId, price: product.price, costPrice: product.costPrice,
    reorderPoint: product.reorderPoint, targetStockLevel: product.targetStockLevel,
    safetyStock: product.safetyStock, averageDailyDemand: product.averageDailyDemand,
  unit: product.unit,
  });

  const handleSubmit = () => {
    onUpdate(product.id, form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update product details for {product.name}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Product Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Supplier</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Selling Price (₹)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cost Price (₹)</Label>
              <Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Reorder Point</Label>
              <Input type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Level</Label>
              <Input type="number" value={form.targetStockLevel} onChange={(e) => setForm({ ...form, targetStockLevel: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Safety Stock</Label>
              <Input type="number" value={form.safetyStock} onChange={(e) => setForm({ ...form, safetyStock: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Avg Daily Demand</Label>
            <Input type="number" value={form.averageDailyDemand} onChange={(e) => setForm({ ...form, averageDailyDemand: Number(e.target.value) })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Adjust Stock Modal ──────────────────────────────────────────────────
function AdjustStockModal({
  product, open, onClose, onAdjust,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
  onAdjust: (id: string, adjustment: number, reason: string) => void;
}) {
  const [adjustment, setAdjustment] = useState(0);
  const [reason, setReason] = useState('Manual adjustment');

  const handleSubmit = () => {
    if (adjustment === 0) {
      toast.error('Adjustment cannot be zero');
      return;
    }
    onAdjust(product.id, adjustment, reason);
    setAdjustment(0);
    setReason('Manual adjustment');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock — {product.name}</DialogTitle>
          <DialogDescription>Current stock: {formatNumber(product.currentStock)} {product.unit}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setAdjustment((a) => a - 1)}>
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={adjustment}
              onChange={(e) => setAdjustment(Number(e.target.value))}
              className="text-center text-lg font-semibold"
            />
            <Button variant="outline" size="icon" onClick={() => setAdjustment((a) => a + 1)}>
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">New stock level</p>
            <p className="text-xl font-bold">{Math.max(0, product.currentStock + adjustment)} {product.unit}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Manual adjustment">Manual adjustment</SelectItem>
                <SelectItem value="Stock received">Stock received</SelectItem>
                <SelectItem value="Damaged/lost">Damaged/lost</SelectItem>
                <SelectItem value="Inventory count correction">Inventory count correction</SelectItem>
                <SelectItem value="Return to supplier">Return to supplier</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Confirm Adjustment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product Detail Drawer ───────────────────────────────────────────────
function ProductDetailDrawer({
  product, open, onClose, currency,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  currency: string;
}) {
  if (!product) return null;

  const sales = getSalesForProduct(product.id, 30);
  const forecast = generateForecastData(product.id, 7);
  const chartData = [
    ...sales.map((s) => ({ date: formatShortDate(s.date), actual: s.quantity, forecast: null as number | null })),
    ...(forecast?.points.filter((p) => p.actual === null).map((p) => ({
      date: formatShortDate(p.date),
      actual: null as number | null,
      forecast: p.predicted,
    })) || []),
  ];
  const boundaryIdx = chartData.findIndex((d) => d.actual === null);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle className="text-lg">{product.name}</SheetTitle>
          <SheetDescription>{product.sku} · {categoryNameById(product.categoryId)}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          {/* Status & key info */}
          <div className="flex items-center gap-2">
            <StockStatusBadge status={product.status} />
            <Badge variant="outline" className="text-xs">{supplierNameById(product.supplierId)}</Badge>
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Current Stock</p>
              <p className="text-lg font-bold">{formatNumber(product.currentStock)} {product.unit}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Avg Daily Demand</p>
              <p className="text-lg font-bold">{product.averageDailyDemand} units</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Reorder Point</p>
              <p className="text-lg font-bold">{product.reorderPoint} units</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Safety Stock</p>
              <p className="text-lg font-bold">{product.safetyStock} units</p>
            </div>
          </div>

          {/* Sales & Forecast Chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Sales & Forecast</p>
              <Badge variant="outline" className="text-xs">Last 30d + 7d forecast</Badge>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="drawerActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(158, 64%, 38%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(158, 64%, 38%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '0.5rem' }} />
                <Area type="monotone" dataKey="actual" name="Actual" stroke="hsl(158, 64%, 38%)" strokeWidth={2} fill="url(#drawerActual)" />
                <Area type="monotone" dataKey="forecast" name="Forecast" stroke="hsl(38, 92%, 55%)" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                {boundaryIdx >= 0 && <ReferenceLine x={chartData[boundaryIdx - 1]?.date} stroke="hsl(var(--border))" strokeDasharray="3 3" />}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Selling Price</p>
              <p className="text-base font-bold">{formatCurrency(product.price, currency)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Cost Price</p>
              <p className="text-base font-bold">{formatCurrency(product.costPrice, currency)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Inventory Value</p>
              <p className="text-base font-bold">{formatCurrency(product.currentStock * product.costPrice, currency)}</p>
            </div>
          </div>

          {/* Reorder settings */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold mb-3">Reorder Settings</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Target Stock Level</span><span className="font-medium">{product.targetStockLevel} units</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Safety Stock</span><span className="font-medium">{product.safetyStock} units</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Reorder Point</span><span className="font-medium">{product.reorderPoint} units</span></div>
            </div>
          </div>

          {/* Supplier info */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold mb-3">Supplier Information</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span className="font-medium">{supplierNameById(product.supplierId)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Lead Time</span><span className="font-medium">— days</span></div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
