# DocVault - Project Feature Overview

> **Web3-powered Document Intelligence Platform** — AI analysis, IPFS storage, blockchain anchoring, smart contract access control.

---

## 1. Authentication

| Feature | Details |
|---------|---------|
| **Web3 Wallet Auth** | MetaMask connect → fetch nonce → sign message → verify signature → receive JWT |
| **JWT** | 7-day expiry, Passport strategy |
| **Auto-registration** | First connection auto-creates user with Free plan (200MB), unique 6-digit User ID |
| **Nonce-based** | Prevents replay attacks |

---

## 2. Frontend Pages

### Home (`/`, `/home`)
- Hero section with 3D InteractiveCube
- Features section (Security, AI Verification, Blockchain, Ease of Use)
- Highlight section + Stats (1.2M+ docs, 99.9% uptime, 50k+ users)
- Header with nav + wallet connect, Footer with links

### Dashboard (`/dashboard`)
- 3 main tabs: **Dashboard**, **My Documents**, **AI Analysis**
- Collapsible sidebar with navigation modes
- Storage meter + plan badge + wallet display

---

## 3. Dashboard Tab

- **StatsCards**: Total docs, AI verified, storage used, plan name
- **UploadBox**: Drag-drop / file picker, folder upload toggle, multi-step UI
- **FilterChips**: All, PDF, Image, AI Verified, Pending
- **Document table** with folder grouping, sort by date
- **Document detail panel**: title, CID, AI summary, On-Chain/Share buttons
- **ActivityFeed**: Recent timeline (upload, share, verify, lock events)

---

## 4. My Documents Tab

### View Modes
- **Grid view** — cards with icon, type badge, action buttons on hover
- **Table view** — columns: Name, Type, Size, Date, Actions

### Navigation Modes (sidebar)
- **All** — default root folder view
- **Favorites** — starred documents
- **Recent** — recently updated documents
- **Trash** — soft-deleted with Restore option

### Folder System
- **Folder entities** (real folders via API): create, list, navigate with breadcrumb
- **Virtual folder groups** (from upload grouping): grouped by `folder_group`
- Tree expand on folder cards to show contained files
- Breadcrumb: `Dashboard / Folder / Subfolder`

### Document Operations
| Action | Description |
|--------|-------------|
| Upload | Single file, multiple files, folder via `webkitdirectory` |
| Preview | FilePreviewModal — images, PDFs, folder tree, metadata |
| Star/Unstar | Toggle favorite status |
| Share | ShareDialog — target wallet or User ID, permissions, expiry, password |
| Store On-Chain | MetaMask → DocVaultStorage contract |
| Delete | Soft-delete to trash |
| Restore | From trash back to active |
| Search | Full-text on title + AI summary |
| Right-click menu | Context menu with all actions |

### Sharing
- **Shared with me** section — documents shared by others
- **Permission levels**: viewer, commenter, editor, owner
- **Password protection** + expiration
- **Share revocation**
- **User ID lookup** (6-digit numeric)

---

## 5. AI Analysis Tab

| Feature | Description |
|---------|-------------|
| **AI Chat** | Conversational Q&A with document context |
| **Deep Analysis** | Summary, key points, risk, sentiment, recommendations |
| **Clause Extraction** | Penalty, duration, pricing, rights, termination clauses |
| **Edit Suggestions** | Section-level with priority (high/medium/low) + rationale |
| **Document Comparison** | Highlight differences between two documents |

### Backend AI (GeminiService)
- Model: `gemini-2.0-flash`
- Circuit breaker (3 errors → 5min block)
- Retry with exponential backoff
- Graceful fallback with Vietnamese messages
- Analysis triggers automatically on upload

---

## 6. Command Palette

- Trigger: `Ctrl+K`
- Actions: Upload Document, View Recent, Connect Wallet

---

## 7. Backend API

### Auth (`/auth`)
| Endpoint | Description |
|----------|-------------|
| `POST /auth/nonce` | Generate nonce for wallet |
| `POST /auth/verify` | Verify signature, return JWT |
| `GET /auth/user/:userId` | Resolve User ID → wallet |
| `GET /auth/profile` | Get authenticated user profile |

### Documents (`/documents`)
| Endpoint | Description |
|----------|-------------|
| `POST /documents/upload` | Upload file → AI analysis → IPFS → DB |
| `GET /documents` | List (by folder, starred, recent, deleted) |
| `GET /documents/search?q=` | Search by title + AI summary |
| `GET /documents/shared-with-me` | Documents shared to current user |
| `GET /documents/storage-info` | Storage limits and usage |
| `DELETE /documents/:id` | Soft-delete |
| `POST /documents/:id/restore` | Restore from trash |
| `PATCH /documents/:id/star` | Toggle star |
| `PATCH /documents/:id/move` | Move to folder |
| `GET /documents/:id/versions` | Version history |
| `POST /documents/:id/share` | Create share |
| `GET /documents/:id/shares` | List shares |
| `POST /documents/share/:shareId/verify-password` | Verify share password |
| `DELETE /documents/share/:shareId` | Revoke share |
| `POST /documents/:id/chat` | AI chat with document |
| `POST /documents/compare` | AI compare two documents |
| `GET /documents/:id/clauses` | Extract clauses (AI) |
| `GET /documents/:id/analysis` | Deep AI analysis |
| `GET /documents/:id/edit-suggestions` | AI edit suggestions |

### Folders (`/folders`)
| Endpoint | Description |
|----------|-------------|
| `POST /folders` | Create folder |
| `GET /folders` | List (by parent) |
| `GET /folders/:id` | Get single folder |
| `GET /folders/:id/breadcrumb` | Breadcrumb path |
| `PATCH /folders/:id` | Rename |
| `PATCH /folders/:id/move` | Move folder |
| `DELETE /folders/:id` | Delete empty folder |
| `DELETE /folders/:id/recursive` | Recursive delete |

---

## 8. Storage & IPFS

- **Pinata** SDK for IPFS uploads
- **Plan-based limits**: max_bytes + max_docs per plan
- **Storage tracking**: `storage_used` updated on upload/permanent delete
- **Fallback**: dummy hash on Pinata failure
- **File content** stored as base64 in DB for preview

---

## 9. Database Entities

| Entity | Key Fields |
|--------|------------|
| **User** | wallet_address (PK), user_id (6-digit), nonce, plan_id, storage_used, storage_limit |
| **Plan** | name, max_bytes, max_docs, price_usd |
| **Document** | id, title, cid, wallet_address, folder_group, mime_type, file_size, ai_summary, tags, is_ai_verified, is_onchain, is_starred, status, parent_folder_id, deleted_at |
| **Folder** | id, name, parent_id, owner_wallet |
| **DocumentShare** | document, folder, permissions (enum), expires_at, password, token, active |
| **DocumentVersion** | document_id, version_num, ipfs_cid, tx_hash |

---

## 10. Smart Contracts (Solidity)

### DocVaultStorage
- Core metadata registry: `storeDocument`, `updateMetadata`, `removeDocument`
- CID-based O(1) lookup, immutable CID key
- Ownable + Pausable

### DocVaultAccess
- Granular access grants: `grantAccess`, `extendAccess`, `revokeAccess`
- Expiry + download permission
- Payment-linked grant flow
- Emergency revoke-all

### DocVaultPayment
- ETH document sales: `setPrice`, `purchaseAccess`
- Revenue split: 97.5% owner / 2.5% platform (configurable, max 10%)
- CEI pattern + Reentrancy Guard
- Excess refund, pull-payment for platform fees

### DocVaultSigning
- Multi-party signing sessions: `createSigningSession`, `sign`
- On-chain ECDSA `ecrecover` verification
- Auto-finalization, session cancellation
- O(1) signer lookup

### DocNFT
- Soulbound NFT per verified CID
- On-chain metadata (data URI with IPFS link)
- Transfer-restricted (no transfer/approve)

---

## 11. Blockchain Integration

| Step | Description |
|------|-------------|
| **Frontend** | Direct MetaMask tx via ethers.js → `storeDocument()` |
| **Backend** | Listens for `DocumentStored` events → auto-tags `is_onchain = true` |
| **Event Listener** | Ethers.js JSON-RPC provider, circuit breaker if misconfigured |

---

## 12. File Preview System

- **Images**: Embedded base64 via `<img>`
- **PDFs**: Embedded via `<embed>` with base64 data URI
- **Folders**: Recursive tree view with expandable subfolders
- **Metadata panel**: type, size, date, CID, AI verification, on-chain status, tags, shared-by info
- **Fallback**: "No preview available" for unsupported types

---

## 13. UI/UX Features

- Responsive grid layout (1–4 columns)
- Dark theme (zinc/amber palette)
- Hover-reveal action buttons
- Selected item highlighting
- Favorite items: amber border/background highlight
- Breadcrumb navigation with Dashboard root link
- Empty state messages per mode
- Loading spinners for async operations
- Password verification overlay
- Right-click context menu
