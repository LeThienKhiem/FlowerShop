import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Upload } from 'lucide-react';

const PROMO_ID = 1;
const BUCKET = 'popups';

interface Promotion {
  id: number;
  shop_name: string | null;
  title: string | null;
  cta_text: string | null;
  cta_link: string | null;
  contact_info: string | null;
  image_url: string | null;
  is_active: boolean;
  show_button: boolean;
  created_at?: string;
}

const defaultPromo: Promotion = {
  id: PROMO_ID,
  shop_name: 'Magnolia Florist',
  title: "Happy Valentine's Day",
  cta_text: 'Shop Now',
  cta_link: "/shop?category=Valentine's Day",
  contact_info: 'Call us at (03) 9877 3164 for further assistance!',
  image_url: null,
  is_active: false,
  show_button: true,
};

const PromotionSettings: React.FC = () => {
  const [form, setForm] = useState<Promotion>(defaultPromo);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    loadPromotion();
  }, []);

  async function loadPromotion() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', PROMO_ID)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const p = data as Promotion;
        setForm({
          id: p.id,
          shop_name: p.shop_name ?? '',
          title: p.title ?? '',
          cta_text: p.cta_text ?? 'Shop Now',
          cta_link: p.cta_link ?? "/shop?category=Valentine's Day",
          contact_info: p.contact_info ?? '',
          image_url: p.image_url ?? null,
          is_active: p.is_active ?? false,
          show_button: (p as { show_button?: boolean }).show_button !== false,
          created_at: p.created_at,
        });
        if (p.image_url) setImagePreview(p.image_url);
      } else {
        setForm({ ...defaultPromo });
      }
    } catch (e) {
      console.error('Error loading promotion:', e);
      setMessage({ type: 'error', text: 'Failed to load promotion.' });
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file (JPEG, PNG, GIF, WebP).' });
      return;
    }
    if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return form.image_url;

    setUploading(true);
    try {
      const ext = imageFile.name.split('.').pop() || 'png';
      const path = `promo-${PROMO_ID}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, imageFile, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.error('Upload error:', e);
      setMessage({ type: 'error', text: 'Image upload failed.' });
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      let imageUrl = form.image_url;
      if (imageFile) {
        const uploaded = await uploadImage();
        if (uploaded) imageUrl = uploaded;
      }

      const payload = {
        shop_name: form.shop_name || null,
        title: form.title || null,
        cta_text: form.cta_text || 'Shop Now',
        cta_link: form.cta_link || "/shop?category=Valentine's Day",
        contact_info: form.contact_info || null,
        image_url: imageUrl || null,
        is_active: form.is_active,
        show_button: form.show_button,
      };

      const { error } = await supabase
        .from('promotions')
        .upsert({ id: PROMO_ID, ...payload }, { onConflict: 'id' });

      if (error) throw error;

      setForm((prev) => ({ ...prev, ...payload, image_url: imageUrl ?? prev.image_url }));
      setImageFile(null);
      if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
      if (imageUrl) setImagePreview(imageUrl);
      setMessage({ type: 'success', text: 'Changes saved.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      console.error('Save error:', e);
      setMessage({ type: 'error', text: 'Failed to save. Check console.' });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-600">Loading promotion settings…</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">
          Promotion Popup
        </h1>
        <p className="text-gray-600 font-sans">
          Configure the single promotion popup (ID=1). Toggle visibility, image, and copy.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg font-sans ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Show Popup toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
          />
          <label htmlFor="is_active" className="font-medium text-gray-800 font-sans">
            Show popup
          </label>
        </div>

        {/* Show CTA Button toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="show_button"
            checked={form.show_button}
            onChange={(e) => setForm((p) => ({ ...p, show_button: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
          />
          <label htmlFor="show_button" className="font-medium text-gray-800 font-sans">
            Show CTA Button (Shop Now)
          </label>
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 font-sans">
            Popup image
          </label>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {imagePreview && (
              <div className="w-40 h-28 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <label className="flex items-center justify-center gap-2 w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors font-sans text-sm text-gray-700">
                <Upload size={18} />
                {imageFile ? 'Change image' : 'Upload image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {form.image_url && !imageFile && (
                <p className="mt-1 text-xs text-gray-500 truncate max-w-xs" title={form.image_url}>
                  Current: {form.image_url}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Shop name */}
        <div>
          <label htmlFor="shop_name" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
            Shop name
          </label>
          <input
            id="shop_name"
            type="text"
            value={form.shop_name ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, shop_name: e.target.value }))}
            placeholder="e.g. Magnolia Florist"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={form.title ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Happy Valentine's Day"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
          />
        </div>

        {form.show_button && (
          <>
            {/* CTA label */}
            <div>
              <label htmlFor="cta_text" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                CTA button label
              </label>
              <input
                id="cta_text"
                type="text"
                value={form.cta_text ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, cta_text: e.target.value }))}
                placeholder="Shop Now"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
              />
            </div>

            {/* CTA link */}
            <div>
              <label htmlFor="cta_link" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                CTA link
              </label>
              <input
                id="cta_link"
                type="text"
                value={form.cta_link ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, cta_link: e.target.value }))}
                placeholder="/shop or /shop?category=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
              />
            </div>
          </>
        )}

        {/* Contact text */}
        <div>
          <label htmlFor="contact_info" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
            Contact text
          </label>
          <input
            id="contact_info"
            type="text"
            value={form.contact_info ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, contact_info: e.target.value }))}
            placeholder="e.g. Call us at (03) 9877 3164 for further assistance!"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
          />
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={isSaving || uploading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans"
          >
            <Save size={18} />
            {isSaving || uploading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PromotionSettings;
