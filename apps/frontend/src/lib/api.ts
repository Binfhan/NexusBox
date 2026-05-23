const API_BASE = 'http://localhost:3000';

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

export async function uploadDocument(token: string, file: File, relativePath?: string, folderGroup?: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  if (relativePath) formData.append('relative_path', relativePath);
  if (folderGroup) formData.append('folder_group', folderGroup);
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

export async function getDocuments(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function getSharedDocuments(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/documents/shared-with-me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch shared documents');
  return res.json();
}

export async function shareDocument(token: string, docId: string, targetWallet: string, permission: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${docId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ targetWallet: targetWallet.toLowerCase(), permission }),
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

export async function chatWithDocument(
  token: string,
  docId: string,
  chatHistory: any[],
  userMessage: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/documents/${docId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ chatHistory, userMessage }),
  });
  if (!res.ok) throw new Error('Chat failed');
  const data = await res.json();
  return data.answer;
}

export async function compareDocuments(token: string, id1: string, id2: string): Promise<string> {
  const res = await fetch(`${API_BASE}/documents/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
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
