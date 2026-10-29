import React, { useState, useEffect } from 'react';
import {
  Tag,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Building,
  Target,
  Sparkles,
  ShieldCheck,
  X,
  Check
} from 'lucide-react';
import { BusinessCategory } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../layout/Sidebar';

interface CategoriesViewProps {
  onNavigate: (tab: NavTab) => void;
  onLaunchCampaignWithCategory?: (category: string) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [search, setSearch] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<BusinessCategory | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSubcategories, setFormSubcategories] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data);
      // Expand first 4 categories by default
      setExpandedIds(new Set(data.slice(0, 4).map(c => c.id)));
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  const expandAll = () => {
    setExpandedIds(new Set(categories.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setFormSubcategories('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: BusinessCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormSubcategories(cat.subcategories.join(', '));
    setIsModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!formName.trim()) return;
    setIsSaving(true);
    try {
      const subs = formSubcategories
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (editingCategory) {
        await api.updateCategory(editingCategory.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          subcategories: subs.length > 0 ? subs : [formName.trim()]
        });
      } else {
        await api.createCategory({
          name: formName.trim(),
          description: formDescription.trim(),
          subcategories: subs.length > 0 ? subs : [formName.trim()]
        });
      }
      setIsModalOpen(false);
      await fetchCategories();
    } catch (err) {
      console.error('Failed to save category:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.deleteCategory(id);
      await fetchCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subcategories.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-amber-400" />
            <span>Business Niche Library ({categories.length} Verticals)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Searchable taxonomy of Pakistani commercial sectors with curated subcategories.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-950/40 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Category</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Bulk Expand Controls */}
      <div className="p-4 rounded-2xl bg-[#0b1222]/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="w-full sm:w-96 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search category or subcategory..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((cat, idx) => {
          const isExpanded = expandedIds.has(cat.id);

          return (
            <div
              key={`${cat.id}-${cat.slug || idx}`}
              className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 hover:border-slate-700 overflow-hidden transition-all shadow-sm"
            >
              {/* Category Header Bar */}
              <div
                onClick={() => toggleExpand(cat.id)}
                className="p-4 cursor-pointer flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Building className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-white truncate flex items-center gap-2">
                      <span>{cat.name}</span>
                      {cat.isCustom && (
                        <span className="text-[10px] font-semibold text-amber-400 px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
                          Custom
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{cat.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
                    {cat.subcategories.length} niches
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Subcategories Expandable Drawer */}
              {isExpanded && (
                <div className="p-4 pt-1 border-t border-slate-800/60 bg-slate-950/40 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {cat.subcategories.map((sub, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900/90 text-slate-200 border border-slate-800"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>

                  {/* Actions for this category */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/40 text-xs">
                    <button
                      onClick={() => onNavigate('wizard')}
                      className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Hunt In This Category</span>
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                          title="Edit Category & Subcategories"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {cat.isCustom && (
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 bg-slate-900 border border-slate-800"
                            title="Delete Custom Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for Add / Edit Category */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e172a] border border-amber-500/30 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span>{editingCategory ? 'Edit Category' : 'Add New Category'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Fintech & Microfinance"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="e.g. Digital payment wallets, lending apps, and loan brokers."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Subcategories (comma separated)
                </label>
                <textarea
                  rows={3}
                  value={formSubcategories}
                  onChange={e => setFormSubcategories(e.target.value)}
                  placeholder="e.g. Microfinance banks, Mobile wallet agents, SME loan advisors"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={isSaving || !formName.trim()}
                onClick={handleSaveCategory}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md"
              >
                {isSaving ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
