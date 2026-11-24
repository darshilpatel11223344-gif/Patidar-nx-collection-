import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Check,
  ExternalLink,
  FolderKanban,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { navigateTo } from '../lib/navigation.ts';
import { formatInrPrice } from '../lib/whatsapp.ts';
import { ResilientImage } from '../components/ResilientImage.tsx';
import type {
  AdminStats,
  AdminUserRecord,
  Category,
  HomepageSettings,
  MediaAsset,
  PaginatedProductsResponse,
  Product,
} from '../types/catalog.ts';

interface AdminDashboardProps {
  onStorefrontDataChanged: () => Promise<void>;
}

type AdminTab = 'overview' | 'products' | 'categories' | 'media' | 'homepage';

export function AdminDashboard({ onStorefrontDataChanged }: AdminDashboardProps) {
  const [authReady, setAuthReady] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [hasOwner, setHasOwner] = useState(true);
  const [passcodeConfigured, setPasscodeConfigured] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'setup'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUserRecord | null>(null);
  const [adminTeam, setAdminTeam] = useState<AdminUserRecord[]>([]);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [stats, setStats] = useState<AdminStats>({
    totalProducts: 0,
    totalCategories: 0,
    totalImages: 0,
    newArrivals: 0,
    featuredProducts: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsData, setProductsData] = useState<PaginatedProductsResponse>({
    items: [],
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
    facets: { colours: [] },
  });
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('all');
  const [productPage, setProductPage] = useState(1);

  const [mediaData, setMediaData] = useState<{
    items: MediaAsset[];
    total: number;
    page: number;
    totalPages: number;
  }>({ items: [], total: 0, page: 1, totalPages: 1 });
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaCatFilter, setMediaCatFilter] = useState<string>('all');
  const [mediaPage, setMediaPage] = useState(1);

  const [settingsForm, setSettingsForm] = useState<HomepageSettings | null>(null);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  // Product Editor Modal State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productImageIds, setProductImageIds] = useState<number[]>([]);
  const [productImagePreviews, setProductImagePreviews] = useState<MediaAsset[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<number | null>(
    null
  );

  // Category Editor Modal State
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<number | null>(
    null
  );

  // Bulk Media Upload Previews State
  const [queuedFiles, setQueuedFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [uploadCategoryId, setUploadCategoryId] = useState<string>('');
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const [confirmDeleteMediaId, setConfirmDeleteMediaId] = useState<number | null>(null);

  // Media Picker Modal (for Product / Category / Homepage Banner)
  const [pickerTarget, setPickerTarget] = useState<
    | null
    | { type: 'product' }
    | { type: 'category' }
    | { type: 'heroBanner' }
    | { type: 'secondaryBanner' }
    | { type: 'aboutImage' }
  >(null);

  const notify = useCallback((type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((current) => (current?.text === text ? null : current));
    }, 4500);
  }, []);

  const authedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!authToken) {
        throw new Error('Authentication session missing');
      }
      const headers = new Headers(options.headers || {});
      headers.set('Authorization', `Bearer ${authToken}`);
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        setAuthToken(null);
        setAdminProfile(null);
        setAuthError('Your admin session expired. Please sign in again.');
      }
      return res;
    },
    [authToken]
  );

  // Check whether first-run owner claim is needed on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/auth/status');
        if (res.ok && active) {
          const data = await res.json();
          setHasOwner(Boolean(data.hasOwner));
          setPasscodeConfigured(Boolean(data.passcodeConfigured));
          if (!data.hasOwner && !data.passcodeConfigured) {
            setAuthMode('setup');
          }
        }
      } catch (err) {
        console.error('Auth status error:', err);
      } finally {
        if (active) setAuthReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const refreshCoreAdminData = useCallback(async () => {
    if (!adminProfile) return;
    try {
      const [statsRes, catsRes, settingsRes] = await Promise.all([
        authedFetch('/api/admin/stats'),
        fetch('/api/categories'),
        fetch('/api/settings'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());
      if (settingsRes.ok) setSettingsForm(await settingsRes.json());
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    }
  }, [adminProfile, authedFetch]);

  const loadProducts = useCallback(async () => {
    if (!adminProfile) return;
    const params = new URLSearchParams({
      page: String(productPage),
      limit: '12',
      sort: 'newest',
    });
    if (productSearch.trim()) params.set('q', productSearch.trim());
    if (productCatFilter !== 'all') params.set('category', productCatFilter);
    const res = await fetch(`/api/products?${params.toString()}`);
    if (res.ok) setProductsData(await res.json());
  }, [adminProfile, productPage, productSearch, productCatFilter]);

  const loadMedia = useCallback(async () => {
    if (!adminProfile) return;
    const params = new URLSearchParams({
      page: String(mediaPage),
      limit: '24',
    });
    if (mediaSearch.trim()) params.set('q', mediaSearch.trim());
    if (mediaCatFilter !== 'all') params.set('categoryId', mediaCatFilter);
    const res = await authedFetch(`/api/admin/media?${params.toString()}`);
    if (res.ok) setMediaData(await res.json());
  }, [adminProfile, mediaPage, mediaSearch, mediaCatFilter, authedFetch]);

  useEffect(() => {
    refreshCoreAdminData();
  }, [refreshCoreAdminData]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const hydrateAdminTeam = useCallback(async (token: string) => {
    const meRes = await fetch('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (meRes.ok) {
      const mePayload = await meRes.json();
      setAdminTeam(mePayload.admins || []);
    }
  }, []);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authMode === 'setup') {
      if (loginPassword.length < 8) {
        setAuthError('Password must be at least 8 characters long.');
        return;
      }
      if (loginPassword !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
      setSubmittingAuth(true);
      try {
        const res = await fetch('/api/admin/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail.trim(),
            displayName: loginName.trim() || 'Showroom Owner',
            password: loginPassword,
          }),
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error || 'Unable to create owner account.');
        }
        setAuthToken(payload.token);
        setAdminProfile(payload.currentUser);
        setHasOwner(true);
        setLoginPassword('');
        setConfirmPassword('');
        await hydrateAdminTeam(payload.token);
      } catch (err: unknown) {
        setAuthError(err instanceof Error ? err.message : 'Setup failed');
      } finally {
        setSubmittingAuth(false);
      }
      return;
    }

    setSubmittingAuth(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Sign-in failed.');
      }
      setAuthToken(payload.token);
      setAdminProfile(payload.currentUser);
      setLoginPassword('');
      await hydrateAdminTeam(payload.token);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleSignOut = () => {
    setAuthToken(null);
    setAdminProfile(null);
    setAdminTeam([]);
    setAuthError(null);
  };

  // ==================== PRODUCT ACTIONS ====================

  const openNewProductModal = async () => {
    let nextCode = `PNX-${Date.now().toString().slice(-4)}`;
    try {
      const res = await authedFetch('/api/admin/products/next-code');
      if (res.ok) {
        const d = await res.json();
        nextCode = d.productCode || nextCode;
      }
    } catch {
      // Fallback code already generated
    }

    setEditingProduct({
      name: '',
      productCode: nextCode,
      categoryId: categories[0]?.id || 1,
      description: '',
      price: null,
      colour: '',
      fabric: '',
      workDetails: '',
      size: 'Free Size (5.5m Saree + 0.85m Blouse)',
      availability: 'In Stock',
      isFeatured: false,
      isNewArrival: true,
      isBestSeller: false,
      isTrending: false,
    });
    setProductImageIds([]);
    setProductImagePreviews([]);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct({ ...prod });
    setProductImageIds(prod.images.map((img) => img.mediaAssetId));
    setProductImagePreviews(
      prod.images.map((img) => ({
        id: img.mediaAssetId,
        categoryId: prod.categoryId,
        originalName: prod.name,
        altText: img.altText,
        thumbUrl: img.thumbUrl,
        mediumUrl: img.mediumUrl,
        largeUrl: img.largeUrl,
        width: 900,
        height: 1200,
        sizeBytes: 0,
        createdAt: prod.createdAt,
      }))
    );
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingProduct(true);
    try {
      const isEdit = Boolean(editingProduct.id);
      const url = isEdit
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await authedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingProduct,
          imageIds: productImageIds,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Could not save product');
      }

      notify('ok', isEdit ? 'Product updated successfully.' : 'New product published.');
      setEditingProduct(null);
      await Promise.all([loadProducts(), refreshCoreAdminData(), onStorefrontDataChanged()]);
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      const res = await authedFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setConfirmDeleteProductId(null);
      notify('ok', 'Product deleted from catalog.');
      await Promise.all([loadProducts(), refreshCoreAdminData(), onStorefrontDataChanged()]);
    } catch {
      notify('err', 'Unable to delete product.');
    }
  };

  const handleDirectUploadForProduct = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    if (editingProduct?.categoryId) {
      formData.append('categoryId', String(editingProduct.categoryId));
    }

    try {
      const res = await authedFetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Upload failed');

      const uploaded: MediaAsset[] = payload.items || [];
      setProductImageIds((prev) => [...prev, ...uploaded.map((u) => u.id)]);
      setProductImagePreviews((prev) => [...prev, ...uploaded]);
      notify('ok', `${uploaded.length} WebP image(s) optimized and attached.`);
      await Promise.all([loadMedia(), refreshCoreAdminData()]);
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Image upload failed');
    }
    e.target.value = '';
  };

  // ==================== CATEGORY ACTIONS ====================

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setSavingCategory(true);
    try {
      const isEdit = Boolean(editingCategory.id);
      const url = isEdit
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const res = await authedFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCategory),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Category save failed');

      notify('ok', isEdit ? 'Category updated.' : 'Category created.');
      setEditingCategory(null);
      await Promise.all([refreshCoreAdminData(), onStorefrontDataChanged()]);
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Unable to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const res = await authedFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Cannot delete category');
      setConfirmDeleteCategoryId(null);
      notify('ok', 'Category deleted.');
      await Promise.all([refreshCoreAdminData(), onStorefrontDataChanged()]);
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // ==================== MEDIA BULK ACTIONS ====================

  const handleQueueFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const mapped = selected.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setQueuedFiles((prev) => [...prev, ...mapped]);
    e.target.value = '';
  };

  const handleRemoveQueuedFile = (index: number) => {
    setQueuedFiles((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePublishQueuedBatch = async () => {
    if (queuedFiles.length === 0) return;
    setUploadingBatch(true);
    try {
      const formData = new FormData();
      queuedFiles.forEach((item) => formData.append('files', item.file));
      if (uploadCategoryId) formData.append('categoryId', uploadCategoryId);

      const res = await authedFetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Batch upload failed');

      queuedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setQueuedFiles([]);
      notify(
        'ok',
        `${payload.items?.length || 0} photo(s) compressed to WebP (400w / 900w / 1600w).`
      );
      await Promise.all([loadMedia(), refreshCoreAdminData()]);
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Batch upload failed');
    } finally {
      setUploadingBatch(false);
    }
  };

  const handleReplaceImageFile = async (
    mediaId: number,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await authedFetch(`/api/admin/media/${mediaId}/replace`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Replacement failed');
      notify('ok', 'Photograph replaced across linked products.');
      await Promise.all([loadMedia(), loadProducts(), onStorefrontDataChanged()]);
    } catch {
      notify('err', 'Unable to replace image file.');
    }
    e.target.value = '';
  };

  const handleDeleteMedia = async (mediaId: number) => {
    try {
      const res = await authedFetch(`/api/admin/media/${mediaId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setConfirmDeleteMediaId(null);
      notify('ok', 'Image deleted from storage.');
      await Promise.all([loadMedia(), loadProducts(), refreshCoreAdminData()]);
    } catch {
      notify('err', 'Unable to delete image.');
    }
  };

  // ==================== HOMEPAGE SETTINGS & ADMIN STAFF ====================

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    try {
      const res = await authedFetch('/api/admin/settings/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      if (!res.ok) throw new Error('Failed to save homepage settings');
      notify('ok', 'Homepage & brand content published.');
      await onStorefrontDataChanged();
    } catch {
      notify('err', 'Could not save homepage settings.');
    }
  };

  const handleAddStaffAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail.trim() || newStaffPassword.length < 8) {
      notify('err', 'Enter a valid email and an initial password (min 8 characters).');
      return;
    }
    try {
      const res = await authedFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newStaffEmail.trim(),
          displayName: newStaffName.trim(),
          password: newStaffPassword,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not create admin account');
      setAdminTeam((prev) => [...prev, payload]);
      setNewStaffEmail('');
      setNewStaffName('');
      setNewStaffPassword('');
      notify('ok', `Created admin access for ${payload.email}.`);
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Unable to add admin');
    }
  };

  const handleRemoveStaffAdmin = async (id: number) => {
    try {
      const res = await authedFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not remove admin');
      setAdminTeam((prev) => prev.filter((a) => a.id !== id));
      notify('ok', 'Staff admin access revoked.');
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Unable to remove admin.');
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      notify('err', 'New password must be at least 8 characters.');
      return;
    }
    try {
      const res = await authedFetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Password update failed');
      setCurrentPw('');
      setNewPw('');
      notify('ok', 'Your showroom admin password has been updated.');
    } catch (err: unknown) {
      notify('err', err instanceof Error ? err.message : 'Unable to update password.');
    }
  };

  // ==================== RENDER GATES ====================

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center text-sm text-[#D6C9B6]">
        Verifying showroom session...
      </div>
    );
  }

  if (!authToken || !adminProfile) {
    const showSetup = authMode === 'setup' && !hasOwner && !passcodeConfigured;
    return (
      <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-[#151518] border border-[#262522] p-8 sm:p-10 space-y-6">
          <div className="space-y-2 text-center">
            <div className="w-11 h-11 mx-auto border border-[#C8A46B]/50 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5 text-[#C8A46B]" aria-hidden="true" />
            </div>
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
              PATIDAR NX COLLECTION
            </p>
            <h1 className="font-display text-3xl text-[#FAF7F0]">
              {showSetup ? 'Claim Showroom Admin' : 'Showroom Admin Portal'}
            </h1>
            <p className="text-sm text-[#BEB3A2] leading-relaxed">
              {showSetup
                ? 'Set your primary showroom owner email and password to secure the admin dashboard.'
                : 'Sign in with your showroom administrator credentials to manage sarees, media, and banners.'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-[#241616] border border-red-800/60 text-xs text-red-200 leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {showSetup && (
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider text-[#9C9488]">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="Showroom Owner"
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3.5 py-2.5 text-sm text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider text-[#9C9488]">
                Admin Email
              </label>
              <input
                type="email"
                required={!passcodeConfigured}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="owner@patidarnx.com"
                className="w-full bg-[#0E0E10] border border-[#2A2927] px-3.5 py-2.5 text-sm text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider text-[#9C9488]">
                {passcodeConfigured && !hasOwner ? 'Password or Showroom Passcode' : 'Password'}
              </label>
              <input
                type="password"
                required
                minLength={showSetup ? 8 : 1}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder={showSetup ? 'Minimum 8 characters' : 'Enter password'}
                className="w-full bg-[#0E0E10] border border-[#2A2927] px-3.5 py-2.5 text-sm text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
              />
            </div>

            {showSetup && (
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider text-[#9C9488]">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3.5 py-2.5 text-sm text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submittingAuth}
              className="w-full py-3.5 px-5 bg-[#C8A46B] hover:bg-[#DFC391] disabled:opacity-60 text-[#0E0E10] text-xs font-semibold tracking-[0.16em] uppercase transition-colors cursor-pointer"
            >
              {submittingAuth
                ? 'Verifying...'
                : showSetup
                  ? 'Create Owner Account'
                  : 'Sign In to Showroom'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#262522] text-center">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="text-xs text-[#9C9488] hover:text-[#DFC391] transition-colors cursor-pointer"
            >
              Return to Public Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] text-[#FAF7F0] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-[#121214] border-b lg:border-b-0 lg:border-r border-[#262522] shrink-0 flex flex-col justify-between">
        <div className="p-5 space-y-6">
          <div className="space-y-1 pb-4 border-b border-[#242320]">
            <p className="font-display text-lg tracking-[0.14em] text-[#FAF7F0] uppercase">
              PATIDAR NX
            </p>
            <p className="text-xs text-[#C8A46B]">Showroom Management</p>
          </div>

          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'categories', label: 'Categories', icon: FolderKanban },
              { id: 'media', label: 'Media Library', icon: ImageIcon },
              { id: 'homepage', label: 'Homepage & Content', icon: LayoutTemplate },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as AdminTab)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#C8A46B] text-[#0E0E10] font-semibold'
                      : 'text-[#D6C9B6] hover:bg-[#1A1A1E] hover:text-[#FAF7F0]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-5 border-t border-[#242320] space-y-3 hidden lg:block">
          <div className="text-xs">
            <p className="text-[#FAF7F0] font-medium truncate">
              {adminProfile.displayName || adminProfile.email}
            </p>
            <p className="text-[#9C9488] truncate">{adminProfile.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-[#2A2927] text-xs text-[#D6C9B6] hover:border-[#C8A46B] cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="p-2 border border-[#2A2927] text-[#D6C9B6] hover:border-red-500/60 hover:text-red-300 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10 space-y-8">
        {/* Top Context Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#262522]">
          <div>
            <p className="text-xs text-[#9C9488] uppercase tracking-widest">
              Showroom Admin / {activeTab}
            </p>
            <h1 className="font-display text-3xl text-[#FAF7F0] capitalize mt-1">
              {activeTab === 'homepage' ? 'Homepage & Brand Content' : activeTab}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 border border-[#2A2927] text-xs text-[#D6C9B6]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </button>
            <button
              type="button"
              onClick={openNewProductModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C8A46B] hover:bg-[#DFC391] text-[#0E0E10] text-xs font-semibold tracking-wider uppercase cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Inline Toast Banner */}
        {toast && (
          <div
            className={`px-4 py-3 border text-xs flex items-center justify-between ${
              toast.type === 'ok'
                ? 'bg-[#12221B] border-[#2CA36B]/50 text-[#C6F6D5]'
                : 'bg-[#261414] border-red-700/60 text-red-200'
            }`}
          >
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="cursor-pointer ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ==================== OVERVIEW TAB ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Products', value: stats.totalProducts },
                { label: 'Total Categories', value: stats.totalCategories },
                { label: 'Uploaded Images', value: stats.totalImages },
                { label: 'New Arrivals', value: stats.newArrivals },
                { label: 'Featured Products', value: stats.featuredProducts },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[#151518] border border-[#262522] p-5 space-y-2"
                >
                  <p className="text-xs text-[#9C9488] uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="font-mono text-3xl font-medium text-[#DFC391] tabular-nums">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Workflows */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#151518] border border-[#262522] p-6 space-y-3">
                <h2 className="font-display text-2xl text-[#FAF7F0]">
                  Bulk Upload Saree Photos
                </h2>
                <p className="text-xs text-[#BEB3A2] leading-relaxed">
                  Upload up to 30 showroom photographs at once. Every photo is automatically
                  compressed into 400w, 900w, and 1600w WebP formats.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('media')}
                  className="px-4 py-2 border border-[#C8A46B]/60 text-xs text-[#DFC391] hover:bg-[#C8A46B] hover:text-[#0E0E10] uppercase tracking-wider cursor-pointer"
                >
                  Open Media Library
                </button>
              </div>

              <div className="bg-[#151518] border border-[#262522] p-6 space-y-3">
                <h2 className="font-display text-2xl text-[#FAF7F0]">
                  Manage Catalog &amp; Pricing
                </h2>
                <p className="text-xs text-[#BEB3A2] leading-relaxed">
                  Add new sarees, generate unique Product IDs, toggle Featured or New
                  Arrivals, and set optional showroom prices.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="px-4 py-2 border border-[#C8A46B]/60 text-xs text-[#DFC391] hover:bg-[#C8A46B] hover:text-[#0E0E10] uppercase tracking-wider cursor-pointer"
                >
                  Manage Products
                </button>
              </div>

              <div className="bg-[#151518] border border-[#262522] p-6 space-y-3">
                <h2 className="font-display text-2xl text-[#FAF7F0]">
                  Edit Homepage Banners
                </h2>
                <p className="text-xs text-[#BEB3A2] leading-relaxed">
                  Swap full-width hero photography, update showroom hours, Instagram handle,
                  testimonials, and policy text anytime.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('homepage')}
                  className="px-4 py-2 border border-[#C8A46B]/60 text-xs text-[#DFC391] hover:bg-[#C8A46B] hover:text-[#0E0E10] uppercase tracking-wider cursor-pointer"
                >
                  Customize Homepage
                </button>
              </div>
            </div>

            {/* Staff Admin Access Control & Password Update */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#151518] border border-[#262522] p-6 space-y-5">
                <div>
                  <h2 className="font-display text-2xl text-[#FAF7F0]">
                    Authorized Showroom Admins
                  </h2>
                  <p className="text-xs text-[#BEB3A2] mt-1">
                    Showroom accounts are stored directly in your PostgreSQL database—no third-party auth service needed.
                  </p>
                </div>

                {adminProfile.role === 'owner' && (
                  <form onSubmit={handleAddStaffAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="email"
                      required
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      placeholder="Staff email"
                      className="bg-[#0E0E10] border border-[#2A2927] px-3.5 py-2 text-sm text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
                    />
                    <input
                      type="text"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="Staff name (optional)"
                      className="bg-[#0E0E10] border border-[#2A2927] px-3.5 py-2 text-sm text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
                    />
                    <div className="flex gap-2">
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newStaffPassword}
                        onChange={(e) => setNewStaffPassword(e.target.value)}
                        placeholder="Password (8+ chars)"
                        className="flex-1 min-w-0 bg-[#0E0E10] border border-[#2A2927] px-3.5 py-2 text-sm text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#C8A46B] text-[#0E0E10] text-xs font-semibold uppercase tracking-wider cursor-pointer whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-[#242320] border border-[#242320]">
                  {adminTeam.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="text-[#FAF7F0]">
                          {member.displayName ? `${member.displayName} — ` : ''}
                          {member.email}
                        </p>
                        <p className="text-xs text-[#9C9488] capitalize">{member.role}</p>
                      </div>
                      {adminProfile.role === 'owner' && member.id !== adminProfile.id && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStaffAdmin(member.id)}
                          className="text-xs text-red-400 hover:underline cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#151518] border border-[#262522] p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#C8A46B]">
                  <KeyRound className="w-4 h-4" />
                  <h2 className="font-display text-2xl text-[#FAF7F0]">
                    Update Password
                  </h2>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Current password"
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3.5 py-2 text-sm text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="New password (8+ chars)"
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3.5 py-2 text-sm text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 border border-[#C8A46B]/60 text-xs text-[#DFC391] hover:bg-[#C8A46B] hover:text-[#0E0E10] uppercase tracking-wider cursor-pointer"
                  >
                    Save New Password
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ==================== PRODUCTS TAB ==================== */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 bg-[#151518] border border-[#2A2927] px-3.5 py-2">
                <Search className="w-4 h-4 text-[#C8A46B]" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductPage(1);
                  }}
                  placeholder="Search products by name, Product ID, or fabric..."
                  className="w-full bg-transparent text-sm text-[#FAF7F0] focus:outline-none"
                />
              </div>

              <select
                value={productCatFilter}
                onChange={(e) => {
                  setProductCatFilter(e.target.value);
                  setProductPage(1);
                }}
                className="bg-[#151518] border border-[#2A2927] px-3.5 py-2 text-sm text-[#FAF7F0] focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#151518] border border-[#262522] overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#262522] text-xs uppercase tracking-wider text-[#9C9488]">
                    <th className="py-3.5 px-4">Item</th>
                    <th className="py-3.5 px-4">Product ID</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Highlights</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22211E]">
                  {productsData.items.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#1B1B1F]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="w-10 h-12 bg-[#0E0E10] border border-[#2A2927] overflow-hidden shrink-0">
                            <ResilientImage
                              src={prod.images[0]?.thumbUrl}
                              thumbUrl={prod.images[0]?.thumbUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-[#FAF7F0] line-clamp-1">
                              {prod.name}
                            </p>
                            <p className="text-xs text-[#9C9488]">
                              {prod.images.length} photo(s)
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#DFC391] tabular-nums whitespace-nowrap">
                        {prod.productCode}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#D6C9B6] whitespace-nowrap">
                        {prod.categoryName}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums whitespace-nowrap">
                        {formatInrPrice(prod.price) || (
                          <span className="text-[#8E877D]">Hidden</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        {prod.availability}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#BEB3A2] whitespace-nowrap">
                        {[
                          prod.isFeatured && 'Featured',
                          prod.isNewArrival && 'New',
                          prod.isBestSeller && 'Best',
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Standard'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditProductModal(prod)}
                            className="px-3 py-1.5 border border-[#2A2927] hover:border-[#C8A46B] text-xs cursor-pointer"
                          >
                            Edit
                          </button>
                          {confirmDeleteProductId === prod.id ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="px-3 py-1.5 bg-red-700 text-white text-xs cursor-pointer"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteProductId(prod.id)}
                              className="p-1.5 text-[#9C9488] hover:text-red-400 cursor-pointer"
                              aria-label="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {productsData.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={productPage <= 1}
                  onClick={() => setProductPage((p) => p - 1)}
                  className="px-4 py-2 border border-[#2A2927] disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-mono tabular-nums text-[#BEB3A2]">
                  Page {productsData.page} / {productsData.totalPages}
                </span>
                <button
                  type="button"
                  disabled={productPage >= productsData.totalPages}
                  onClick={() => setProductPage((p) => p + 1)}
                  className="px-4 py-2 border border-[#2A2927] disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== CATEGORIES TAB ==================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setEditingCategory({
                    name: '',
                    slug: '',
                    description: '',
                    heroImageUrl: '',
                    displayOrder: categories.length + 1,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C8A46B] text-[#0E0E10] text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-[#151518] border border-[#262522] p-5 flex gap-4 items-start justify-between"
                >
                  <div className="flex gap-4 items-start">
                    <div className="w-16 h-20 bg-[#0E0E10] border border-[#2A2927] overflow-hidden shrink-0">
                      <ResilientImage
                        src={cat.heroImageUrl}
                        mediumUrl={cat.heroImageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-display text-xl text-[#FAF7F0]">{cat.name}</h3>
                      <p className="text-xs font-mono text-[#9C9488]">
                        /{cat.slug} &middot; {cat.productCount ?? 0} products
                      </p>
                      <p className="text-xs text-[#BEB3A2] line-clamp-2">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingCategory({ ...cat })}
                      className="px-3 py-1 border border-[#2A2927] hover:border-[#C8A46B] text-xs cursor-pointer"
                    >
                      Edit
                    </button>
                    {confirmDeleteCategoryId === cat.id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="px-3 py-1 bg-red-700 text-white text-xs cursor-pointer"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCategoryId(cat.id)}
                        className="px-3 py-1 border border-[#2A2927] text-xs text-[#9C9488] hover:text-red-400 cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== MEDIA LIBRARY TAB ==================== */}
        {activeTab === 'media' && (
          <div className="space-y-8">
            {/* Bulk Multi-Photo Uploader */}
            <div className="bg-[#151518] border border-[#C8A46B]/35 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl text-[#FAF7F0]">
                    Bulk WebP Image Uploader
                  </h2>
                  <p className="text-xs text-[#BEB3A2] mt-1">
                    Select multiple saree &amp; bridal photographs. Images are previewed here
                    and automatically converted to cached WebP thumbnails on publish.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={uploadCategoryId}
                    onChange={(e) => setUploadCategoryId(e.target.value)}
                    className="bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-xs text-[#FAF7F0]"
                  >
                    <option value="">General Showroom</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C8A46B] hover:bg-[#DFC391] text-[#0E0E10] text-xs font-semibold uppercase tracking-wider cursor-pointer whitespace-nowrap">
                    <Upload className="w-4 h-4" />
                    <span>Select Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleQueueFiles}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {queuedFiles.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-[#262522]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#DFC391]">
                      {queuedFiles.length} photograph(s) staged for WebP optimization
                    </p>
                    <button
                      type="button"
                      disabled={uploadingBatch}
                      onClick={handlePublishQueuedBatch}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#176B45] hover:bg-[#1E8255] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-60"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {uploadingBatch
                          ? 'Optimizing WebP...'
                          : 'Optimize & Publish Batch'}
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                    {queuedFiles.map((item, idx) => (
                      <div
                        key={item.previewUrl}
                        className="relative aspect-[3/4] border border-[#2A2927] bg-[#0E0E10] overflow-hidden"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedFile(idx)}
                          aria-label="Remove staged photo"
                          className="absolute top-1 right-1 p-1 bg-[#0E0E10]/85 text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Existing Media */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 bg-[#151518] border border-[#2A2927] px-3.5 py-2">
                <Search className="w-4 h-4 text-[#C8A46B]" />
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={(e) => {
                    setMediaSearch(e.target.value);
                    setMediaPage(1);
                  }}
                  placeholder="Search images by filename or alt text..."
                  className="w-full bg-transparent text-sm text-[#FAF7F0] focus:outline-none"
                />
              </div>

              <select
                value={mediaCatFilter}
                onChange={(e) => {
                  setMediaCatFilter(e.target.value);
                  setMediaPage(1);
                }}
                className="bg-[#151518] border border-[#2A2927] px-3.5 py-2 text-sm text-[#FAF7F0]"
              >
                <option value="all">All Image Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {mediaData.items.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-[#151518] border border-[#262522] flex flex-col justify-between"
                >
                  <div className="aspect-[3/4] bg-[#0E0E10] overflow-hidden">
                    <ResilientImage
                      src={asset.thumbUrl}
                      thumbUrl={asset.thumbUrl}
                      alt={asset.altText || asset.originalName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-xs text-[#FAF7F0] truncate" title={asset.originalName}>
                      {asset.originalName}
                    </p>
                    <p className="text-[11px] font-mono text-[#9C9488] tabular-nums">
                      {Math.round(asset.sizeBytes / 1024)} KB WebP
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <label className="inline-flex items-center gap-1 text-[11px] text-[#DFC391] hover:underline cursor-pointer">
                        <RefreshCw className="w-3 h-3" />
                        <span>Replace</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleReplaceImageFile(asset.id, e)}
                          className="hidden"
                        />
                      </label>

                      {confirmDeleteMediaId === asset.id ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(asset.id)}
                          className="text-[11px] text-red-400 font-semibold cursor-pointer"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteMediaId(asset.id)}
                          className="text-[11px] text-[#9C9488] hover:text-red-400 cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== HOMEPAGE & CONTENT TAB ==================== */}
        {activeTab === 'homepage' && settingsForm && (
          <form onSubmit={handleSaveSettings} className="space-y-8 max-w-4xl">
            <div className="bg-[#151518] border border-[#262522] p-6 sm:p-8 space-y-5">
              <h2 className="font-display text-2xl text-[#FAF7F0]">
                Hero Banner &amp; Headlines
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Hero Eyebrow</span>
                  <input
                    type="text"
                    value={settingsForm.heroEyebrow}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, heroEyebrow: e.target.value })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  />
                </label>

                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Hero Heading</span>
                  <input
                    type="text"
                    value={settingsForm.heroHeading}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, heroHeading: e.target.value })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-xs text-[#BEB3A2]">
                <span>Hero Subheading</span>
                <textarea
                  rows={2}
                  value={settingsForm.heroSubheading}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, heroSubheading: e.target.value })
                  }
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-2">
                  <p className="text-xs text-[#BEB3A2]">Hero Banner Image</p>
                  <div className="aspect-video bg-[#0E0E10] border border-[#2A2927] overflow-hidden">
                    <ResilientImage
                      src={settingsForm.heroBannerUrl}
                      largeUrl={settingsForm.heroBannerUrl}
                      alt="Hero banner"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickerTarget({ type: 'heroBanner' })}
                    className="text-xs text-[#DFC391] hover:underline cursor-pointer"
                  >
                    Change From Media Library
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-[#BEB3A2]">Saree Spotlight Banner</p>
                  <div className="aspect-video bg-[#0E0E10] border border-[#2A2927] overflow-hidden">
                    <ResilientImage
                      src={settingsForm.secondaryBannerUrl}
                      largeUrl={settingsForm.secondaryBannerUrl}
                      alt="Secondary banner"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickerTarget({ type: 'secondaryBanner' })}
                    className="text-xs text-[#DFC391] hover:underline cursor-pointer"
                  >
                    Change From Media Library
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-[#BEB3A2]">About Showroom Image</p>
                  <div className="aspect-video bg-[#0E0E10] border border-[#2A2927] overflow-hidden">
                    <ResilientImage
                      src={settingsForm.aboutImageUrl}
                      largeUrl={settingsForm.aboutImageUrl}
                      alt="About showroom"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickerTarget({ type: 'aboutImage' })}
                    className="text-xs text-[#DFC391] hover:underline cursor-pointer"
                  >
                    Change From Media Library
                  </button>
                </div>
              </div>
            </div>

            {/* Brand Story & Promotional Text */}
            <div className="bg-[#151518] border border-[#262522] p-6 sm:p-8 space-y-5">
              <h2 className="font-display text-2xl text-[#FAF7F0]">
                Brand Story, Showroom Info &amp; Socials
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Brand Intro Title</span>
                  <input
                    type="text"
                    value={settingsForm.brandIntroTitle}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, brandIntroTitle: e.target.value })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  />
                </label>

                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Promotional Section Headline</span>
                  <input
                    type="text"
                    value={settingsForm.promoHeadline}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, promoHeadline: e.target.value })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-xs text-[#BEB3A2]">
                <span>Brand Intro Description</span>
                <textarea
                  rows={3}
                  value={settingsForm.brandIntroText}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, brandIntroText: e.target.value })
                  }
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                />
              </label>

              <label className="block space-y-1.5 text-xs text-[#BEB3A2]">
                <span>About Us Narrative</span>
                <textarea
                  rows={3}
                  value={settingsForm.aboutBody}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, aboutBody: e.target.value })
                  }
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Instagram Handle</span>
                  <input
                    type="text"
                    value={settingsForm.instagramHandle}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, instagramHandle: e.target.value })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  />
                </label>
                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Instagram URL</span>
                  <input
                    type="url"
                    value={settingsForm.instagramUrl}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, instagramUrl: e.target.value })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  />
                </label>
                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>WhatsApp Number (digits with country code)</span>
                  <input
                    type="text"
                    value={settingsForm.whatsappNumber}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm font-mono text-[#FAF7F0]"
                  />
                </label>
                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Showroom Hours</span>
                  <input
                    type="text"
                    value={settingsForm.showroomHours}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, showroomHours: e.target.value })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  />
                </label>
              </div>
            </div>

            {/* Policies */}
            <div className="bg-[#151518] border border-[#262522] p-6 sm:p-8 space-y-5">
              <h2 className="font-display text-2xl text-[#FAF7F0]">
                Privacy Policy &amp; Terms
              </h2>
              <label className="block space-y-1.5 text-xs text-[#BEB3A2]">
                <span>Privacy Policy Copy</span>
                <textarea
                  rows={4}
                  value={settingsForm.privacyPolicy}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, privacyPolicy: e.target.value })
                  }
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                />
              </label>
              <label className="block space-y-1.5 text-xs text-[#BEB3A2]">
                <span>Terms &amp; Conditions Copy</span>
                <textarea
                  rows={4}
                  value={settingsForm.termsConditions}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, termsConditions: e.target.value })
                  }
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                />
              </label>
            </div>

            <button
              type="submit"
              className="px-7 py-3.5 bg-[#C8A46B] hover:bg-[#DFC391] text-[#0E0E10] text-xs font-semibold uppercase tracking-[0.16em] cursor-pointer"
            >
              Publish Homepage &amp; Content Changes
            </button>
          </form>
        )}
      </main>

      {/* ==================== PRODUCT EDITOR MODAL ==================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#151518] border border-[#2A2927] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#262522] pb-4">
              <h2 className="font-display text-2xl text-[#FAF7F0]">
                {editingProduct.id ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-[#9C9488] hover:text-[#FAF7F0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Product Name *</span>
                  <input
                    required
                    type="text"
                    value={editingProduct.name || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  />
                </label>

                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Unique Product ID *</span>
                  <input
                    required
                    type="text"
                    value={editingProduct.productCode || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        productCode: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm font-mono text-[#DFC391]"
                  />
                </label>

                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Category *</span>
                  <select
                    required
                    value={editingProduct.categoryId || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        categoryId: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Price in INR (Optional — leave blank to hide)</span>
                  <input
                    type="number"
                    min={0}
                    value={editingProduct.price ?? ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        price: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Optional"
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm font-mono text-[#FAF7F0]"
                  />
                </label>

                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Colour</span>
                  <input
                    type="text"
                    value={editingProduct.colour || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, colour: e.target.value })
                    }
                    placeholder="e.g. Crimson Red, Champagne Gold"
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  />
                </label>

                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Fabric</span>
                  <input
                    type="text"
                    value={editingProduct.fabric || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, fabric: e.target.value })
                    }
                    placeholder="e.g. Pure Katan Silk"
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  />
                </label>

                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Work Details</span>
                  <input
                    type="text"
                    value={editingProduct.workDetails || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        workDetails: e.target.value,
                      })
                    }
                    placeholder="e.g. Zardozi & Antique Zari"
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  />
                </label>

                <label className="space-y-1.5 text-xs text-[#BEB3A2]">
                  <span>Availability</span>
                  <select
                    value={editingProduct.availability || 'In Stock'}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        availability: e.target.value,
                      })
                    }
                    className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Made to Order">Made to Order</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5 text-xs text-[#BEB3A2]">
                <span>Size / Measurements</span>
                <input
                  type="text"
                  value={editingProduct.size || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, size: e.target.value })
                  }
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                />
              </label>

              <label className="block space-y-1.5 text-xs text-[#BEB3A2]">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                />
              </label>

              {/* Flags */}
              <div className="flex flex-wrap gap-5 pt-1 text-sm text-[#D6C9B6]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.isFeatured)}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        isFeatured: e.target.checked,
                      })
                    }
                    className="accent-[#C8A46B]"
                  />
                  <span>Featured Product</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.isNewArrival)}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        isNewArrival: e.target.checked,
                      })
                    }
                    className="accent-[#C8A46B]"
                  />
                  <span>New Arrival</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.isTrending)}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        isTrending: e.target.checked,
                      })
                    }
                    className="accent-[#C8A46B]"
                  />
                  <span>Trending Collection</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.isBestSeller)}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        isBestSeller: e.target.checked,
                      })
                    }
                    className="accent-[#C8A46B]"
                  />
                  <span>Best Seller</span>
                </label>
              </div>

              {/* Product Images Section */}
              <div className="space-y-3 pt-4 border-t border-[#262522]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#BEB3A2]">
                    Product Gallery ({productImagePreviews.length} selected)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerTarget({ type: 'product' })}
                      className="px-3 py-1.5 border border-[#C8A46B]/60 text-xs text-[#DFC391] hover:bg-[#C8A46B] hover:text-[#0E0E10] cursor-pointer"
                    >
                      Pick From Library
                    </button>
                    <label className="px-3 py-1.5 bg-[#1B1B1F] border border-[#2A2927] text-xs text-[#FAF7F0] hover:border-[#C8A46B] cursor-pointer">
                      <span>Upload New Photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleDirectUploadForProduct}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {productImagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {productImagePreviews.map((img, idx) => (
                      <div
                        key={`${img.id}-${idx}`}
                        className="relative aspect-[3/4] border border-[#2A2927] bg-[#0E0E10] overflow-hidden"
                      >
                        <img
                          src={img.thumbUrl}
                          alt={img.altText || 'Product preview'}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-[#C8A46B] text-[#0E0E10] text-[10px] font-bold text-center py-0.5 uppercase">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setProductImageIds((prev) => prev.filter((_, i) => i !== idx));
                            setProductImagePreviews((prev) =>
                              prev.filter((_, i) => i !== idx)
                            );
                          }}
                          className="absolute top-1 right-1 p-1 bg-black/80 text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#262522]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-2.5 border border-[#2A2927] text-xs uppercase tracking-wider text-[#D6C9B6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-6 py-2.5 bg-[#C8A46B] hover:bg-[#DFC391] text-[#0E0E10] text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-60"
                >
                  {savingProduct ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CATEGORY EDITOR MODAL ==================== */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#151518] border border-[#2A2927] max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#262522] pb-3">
              <h2 className="font-display text-2xl text-[#FAF7F0]">
                {editingCategory.id ? 'Edit Category' : 'Create Category'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-[#9C9488] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <label className="block space-y-1.5 text-xs text-[#BEB3A2]">
                <span>Category Name *</span>
                <input
                  required
                  type="text"
                  value={editingCategory.name || ''}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name: e.target.value })
                  }
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                />
              </label>

              <label className="block space-y-1.5 text-xs text-[#BEB3A2]">
                <span>Display Order</span>
                <input
                  type="number"
                  value={editingCategory.displayOrder ?? 0}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      displayOrder: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm font-mono text-[#FAF7F0]"
                />
              </label>

              <label className="block space-y-1.5 text-xs text-[#BEB3A2]">
                <span>Description</span>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0]"
                />
              </label>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#BEB3A2]">Category Cover Image</span>
                <button
                  type="button"
                  onClick={() => setPickerTarget({ type: 'category' })}
                  className="text-xs text-[#DFC391] hover:underline cursor-pointer"
                >
                  Select From Media Library
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#262522]">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 border border-[#2A2927] text-xs uppercase text-[#D6C9B6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="px-5 py-2 bg-[#C8A46B] text-[#0E0E10] text-xs font-semibold uppercase cursor-pointer"
                >
                  {savingCategory ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MEDIA PICKER MODAL ==================== */}
      {pickerTarget && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#151518] border border-[#2A2927] max-w-4xl w-full max-h-[85vh] flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#262522] pb-3">
              <h3 className="font-display text-2xl text-[#FAF7F0]">
                Select Photograph From Media Library
              </h3>
              <button
                type="button"
                onClick={() => setPickerTarget(null)}
                className="text-[#9C9488] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 overflow-y-auto pr-1">
              {mediaData.items.map((asset) => {
                const alreadyAdded =
                  pickerTarget.type === 'product' && productImageIds.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      if (pickerTarget.type === 'product') {
                        if (!alreadyAdded) {
                          setProductImageIds((prev) => [...prev, asset.id]);
                          setProductImagePreviews((prev) => [...prev, asset]);
                        }
                      } else if (pickerTarget.type === 'category' && editingCategory) {
                        setEditingCategory({
                          ...editingCategory,
                          heroImageUrl: asset.mediumUrl,
                        });
                        setPickerTarget(null);
                      } else if (pickerTarget.type === 'heroBanner' && settingsForm) {
                        setSettingsForm({ ...settingsForm, heroBannerUrl: asset.largeUrl });
                        setPickerTarget(null);
                      } else if (
                        pickerTarget.type === 'secondaryBanner' &&
                        settingsForm
                      ) {
                        setSettingsForm({
                          ...settingsForm,
                          secondaryBannerUrl: asset.largeUrl,
                        });
                        setPickerTarget(null);
                      } else if (pickerTarget.type === 'aboutImage' && settingsForm) {
                        setSettingsForm({ ...settingsForm, aboutImageUrl: asset.largeUrl });
                        setPickerTarget(null);
                      }
                    }}
                    className={`relative aspect-[3/4] border overflow-hidden cursor-pointer ${
                      alreadyAdded ? 'border-[#C8A46B]' : 'border-[#2A2927] hover:border-[#C8A46B]'
                    }`}
                  >
                    <img
                      src={asset.thumbUrl}
                      alt={asset.altText || asset.originalName}
                      className="w-full h-full object-cover"
                    />
                    {alreadyAdded && (
                      <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-xs font-semibold text-[#DFC391]">
                        Added
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {pickerTarget.type === 'product' && (
              <div className="flex justify-end pt-3 border-t border-[#262522]">
                <button
                  type="button"
                  onClick={() => setPickerTarget(null)}
                  className="px-5 py-2 bg-[#C8A46B] text-[#0E0E10] text-xs font-semibold uppercase cursor-pointer"
                >
                  Done Selecting
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
