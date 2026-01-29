import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug?: string;
  parent_id?: string | null;
  created_at?: string;
  is_featured?: boolean;
  display_order?: number | null;
  show_on_home?: boolean | null;
}

// SortableCategoryRow Component
interface SortableCategoryRowProps {
  category: Category;
  editingCategory: Category | null;
  editName: string;
  onStartEdit: (category: Category) => void;
  onCancelEdit: () => void;
  onUpdateCategory: () => void;
  onEditNameChange: (name: string) => void;
  onToggleShowOnShop: (categoryId: string, newValue: boolean) => void;
  onToggleFeatured: (categoryId: string, newValue: boolean, e?: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteCategory: (categoryId: string, categoryName: string) => void;
}

const SortableCategoryRow: React.FC<SortableCategoryRowProps> = ({
  category,
  editingCategory,
  editName,
  onStartEdit,
  onCancelEdit,
  onUpdateCategory,
  onEditNameChange,
  onToggleShowOnShop,
  onToggleFeatured,
  onDeleteCategory,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4 items-start lg:items-center transition-colors ${
        isDragging ? 'bg-gray-100 shadow-lg' : 'hover:bg-gray-50'
      }`}
    >
      {editingCategory?.id === category.id ? (
        <div className="flex-1 flex items-center gap-4">
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onUpdateCategory();
              } else if (e.key === 'Escape') {
                onCancelEdit();
              }
            }}
            autoFocus
          />
          <button
            onClick={onUpdateCategory}
            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors font-sans text-sm"
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors font-sans text-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-1 w-full">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 font-sans">{category.name}</h3>
              {category.slug && (
                <p className="text-sm text-gray-500 font-sans">Slug: {category.slug}</p>
              )}
            </div>
          </div>
          <div className="flex flex-row flex-wrap gap-4 text-sm text-gray-700 w-full lg:w-auto lg:justify-center">
            {/* Show on Shop Toggle */}
            <label
              className="flex items-center gap-2 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={category.show_on_home || false}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleShowOnShop(category.id, e.target.checked);
                }}
                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 cursor-pointer"
              />
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-700 font-sans">Show on Shop</span>
                {category.show_on_home && (
                  <Eye className="w-4 h-4 text-green-600" />
                )}
              </div>
            </label>
            {/* Featured Toggle */}
            <label
              className="flex items-center gap-2 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={category.is_featured || false}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleFeatured(category.id, e.target.checked, e);
                }}
                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 font-sans">Featured on Home</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full lg:w-auto lg:flex lg:gap-2 lg:justify-end">
            <button
              onClick={() => onStartEdit(category)}
              className="w-full lg:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors font-sans text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => onDeleteCategory(category.id, category.name)}
              className="w-full lg:w-auto px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors font-sans text-sm"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const AdminCategory: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch all categories
  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        alert('Error loading categories: ' + error.message);
      } else if (data) {
        // Ensure display_order exists for all categories
        const categoriesWithOrder = data.map((cat, index) => ({
          ...cat,
          display_order: cat.display_order ?? index,
        }));
        setCategories(categoriesWithOrder as Category[]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Error loading categories');
    } finally {
      setIsLoading(false);
    }
  }

  // Create new category
  async function handleCreateCategory() {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: newCategoryName.trim(),
          // slug will be auto-generated by trigger
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error);
        alert('Error creating category: ' + error.message);
      } else {
        setNewCategoryName('');
        loadCategories();
        alert('Category created successfully!');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Error creating category');
    }
  }

  // Start editing category
  function handleStartEdit(category: Category) {
    setEditingCategory(category);
    setEditName(category.name);
  }

  // Cancel editing
  function handleCancelEdit() {
    setEditingCategory(null);
    setEditName('');
  }

  // Update category
  async function handleUpdateCategory() {
    if (!editingCategory || !editName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: editName.trim(),
          // slug will be auto-updated by trigger
        })
        .eq('id', editingCategory.id);

      if (error) {
        console.error('Error updating category:', error);
        alert('Error updating category: ' + error.message);
      } else {
        setEditingCategory(null);
        setEditName('');
        loadCategories();
        alert('Category updated successfully!');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category');
    }
  }

  // Reload categories to sync with database
  async function handleUpdateFeaturedCategories() {
    setIsUpdating(true);
    try {
      await loadCategories();
      alert('Featured categories updated successfully! Check the home page to see the changes.');
    } catch (error) {
      console.error('Error updating categories:', error);
      alert('Error refreshing categories');
    } finally {
      setIsUpdating(false);
    }
  }

  // Toggle Show on Shop status
  async function handleToggleShowOnShop(categoryId: string, newValue: boolean) {
    const category = categories.find(cat => cat.id === categoryId);
    const oldValue = category?.show_on_home || false;

    // Optimistic UI update
    setCategories(prevCategories =>
      prevCategories.map(cat =>
        cat.id === categoryId
          ? { ...cat, show_on_home: newValue }
          : cat
      )
    );

    // Update Supabase
    try {
      const { error } = await supabase
        .from('categories')
        .update({ show_on_home: newValue })
        .eq('id', categoryId);

      if (error) {
        console.error('Error updating show_on_home:', error);
        // Revert optimistic update
        setCategories(prevCategories =>
          prevCategories.map(cat =>
            cat.id === categoryId
              ? { ...cat, show_on_home: oldValue }
              : cat
          )
        );
        alert('Error updating "Show on Shop" status: ' + error.message);
      }
    } catch (error) {
      console.error('Error updating show_on_home:', error);
      // Revert optimistic update
      setCategories(prevCategories =>
        prevCategories.map(cat =>
          cat.id === categoryId
            ? { ...cat, show_on_home: oldValue }
            : cat
        )
      );
      alert('Error updating "Show on Shop" status');
    }
  }

  // Handle drag end - update order
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);

    // Optimistic UI update
    const newCategories = arrayMove(categories, oldIndex, newIndex);
    setCategories(newCategories);

    // Update display_order in database
    setIsSavingOrder(true);
    try {
      // Update each category's display_order
      const updatePromises = newCategories.map((category, index) =>
        supabase
          .from('categories')
          .update({ display_order: index })
          .eq('id', category.id)
      );

      const results = await Promise.all(updatePromises);
      const hasError = results.some((result) => result.error);

      if (hasError) {
        console.error('Error updating display order');
        // Reload categories to revert to server state
        await loadCategories();
        alert('Error saving order. Please try again.');
      }
    } catch (error) {
      console.error('Error updating display order:', error);
      // Reload categories to revert to server state
      await loadCategories();
      alert('Error saving order. Please try again.');
    } finally {
      setIsSavingOrder(false);
    }
  }

  // Toggle featured status with optimistic UI update
  async function handleToggleFeatured(categoryId: string, newValue: boolean, e?: React.ChangeEvent<HTMLInputElement>) {
    // Stop event propagation to prevent triggering row click handlers if any
    if (e) {
      e.stopPropagation();
    }

    console.log('Updating category:', categoryId, 'to', newValue);

    // Find the category to save the old value for potential revert
    const category = categories.find(cat => cat.id === categoryId);
    const oldValue = category?.is_featured || false;

    // Optimistic UI update - update local state immediately (feels instant to user)
    setCategories(prevCategories =>
      prevCategories.map(cat =>
        cat.id === categoryId
          ? { ...cat, is_featured: newValue }
          : cat
      )
    );

    // Then update Supabase in the background
    try {
      // First, try update without .single() to avoid PGRST116 error
      const { data: updateData, error } = await supabase
        .from('categories')
        .update({ is_featured: newValue })
        .eq('id', categoryId)
        .select('id, name, is_featured');

      if (error) {
        console.error('Error updating featured status:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Revert optimistic update on error
        setCategories(prevCategories =>
          prevCategories.map(cat =>
            cat.id === categoryId
              ? { ...cat, is_featured: oldValue }
              : cat
          )
        );
        
        alert('Error updating featured status: ' + error.message);
        return;
      }

      console.log('Update response:', { updateData, error });
      
      // Verify the update by fetching the category again (this is more reliable)
      const { data: verifyData, error: verifyError } = await supabase
        .from('categories')
        .select('id, name, is_featured')
        .eq('id', categoryId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully
      
      if (verifyError) {
        console.error('Verification query error:', verifyError);
        // Revert optimistic update
        setCategories(prevCategories =>
          prevCategories.map(cat =>
            cat.id === categoryId
              ? { ...cat, is_featured: oldValue }
              : cat
          )
        );
        alert('Error verifying update: ' + verifyError.message);
      } else if (!verifyData) {
        console.error('⚠️ WARNING: Category not found after update!');
        // Revert optimistic update
        setCategories(prevCategories =>
          prevCategories.map(cat =>
            cat.id === categoryId
              ? { ...cat, is_featured: oldValue }
              : cat
          )
        );
        alert('⚠️ Warning: Could not verify the update. The category may not exist or RLS is blocking access.');
      } else {
        console.log('Verification query result:', verifyData);
        console.log('Verified is_featured value:', verifyData?.is_featured, 'Type:', typeof verifyData?.is_featured);
        
        // Handle boolean comparison (account for string 'true'/'false' from DB)
        const verifiedValue = verifyData.is_featured === true || verifyData.is_featured === 'true' || verifyData.is_featured === 1;
        const expectedValue = newValue;
        
        if (verifiedValue !== expectedValue) {
          console.error('⚠️ WARNING: Update did not persist! Expected:', expectedValue, 'Got:', verifiedValue);
          console.error('Raw value from DB:', verifyData.is_featured);
          // Revert optimistic update
          setCategories(prevCategories =>
            prevCategories.map(cat =>
              cat.id === categoryId
                ? { ...cat, is_featured: oldValue }
                : cat
            )
          );
          alert('⚠️ Warning: The update did not persist. This might be an RLS policy issue. Please check your Supabase policies.');
        } else {
          console.log('✅ Update verified successfully in database');
        }
      }
    } catch (error) {
      console.error('Error updating featured status:', error);
      
      // Revert optimistic update on error
      setCategories(prevCategories =>
        prevCategories.map(cat =>
          cat.id === categoryId
            ? { ...cat, is_featured: oldValue }
            : cat
        )
      );
      
      alert('Error updating featured status: ' + (error as Error).message);
    }
  }

  // Delete category
  async function handleDeleteCategory(categoryId: string, categoryName: string) {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This will also remove all product associations.`)) {
      return;
    }

    try {
      // First, delete all product-category relationships
      const { error: pcError } = await supabase
        .from('product_categories')
        .delete()
        .eq('category_id', categoryId);

      if (pcError) {
        console.error('Error deleting product categories:', pcError);
        alert('Error deleting product associations: ' + pcError.message);
        return;
      }

      // Then delete the category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category: ' + error.message);
      } else {
        loadCategories();
        alert('Category deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
          <h1 
            className="text-4xl md:text-5xl font-serif font-bold text-gray-800 text-center mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Category Management
          </h1>

          {/* Add New Category Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 font-sans">Add New Category</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name (e.g., Love, Birthday)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCategory();
                  }
                }}
              />
              <button
                onClick={handleCreateCategory}
                className="px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors font-sans"
              >
                Add Category
              </button>
            </div>
          </div>

          {/* Categories List */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800 font-sans">All Categories</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleUpdateFeaturedCategories}
                  disabled={isUpdating || isLoading}
                  className="px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors font-sans disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Update Featured Categories'
                  )}
                </button>
                <Link
                  to="/"
                  className="px-6 py-2 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors font-sans"
                >
                  View Home Page
                </Link>
              </div>
            </div>
            
            {/* Featured Categories Info */}
            <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
              <p className="text-sm text-pink-800 font-sans">
                <strong>ℹ️ Tip:</strong> Check the "Featured on Home" checkbox for categories you want to display on the home page. 
                Click "Update Featured Categories" to refresh and see the selected categories. 
                Then click "View Home Page" to see them in action!
              </p>
            </div>
            
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500 font-sans">Loading categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 font-sans">No categories found. Create your first category above.</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={categories.map((cat) => cat.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {categories.map((category) => (
                      <SortableCategoryRow
                        key={category.id}
                        category={category}
                        editingCategory={editingCategory}
                        editName={editName}
                        onStartEdit={handleStartEdit}
                        onCancelEdit={handleCancelEdit}
                        onUpdateCategory={handleUpdateCategory}
                        onEditNameChange={setEditName}
                        onToggleShowOnShop={handleToggleShowOnShop}
                        onToggleFeatured={handleToggleFeatured}
                        onDeleteCategory={handleDeleteCategory}
                      />
                    ))}
                  </div>
                </SortableContext>
                {isSavingOrder && (
                  <div className="mt-4 text-center text-sm text-gray-500 font-sans">
                    Saving order...
                  </div>
                )}
              </DndContext>
            )}
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2 font-sans">ℹ️ Information</h3>
            <ul className="text-sm text-blue-800 space-y-1 font-sans list-disc list-inside">
              <li>Categories are automatically linked to products via the product_categories table</li>
              <li>Slugs are auto-generated from category names</li>
              <li>Deleting a category will remove all product associations</li>
              <li>Use the seed-categories.js script to import categories from CSV</li>
            </ul>
          </div>
        </div>
  );
};

export default AdminCategory;
