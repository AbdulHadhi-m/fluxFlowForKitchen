import React, { useState } from 'react';
import { X, Plus, Trash2, ChefHat, Sparkles, AlertCircle, AlertTriangle } from 'lucide-react';
import { useInventoryItems, useRecipes, useCreateRecipe } from '../hooks/useInventory';
import { useMenu } from '@/features/menu/hooks/useMenu';
import { UnitOfMeasure, RecipeType } from '../types/inventory.types';

interface RecipeBOMEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface IngredientRow {
  type: 'ITEM' | 'SUB_RECIPE';
  id: string;
  quantity: number;
  unit: UnitOfMeasure;
  notes: string;
}

export const RecipeBOMEditorModal: React.FC<RecipeBOMEditorModalProps> = ({ isOpen, onClose }) => {
  const [recipeType, setRecipeType] = useState<RecipeType>('MENU_ITEM_RECIPE');
  const [name, setName] = useState('');
  const [menuItemId, setMenuItemId] = useState('');
  const [outputQuantity, setOutputQuantity] = useState(1);
  const [outputUnit, setOutputUnit] = useState<UnitOfMeasure>('portion');
  const [yieldPercentage] = useState(100);
  const [prepLossPct, setPrepLossPct] = useState(0);
  const [cookingLossPct, setCookingLossPct] = useState(0);
  const [instructions, setInstructions] = useState('');
  const [notes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { type: 'ITEM', id: '', quantity: 1, unit: 'kg', notes: '' },
  ]);

  const { data: inventoryItems = [] } = useInventoryItems();
  const { data: existingRecipes = [] } = useRecipes({ recipe_type: 'SUB_RECIPE' });
  const { menuItems = [] } = useMenu();

  const createRecipeMutation = useCreateRecipe();

  if (!isOpen) return null;

  const addIngredientRow = () => {
    setError(null);
    setIngredients((prev) => [...prev, { type: 'ITEM', id: '', quantity: 1, unit: 'kg', notes: '' }]);
  };

  const removeIngredientRow = (index: number) => {
    setError(null);
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRowType = (index: number, newType: 'ITEM' | 'SUB_RECIPE') => {
    setError(null);
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        type: newType,
        id: '',
        unit: newType === 'ITEM' ? 'kg' : 'portion',
      };
      return copy;
    });
  };

  const updateRowId = (index: number, selectedId: string) => {
    setError(null);
    setIngredients((prev) => {
      const copy = [...prev];
      const currentRow = copy[index];
      let newUnit = currentRow.unit;

      if (currentRow.type === 'ITEM') {
        const found = inventoryItems.find((i) => i.id === selectedId);
        if (found && found.unit) {
          newUnit = found.unit as UnitOfMeasure;
        }
      } else {
        const found = existingRecipes.find((r) => r.id === selectedId);
        if (found && found.output_unit) {
          newUnit = found.output_unit as UnitOfMeasure;
        }
      }

      copy[index] = {
        ...currentRow,
        id: selectedId,
        unit: newUnit,
      };
      return copy;
    });
  };

  const updateRow = (index: number, field: keyof IngredientRow, val: any) => {
    setError(null);
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Dynamic estimate of raw cost
  const estimatedCost = ingredients.reduce((sum, row) => {
    if (!row.id) return sum;
    if (row.type === 'ITEM') {
      const item = inventoryItems.find((i) => i.id === row.id);
      if (!item) return sum;
      const cost = Number(item.weighted_average_cost || item.cost_per_unit || 0);
      return sum + cost * (Number(row.quantity) || 0);
    } else {
      const sub = existingRecipes.find((r) => r.id === row.id);
      if (!sub) return sum;
      const cost = Number(sub.calculated_cost || 0);
      return sum + cost * (Number(row.quantity) || 0);
    }
  }, 0);

  const totalLoss = prepLossPct + cookingLossPct;
  const effectiveCost = totalLoss > 0 && totalLoss < 100 ? estimatedCost / (1 - totalLoss / 100) : estimatedCost;
  const costPerPortion = outputQuantity > 0 ? effectiveCost / outputQuantity : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setError(null);

    // Validation
    if (recipeType === 'MENU_ITEM_RECIPE' && !menuItemId) {
      setError('Please select a linked menu dish for this recipe.');
      return;
    }

    if (recipeType === 'SUB_RECIPE' && !name.trim()) {
      setError('Please enter a name for this sub-recipe.');
      return;
    }

    const unselectedRows = ingredients.filter((r) => !r.id);
    if (unselectedRows.length > 0) {
      setError('Please select an ingredient or sub-recipe for each row, or remove empty rows.');
      return;
    }

    const invalidQtyRows = ingredients.filter((r) => !r.quantity || Number(r.quantity) <= 0);
    if (invalidQtyRows.length > 0) {
      setError('Quantity for all ingredients must be greater than zero.');
      return;
    }

    const formattedIngredients = ingredients
      .filter((r) => r.id)
      .map((r) => ({
        inventory_item_id: r.type === 'ITEM' ? r.id : undefined,
        sub_recipe_id: r.type === 'SUB_RECIPE' ? r.id : undefined,
        quantity: Number(r.quantity),
        unit: r.unit,
        preparation_notes: r.notes || '',
      }));

    if (formattedIngredients.length === 0) {
      setError('Please add at least one ingredient to the recipe.');
      return;
    }

    const selectedDish = menuItems.find((m: any) => m.id === menuItemId);
    const finalRecipeName =
      recipeType === 'SUB_RECIPE'
        ? name.trim()
        : selectedDish?.name
        ? `${selectedDish.name} BOM`
        : 'Menu Item Recipe';

    try {
      await createRecipeMutation.mutateAsync({
        name: finalRecipeName,
        recipe_type: recipeType,
        menu_item_id: recipeType === 'MENU_ITEM_RECIPE' ? menuItemId : undefined,
        output_quantity: outputQuantity,
        output_unit: outputUnit,
        yield_percentage: yieldPercentage,
        preparation_loss_pct: prepLossPct,
        cooking_loss_pct: cookingLossPct,
        instructions,
        notes,
        ingredients: formattedIngredients,
      });
      onClose();
    } catch (err: any) {
      console.error('Recipe creation error:', err);
      const data = err?.response?.data;
      let backendError = 'Failed to save and publish recipe. Please verify your inputs and try again.';

      if (data?.error) {
        const errorObj = data.error;
        if (typeof errorObj === 'string') {
          backendError = errorObj;
        } else if (errorObj.details) {
          if (typeof errorObj.details === 'string') {
            backendError = errorObj.details;
          } else if (Array.isArray(errorObj.details)) {
            backendError = errorObj.details.join(', ');
          } else if (typeof errorObj.details === 'object') {
            backendError = Object.entries(errorObj.details)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`)
              .join('; ');
          }
        } else if (errorObj.message) {
          backendError = errorObj.message;
        }
      } else if (typeof data === 'string') {
        backendError = data;
      } else if (data?.detail) {
        backendError = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      } else if (data?.message) {
        backendError = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
      } else if (err?.message) {
        backendError = err.message;
      }

      setError(backendError);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recipe / BOM Builder</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create standard recipe BOM, sub-recipes & yield costing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-500 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Unable to Save Recipe</p>
                <p className="text-xs text-rose-400 mt-0.5">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-rose-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Recipe Type & Target */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Recipe Type
              </label>
              <select
                value={recipeType}
                onChange={(e) => {
                  setRecipeType(e.target.value as RecipeType);
                  setError(null);
                }}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="MENU_ITEM_RECIPE">Menu Item Dish BOM</option>
                <option value="SUB_RECIPE">Sub-Recipe / Batch Prep</option>
              </select>
            </div>

            {recipeType === 'MENU_ITEM_RECIPE' ? (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Linked Menu Dish *
                </label>
                <select
                  value={menuItemId}
                  onChange={(e) => {
                    setMenuItemId(e.target.value);
                    setError(null);
                  }}
                  required
                  className={`w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border ${
                    hasAttemptedSubmit && !menuItemId
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                  } text-slate-700 dark:text-slate-200 text-sm focus:outline-none`}
                >
                  <option value="">Select a menu dish...</option>
                  {menuItems.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (${Number(item.price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Sub-Recipe Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. Marinara Sauce Prep (5L Batch)"
                  required
                  className={`w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border ${
                    hasAttemptedSubmit && !name.trim()
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                  } text-slate-700 dark:text-slate-200 text-sm focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600`}
                />
              </div>
            )}
          </div>

          {/* Yields & Portions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Output Quantity</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={outputQuantity}
                onChange={(e) => {
                  setOutputQuantity(Math.max(0.001, Number(e.target.value)));
                  setError(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Output Unit</label>
              <select
                value={outputUnit}
                onChange={(e) => setOutputUnit(e.target.value as UnitOfMeasure)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm"
              >
                <option value="portion">Portion</option>
                <option value="piece">Piece</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">Liters</option>
                <option value="ml">ml</option>
                <option value="pack">Pack</option>
                <option value="bottle">Bottle</option>
                <option value="box">Box</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Prep Loss %</label>
              <input
                type="number"
                min="0"
                max="90"
                value={prepLossPct}
                onChange={(e) => {
                  setPrepLossPct(Number(e.target.value));
                  setError(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Cooking Loss %</label>
              <input
                type="number"
                min="0"
                max="90"
                value={cookingLossPct}
                onChange={(e) => {
                  setCookingLossPct(Number(e.target.value));
                  setError(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Dynamic Ingredients Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Ingredients & Bill of Materials (BOM) *
              </h3>
              <button
                type="button"
                onClick={addIngredientRow}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Ingredient
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((row, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-12 gap-2 p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-950/40 border ${
                    hasAttemptedSubmit && !row.id
                      ? 'border-rose-500/60 bg-rose-500/5'
                      : 'border-slate-200 dark:border-slate-800/80'
                  } items-center`}
                >
                  <div className="col-span-2">
                    <select
                      value={row.type}
                      onChange={(e) => updateRowType(idx, e.target.value as 'ITEM' | 'SUB_RECIPE')}
                      className="w-full px-2 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs"
                    >
                      <option value="ITEM">Raw Item</option>
                      <option value="SUB_RECIPE">Sub-Recipe</option>
                    </select>
                  </div>

                  <div className="col-span-4">
                    {row.type === 'ITEM' ? (
                      <select
                        value={row.id}
                        onChange={(e) => updateRowId(idx, e.target.value)}
                        className={`w-full px-2 py-1.5 rounded-md bg-white dark:bg-slate-900 border ${
                          hasAttemptedSubmit && !row.id
                            ? 'border-rose-500 text-rose-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                        } text-xs`}
                      >
                        <option value="">Select ingredient...</option>
                        {inventoryItems.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} (${Number(i.weighted_average_cost || i.cost_per_unit || 0).toFixed(2)}/{i.unit})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={row.id}
                        onChange={(e) => updateRowId(idx, e.target.value)}
                        className={`w-full px-2 py-1.5 rounded-md bg-white dark:bg-slate-900 border ${
                          hasAttemptedSubmit && !row.id
                            ? 'border-rose-500 text-rose-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                        } text-xs`}
                      >
                        <option value="">
                          {existingRecipes.length === 0
                            ? 'No sub-recipes available (create one first)'
                            : 'Select sub-recipe...'}
                        </option>
                        {existingRecipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} (${Number(r.calculated_cost || 0).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={row.quantity}
                      onChange={(e) => updateRow(idx, 'quantity', Number(e.target.value))}
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <select
                      value={row.unit}
                      onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">Liters</option>
                      <option value="ml">ml</option>
                      <option value="piece">Piece</option>
                      <option value="portion">Portion</option>
                      <option value="pack">Pack</option>
                      <option value="bottle">Bottle</option>
                      <option value="box">Box</option>
                    </select>
                  </div>

                  <div className="col-span-1">
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                      placeholder="Prep notes"
                      className="w-full px-2 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-700"
                    />
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(idx)}
                      disabled={ingredients.length <= 1}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      title={ingredients.length <= 1 ? 'At least one row required' : 'Remove row'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasAttemptedSubmit && ingredients.some((r) => !r.id) && (
              <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Please select an item for highlighted rows or delete unused rows.
              </p>
            )}
          </div>

          {/* Live Cost Calculation Bar */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Estimated Food Cost
                </span>
                <span className="text-xl font-bold text-emerald-400">
                  ${costPerPortion.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ {outputUnit}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
              <div>
                <span className="block text-slate-500">Suggested @ 30% Food Cost</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                  ${(costPerPortion / 0.3).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">Suggested @ 25% Food Cost</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                  ${(costPerPortion / 0.25).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Instructions & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Preparation Instructions & SOP
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Step-by-step preparation notes for line cooks..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRecipeMutation.isPending}
              className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold text-sm transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {createRecipeMutation.isPending && (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              )}
              {createRecipeMutation.isPending ? 'Publishing BOM...' : 'Save & Publish Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

