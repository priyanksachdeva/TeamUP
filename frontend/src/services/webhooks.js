/**
 * API service for webhook management
 */
import api from "./api";

export const webhookAPI = {
  /**
   * Create a new webhook for a project
   */
  async create(projectId, data) {
    const response = await api.post(`/webhooks/${projectId}`, data);
    return response.data;
  },

  /**
   * List all webhooks for a project
   */
  async list(projectId) {
    const response = await api.get(`/webhooks/${projectId}`);
    return response.data;
  },

  /**
   * Update a webhook
   */
  async update(projectId, webhookId, data) {
    const response = await api.patch(
      `/webhooks/${projectId}/${webhookId}`,
      data,
    );
    return response.data;
  },

  /**
   * Delete a webhook
   */
  async delete(projectId, webhookId) {
    const response = await api.delete(`/webhooks/${projectId}/${webhookId}`);
    return true;
  },

  /**
   * Test a webhook by sending a test message
   */
  async test(projectId, webhookId) {
    const response = await api.post(`/webhooks/${projectId}/${webhookId}/test`);
    return response.data;
  },
};

/**
 * Get email-to-task configuration
 */
export async function getEmailConfig() {
  const response = await api.get(`/email/config`);
  return response.data;
}
