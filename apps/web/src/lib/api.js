/**
 * CareCircle API Client
 * 
 * Communicates with the backend API server.
 * The API serves as a fast cache for the UI - the blockchain is the source of truth.
 */

export const API = import.meta.env.VITE_API_URL || "http://localhost:3005";

/**
 * Helper function for API requests
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API}${endpoint}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };
  
  const res = await fetch(url, config);
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  
  return res.json();
}

// ==================== Circle API ====================

/**
 * Create or update a circle in the cache
 */
export async function upsertCircle(circle) {
  return apiRequest("/circles/upsert", {
    method: "POST",
    body: JSON.stringify(circle),
  });
}

/**
 * Get a circle by ID
 */
export async function fetchCircle(circleId) {
  return apiRequest(`/circles/${circleId}`);
}

/**
 * Get all circles owned by an address
 */
export async function fetchCirclesByOwner(address) {
  return apiRequest(`/circles/owner/${address}`);
}

/**
 * Get all circles created with a wallet key
 */
export async function fetchCirclesByWalletKey(walletKey) {
  return apiRequest(`/circles/wallet/${walletKey}`);
}

/**
 * Get circles by name (partial match, case-insensitive)
 */
export async function fetchCirclesByName(name) {
  return apiRequest(`/circles/name/${encodeURIComponent(name)}`);
}

// ==================== Member API ====================

/**
 * Add or update a member in a circle
 */
export async function upsertMember(member) {
  return apiRequest("/members/upsert", {
    method: "POST",
    body: JSON.stringify(member),
  });
}

/**
 * Get all members of a circle
 */
export async function fetchMembers(circleId) {
  return apiRequest(`/circles/${circleId}/members`);
}

/**
 * Send member invitation by email
 */
export async function sendMemberInvitation(invitation) {
  return apiRequest("/invitations/send", {
    method: "POST",
    body: JSON.stringify(invitation),
  });
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token) {
  return apiRequest(`/invitations/${token}`);
}

/**
 * Accept invitation and add member
 */
export async function acceptInvitation(token, memberData) {
  return apiRequest(`/invitations/${token}/accept`, {
    method: "POST",
    body: JSON.stringify(memberData),
  });
}

// ==================== Task API ====================

/**
 * Create or update a task
 */
export async function upsertTask(task) {
  return apiRequest("/tasks/upsert", {
    method: "POST",
    body: JSON.stringify(task),
  });
}

/**
 * Get all tasks for a circle
 */
export async function fetchTasks(circleId) {
  return apiRequest(`/circles/${circleId}/tasks`);
}

/**
 * Get a single task by ID
 */
export async function fetchTask(taskId) {
  return apiRequest(`/tasks/${taskId}`);
}

/**
 * Get all tasks assigned to an address
 */
export async function fetchTasksByAssignee(address) {
  return apiRequest(`/tasks/assigned/${address}`);
}

// ==================== Stats API ====================

/**
 * Get stats for a circle
 */
export async function fetchCircleStats(circleId) {
  return apiRequest(`/circles/${circleId}/stats`);
}

/**
 * Get global stats
 */
export async function fetchGlobalStats() {
  return apiRequest("/stats");
}

// ==================== Health Check ====================

/**
 * Check if the API is available
 */
export async function checkHealth() {
  try {
    const result = await apiRequest("/health");
    return result.ok;
  } catch (err) {
    console.error("API health check failed:", err);
    return false;
  }
}
