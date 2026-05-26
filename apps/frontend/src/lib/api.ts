const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchNonce(walletAddress: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_address: walletAddress }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch nonce');
  }
  const data = await res.json();
  return data.nonce;
}

export async function verifySignature(walletAddress: string, signature: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_address: walletAddress, signature }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Verification failed');
  }
  const data = await res.json();
  return data.access_token;
}

export async function getProfile(token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function updateProfile(token: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

export async function uploadAvatar(token: string, avatarUrl: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/profile/avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ avatar_url: avatarUrl }),
  });
  if (!res.ok) throw new Error('Failed to upload avatar');
  return res.json();
}

export async function deleteAvatar(token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/profile/avatar`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete avatar');
  return res.json();
}

export async function resolveEns(address: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/resolve-ens/${address}`);
  if (!res.ok) return { ens_name: null };
  return res.json();
}

export async function uploadDocument(token: string, file: File, relativePath?: string, folderGroup?: string, parentFolderId?: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  if (relativePath) formData.append('relative_path', relativePath);
  if (folderGroup) formData.append('folder_group', folderGroup);
  if (parentFolderId) formData.append('parent_folder_id', parentFolderId);
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function deleteDocument(token: string, docId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Delete failed');
  return res.json();
}

export async function getDocuments(token: string, folderId?: string): Promise<any[]> {
  const params = folderId ? `?folder_id=${folderId}` : '';
  const res = await fetch(`${API_BASE}/documents${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function getStarredDocuments(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/documents?starred=true`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch starred documents');
  return res.json();
}

export async function getRecentDocuments(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/documents?recent=true`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch recent documents');
  return res.json();
}

export async function getTrashDocuments(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/documents?deleted=true`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch trash documents');
  return res.json();
}

export async function searchDocuments(token: string, query: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/documents/search?q=${encodeURIComponent(query)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function toggleStar(token: string, docId: string, starred: boolean): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${docId}/star`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ starred }),
  });
  if (!res.ok) throw new Error('Toggle star failed');
  return res.json();
}

export async function moveDocument(token: string, docId: string, parentFolderId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${docId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ parent_folder_id: parentFolderId || null }),
  });
  if (!res.ok) throw new Error('Move failed');
  return res.json();
}

export async function restoreDocument(token: string, docId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${docId}/restore`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Restore failed');
  return res.json();
}

export async function getSharedDocuments(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/documents/shared-with-me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch shared documents');
  return res.json();
}

export async function shareDocument(token: string, docId: string, targetWallet: string, permission: string, expiresAt?: string, password?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${docId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ targetWallet: targetWallet.toLowerCase(), permission, expiresAt, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Share failed');
  }
  return res.json();
}

export async function getSharesByDocument(token: string, docId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/documents/${docId}/shares`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch shares');
  return res.json();
}

export async function verifySharePassword(token: string, shareId: string, password: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/share/${shareId}/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Sai mật khẩu');
  }
  return res.json();
}

export async function revokeShare(token: string, shareId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/share/${shareId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to revoke share');
  return res.json();
}

export async function getStorageInfo(token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/storage-info`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch storage info');
  return res.json();
}

export async function getDocumentVersions(token: string, docId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/documents/${docId}/versions`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch versions');
  return res.json();
}

export async function chatWithDocument(token: string, docId: string, chatHistory: any[], userMessage: string): Promise<string> {
  const res = await fetch(`${API_BASE}/documents/${docId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ chatHistory, userMessage }),
  });
  if (!res.ok) throw new Error('Chat failed');
  const data = await res.json();
  return data.answer;
}

export async function compareDocuments(token: string, id1: string, id2: string): Promise<string> {
  const res = await fetch(`${API_BASE}/documents/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ id1, id2 }),
  });
  if (!res.ok) throw new Error('Comparison failed');
  const data = await res.json();
  return data.comparison;
}

export async function getClauses(token: string, docId: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/documents/${docId}/clauses`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to extract clauses');
  const data = await res.json();
  return data.clauses;
}

export async function getAIAnalysis(token: string, docId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${docId}/analysis`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to get AI analysis');
  return res.json();
}

export async function getEditSuggestions(token: string, docId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${docId}/edit-suggestions`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to get edit suggestions');
  return res.json();
}

// ── Folder APIs ──
export async function createFolder(token: string, name: string, parentId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name, parent_id: parentId }),
  });
  if (!res.ok) throw new Error('Create folder failed');
  return res.json();
}

export async function getFolders(token: string, parentId?: string): Promise<any[]> {
  const params = parentId ? `?parent_id=${parentId}` : '';
  const res = await fetch(`${API_BASE}/folders${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch folders');
  return res.json();
}

export async function getFolderBreadcrumb(token: string, folderId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/folders/${folderId}/breadcrumb`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch breadcrumb');
  return res.json();
}

export async function renameFolder(token: string, folderId: string, name: string): Promise<any> {
  const res = await fetch(`${API_BASE}/folders/${folderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Rename folder failed');
  return res.json();
}

export async function moveFolder(token: string, folderId: string, parentId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/folders/${folderId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ parent_id: parentId }),
  });
  if (!res.ok) throw new Error('Move folder failed');
  return res.json();
}

export async function deleteFolder(token: string, folderId: string, recursive?: boolean): Promise<any> {
  const url = recursive ? `${API_BASE}/folders/${folderId}/recursive` : `${API_BASE}/folders/${folderId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Delete folder failed');
  return res.json();
}
