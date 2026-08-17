import React, { useState } from 'react';
import { ChefHat, Plus } from 'lucide-react';
import { useRecipes, usePublishRecipe, useArchiveRecipe } from '../hooks/useInventory';
import { RecipeBOMEditorModal } from '../components/RecipeBOMEditorModal';
import { RecipeVersionBadge } from '../components/RecipeVersionBadge';

export const RecipesPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { data: recipes = [], isLoading } = useRecipes({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  });

  const publishMutation = usePublishRecipe();
  const archiveMutation = useArchiveRecipe();

  const handlePublish = async (id: string) => {
    await publishMutation.mutateAsync(id);
  };

  const handleArchive = async (id: string) => {
    await archiveMutation.mutateAsync(id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <ChefHat className="w-7 h-7 text-emerald-400" />
            Recipe & Bill of Materials (BOM)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Menu recipe versioning, nested sub-recipes, loss percentages & food costing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsEditorOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Create Recipe BOM
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === st
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Recipe Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-slate-400">Loading recipe catalog...</div>
      ) : recipes.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-500 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20">
          No recipes found. Click "Create Recipe BOM" to build your first standard dish recipe.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.map((recipe) => {
            const cost = Number(recipe.calculated_cost || 0);

            return (
              <div
                key={recipe.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                        {recipe.name || recipe.menu_item_name || 'Recipe'}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {recipe.recipe_type === 'SUB_RECIPE' ? 'Sub-Recipe Prep' : 'Menu Dish BOM'}
                      </span>
                    </div>

                    <RecipeVersionBadge status={recipe.status} version={recipe.version} />
                  </div>

                  {/* Cost & Yield */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Cost / {recipe.output_unit}
                      </span>
                      <span className="text-lg font-bold font-mono text-emerald-400">
                        ${cost.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Batch Output
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        {Number(recipe.output_quantity).toFixed(1)} {recipe.output_unit}
                      </span>
                    </div>
                  </div>

                  {/* Ingredients preview */}
                  <div className="mt-4">
                    <span className="text-xs font-semibold text-slate-400 block mb-2">
                      Ingredients ({recipe.ingredients?.length || 0})
                    </span>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {recipe.ingredients?.map((ing) => (
                        <div
                          key={ing.id}
                          className="flex items-center justify-between text-xs text-slate-300 py-0.5 border-b border-slate-800/30"
                        >
                          <span className="truncate pr-2">
                            {ing.inventory_item_name || ing.sub_recipe_name}
                          </span>
                          <span className="font-mono text-slate-400 flex-shrink-0">
                            {Number(ing.quantity).toFixed(2)} {ing.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500">
                    Updated {new Date(recipe.updated_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {recipe.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(recipe.id)}
                        disabled={publishMutation.isPending}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
                      >
                        Publish
                      </button>
                    )}

                    {recipe.status === 'PUBLISHED' && (
                      <button
                        onClick={() => handleArchive(recipe.id)}
                        disabled={archiveMutation.isPending}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isEditorOpen && (
        <RecipeBOMEditorModal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} />
      )}
    </div>
  );
};
