import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Edit, X, Loader2, Image as ImageIcon,
  Package, Camera, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { compressImage } from '../lib/image-utils';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProductPhoto {
  id: string;
  url: string;
  mimeType: string;
}

interface CatalogueProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  photos: string[]; // photo IDs
  companyId: string;
  createdAt: any;
  updatedAt: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const API_BASE = '/api/customer';

type AuthFetchFn = (url: string, options?: RequestInit) => Promise<Response>;

async function apiFetch(
  path: string,
  options: RequestInit = {},
  authFetch?: AuthFetchFn
) {
  let res: Response;
  const url = `${API_BASE}${path}`;

  if (authFetch && options.method && options.method !== 'GET') {
    // Use authFetch for authenticated write operations
    res = await authFetch(url, options);
  } else if (authFetch && options.method === 'DELETE') {
    res = await authFetch(url, options);
  } else {
    // Public reads or fallback
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (!(options.body instanceof FormData) && options.body) {
      headers['Content-Type'] = 'application/json';
    }
    res = await fetch(url, { ...options, headers });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// PhotoGrid – displays photos for a product with delete capability
// ---------------------------------------------------------------------------
const PhotoGrid: React.FC<{
  productId: string;
  photoIds: string[];
  onDeleted: (photoId: string) => void;
  authFetch?: AuthFetchFn;
  isOwner: boolean;
}> = ({ productId, photoIds, onDeleted, authFetch, isOwner }) => {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (photoId: string) => {
    if (!window.confirm('Delete this photo?')) return;
    setDeleting(photoId);
    try {
      await apiFetch(`/products/${productId}/photo/${photoId}`, { method: 'DELETE' }, authFetch);
      onDeleted(photoId);
      toast.success('Photo deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete photo');
    } finally {
      setDeleting(null);
    }
  };

  if (photoIds.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 bg-stone-50 rounded-xl border border-dashed border-black/10">
        <div className="text-center">
          <ImageIcon size={20} className="mx-auto text-black/20 mb-1" />
          <p className="text-[10px] text-black/30 uppercase tracking-widest font-bold">No photos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photoIds.map((photoId) => (
        <div key={photoId} className="relative group aspect-square rounded-xl overflow-hidden bg-stone-100">
          <img
            src={`${API_BASE}/products/${productId}/photo/${photoId}`}
            alt="Product photo"
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400';
            }}
          />
          {isOwner && (
            <button
              onClick={() => handleDelete(photoId)}
              disabled={deleting === photoId}
              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
            >
              {deleting === photoId ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <X size={10} />
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// PhotoUploader – upload a new photo for a product
// ---------------------------------------------------------------------------
const PhotoUploader: React.FC<{
  productId: string;
  authFetch?: AuthFetchFn;
  onUploaded: (photoId: string, url: string) => void;
}> = ({ productId, authFetch, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress('Compressing…');
    try {
      const compressed = await compressImage(file);
      setProgress('Uploading…');

      const formData = new FormData();
      formData.append('photo', compressed, file.name);

      let res: Response;
      if (authFetch) {
        res = await authFetch(`${API_BASE}/products/${productId}/photo`, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(`${API_BASE}/products/${productId}/photo`, {
          method: 'POST',
          body: formData,
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      onUploaded(data.id, data.url);
      toast.success('Photo uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      setProgress('');
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
      >
        {uploading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>{progress}</span>
          </>
        ) : (
          <>
            <Camera size={14} />
            <span>Add Photo</span>
          </>
        )}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ProductForm – create / edit a product
// ---------------------------------------------------------------------------
interface ProductFormProps {
  initial?: Partial<CatalogueProduct>;
  onSave: (data: Partial<CatalogueProduct>) => Promise<void>;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    category: initial?.category || 'General',
    price: initial?.price ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, price: parseFloat(String(form.price)) || 0 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Product Name</label>
        <input
          required
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors text-sm"
          placeholder="e.g. Solar Water Pump"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors text-sm appearance-none"
          >
            <option value="General">General</option>
            <option value="Solar">Solar</option>
            <option value="Water Treatment">Water Treatment</option>
            <option value="Sanitation">Sanitation</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Price (KSh)</label>
          <input
            type="number"
            min="0"
            value={form.price || ''}
            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors text-sm"
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors text-sm resize-none"
          placeholder="Describe the product…"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          <span>{initial?.id ? 'Save Changes' : 'Create Product'}</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-stone-100 text-black/60 font-bold rounded-xl hover:bg-stone-200 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// ProductCard
// ---------------------------------------------------------------------------
const ProductCard: React.FC<{
  product: CatalogueProduct;
  authFetch?: AuthFetchFn;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPhotosChanged: (productId: string, newPhotoIds: string[]) => void;
}> = ({ product, authFetch, isOwner, onEdit, onDelete, onPhotosChanged }) => {
  const [photoIds, setPhotoIds] = useState<string[]>(product.photos || []);

  const handlePhotoUploaded = (photoId: string) => {
    const updated = [...photoIds, photoId];
    setPhotoIds(updated);
    onPhotosChanged(product.id, updated);
  };

  const handlePhotoDeleted = (photoId: string) => {
    const updated = photoIds.filter((id) => id !== photoId);
    setPhotoIds(updated);
    onPhotosChanged(product.id, updated);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
    >
      {/* Photo section */}
      <div className="p-4 bg-stone-50 border-b border-black/5">
        <PhotoGrid
          productId={product.id}
          photoIds={photoIds}
          onDeleted={handlePhotoDeleted}
          authFetch={authFetch}
          isOwner={isOwner}
        />
        {isOwner && (
          <div className="mt-3">
            <PhotoUploader
              productId={product.id}
              authFetch={authFetch}
              onUploaded={handlePhotoUploaded}
            />
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base tracking-tight truncate">{product.name}</h3>
            <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-widest">
              {product.category}
            </span>
          </div>
          <span className="text-lg font-bold tracking-tighter whitespace-nowrap">
            KSh {(product.price || 0).toLocaleString()}
          </span>
        </div>

        {product.description && (
          <p className="text-sm text-black/50 leading-relaxed line-clamp-2 mb-4">
            {product.description}
          </p>
        )}

        {isOwner && (
          <div className="flex gap-2 pt-3 border-t border-black/5">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-black/60 text-xs font-bold rounded-xl hover:bg-stone-200 transition-all"
            >
              <Edit size={12} />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-all"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// ProductCatalogue page
// ---------------------------------------------------------------------------
const ProductCatalogue: React.FC = () => {
  const { user, authFetch } = useAuth() as any;
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogueProduct | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const companyId = user?.uid;
      const res = await fetch(
        `${API_BASE}/products${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Failed to load products');
      }
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreate = async (data: Partial<CatalogueProduct>) => {
    await apiFetch('/products', { method: 'POST', body: JSON.stringify(data) }, authFetch);
    toast.success('Product created');
    setShowForm(false);
    fetchProducts();
  };

  const handleUpdate = async (data: Partial<CatalogueProduct>) => {
    if (!editingProduct) return;
    await apiFetch(
      `/products/${editingProduct.id}`,
      { method: 'PUT', body: JSON.stringify(data) },
      authFetch
    );
    toast.success('Product updated');
    setEditingProduct(null);
    fetchProducts();
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Delete this product and all its photos?')) return;
    try {
      await apiFetch(`/products/${productId}`, { method: 'DELETE' }, authFetch);
      toast.success('Product deleted');
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  const handlePhotosChanged = (productId: string, newPhotoIds: string[]) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, photos: newPhotoIds } : p))
    );
  };

  if (!user) {
    return (
      <div className="pt-28 pb-20 px-4 max-w-2xl mx-auto text-center">
        <AlertCircle size={48} className="mx-auto text-black/20 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Sign in required</h2>
        <p className="text-black/50">Please sign in to manage your product catalogue.</p>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter mb-1">Product Catalogue</h1>
          <p className="text-black/50 text-sm">Manage your products and upload photos.</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus size={18} />
          <span>New Product</span>
        </button>
      </div>

      {/* Create / Edit form modal */}
      <AnimatePresence>
        {(showForm || editingProduct) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowForm(false);
                setEditingProduct(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingProduct ? 'Edit Product' : 'New Product'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                  }}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <ProductForm
                initial={editingProduct || undefined}
                onSave={editingProduct ? handleUpdate : handleCreate}
                onCancel={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <p className="text-sm text-black/40 uppercase tracking-widest font-bold">Loading catalogue…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchProducts}
            className="px-6 py-2 bg-stone-100 rounded-xl text-sm font-bold hover:bg-stone-200 transition-all"
          >
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 border-2 border-dashed border-black/10 rounded-3xl">
          <Package size={48} className="text-black/20" />
          <div className="text-center">
            <p className="font-bold text-lg mb-1">No products yet</p>
            <p className="text-sm text-black/40">Create your first product to get started.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all"
          >
            <Plus size={16} />
            <span>Create Product</span>
          </button>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                authFetch={authFetch}
                isOwner={product.companyId === user?.uid || user?.email === 'michael.kokonya@washpivot.com'}
                onEdit={() => setEditingProduct(product)}
                onDelete={() => handleDelete(product.id)}
                onPhotosChanged={handlePhotosChanged}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default ProductCatalogue;
