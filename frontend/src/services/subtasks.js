/**
 * Subtask API client
 */
import api from "./api";

export const subtaskAPI = {
  /**
   * Create a subtask for a task
   */
  create: async (taskId, title) => {
    const response = await api.post(`/tasks/${taskId}/subtasks`, {
      title,
      completed: false,
    });
    return response.data;
  },

  /**
   * Update a subtask (toggle completed or change title)
   */
  update: async (taskId, subtaskId, data) => {
    const response = await api.patch(
      `/tasks/${taskId}/subtasks/${subtaskId}`,
      data,
    );
    return response.data;
  },

  /**
   * Delete a subtask
   */
  delete: async (taskId, subtaskId) => {
    const response = await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
    return response.data;
  },
};

/**
 * Task reordering API
 */
export const reorderAPI = {
  /**
   * Reorder a task within its column
   */
  reorder: async (taskId, position) => {
    const response = await api.patch(`/tasks/${taskId}/reorder`, {
      position,
    });
    return response.data;
  },
};
