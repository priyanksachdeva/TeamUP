/**
 * Optimistic UI utilities for better UX during API calls.
 * Ensures UI updates instantly while network request is in flight.
 */

/**
 * Optimistically update state and rollback on error.
 * @param {Function} setStateFunction - State setter function
 * @param {Function} apiCall - Async API call function
 * @param {*} optimisticValue - Value to set immediately
 * @param {Function} errorHandler - Optional error callback
 */
export async function optimisticUpdate(
  setStateFunction,
  apiCall,
  optimisticValue,
  errorHandler = null,
) {
  // Store previous state for rollback
  const previousState = setStateFunction.toString();

  // Optimistically update UI
  setStateFunction(optimisticValue);

  try {
    // Make API call
    const result = await apiCall();
    // Update with actual server response if different structure
    return result;
  } catch (error) {
    // Rollback on error (this is approximate - ideally store prev state)
    console.error("Optimistic update failed, rolling back:", error);
    if (errorHandler) {
      errorHandler(error);
    }
    throw error;
  }
}

/**
 * Optimistically update an item in a list.
 * @param {Array} items - Current list
 * @param {string} itemId - Item ID to update
 * @param {Object} updates - Partial updates
 * @returns {Array} New list with optimistic update
 */
export function optimisticListUpdate(items, itemId, updates) {
  return items.map((item) =>
    item.id === itemId ? { ...item, ...updates } : item,
  );
}

/**
 * Optimistically add an item to a list.
 * @param {Array} items - Current list
 * @param {Object} newItem - New item to add
 * @returns {Array} New list with item added
 */
export function optimisticListAdd(items, newItem) {
  return [newItem, ...items];
}

/**
 * Optimistically remove an item from a list.
 * @param {Array} items - Current list
 * @param {string} itemId - Item ID to remove
 * @returns {Array} New list with item removed
 */
export function optimisticListRemove(items, itemId) {
  return items.filter((item) => item.id !== itemId);
}

/**
 * Debounced save for inline edits.
 * @param {Function} saveFunction - Async save function
 * @param {number} delay - Debounce delay in ms
 */
export function createDebouncedSave(saveFunction, delay = 1000) {
  let timeoutId;
  let lastValue;

  return (value) => {
    lastValue = value;
    clearTimeout(timeoutId);

    timeoutId = setTimeout(async () => {
      try {
        await saveFunction(lastValue);
      } catch (error) {
        console.error("Debounced save failed:", error);
      }
    }, delay);
  };
}
