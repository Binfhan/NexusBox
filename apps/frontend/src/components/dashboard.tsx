import React, { useState, useEffect } from 'react';
import { 
  getDocuments, 
  uploadDocument, 
  chatWithDocument, 
  compareDocuments, 
  getClauses 
} from '../lib/api';
import { ethers } from 'ethers';

// Standard Hardhat Localhost deployment or customizable address
const CONTRACT_ADDRESS = import.meta.env.VITE_DOCVAULT_STORAGE_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const CONTRACT_ABI = [
  "function storeDocument(string cid, string offchainId, bool aiVerified, bool isPublic, uint8 docType) external"
];

interface Document {
  id: string;
  title: string;
  cid: string;
  ai_summary: string;
  tags: string[];
  is_ai_verified: boolean;
  is_onchain: boolean;
  status: string;
  created_at: string;
}

interface DashboardProps {
  token: string;
  walletAddress: string;
}

export function Dashboard({ token, walletAddress }: DashboardProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'docs' | 'compare'>('docs');
  
  // Q&A State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Compare State
  const [compareId1, setCompareId1] = useState('');
  const [compareId2, setCompareId2] = useState('');
  const [compareResult, setCompareResult] = useState('');
  const [isComparing, setIsComparing] = useState(false);

  // Clauses State
  const [extractedClauses, setExtractedClauses] = useState<string[]>([]);
  const [isLoadingClauses, setIsLoadingClauses] = useState(false);

  // Load docs on mount/token change
  useEffect(() => {
    loadDocs();
  }, [token]);

  const loadDocs = async () => {
    try {
      const data = await getDocuments(token);
      setDocuments(data);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadDocument(token, file);
      await loadDocs();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Tải tài liệu lên thất bại!');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !chatMessage.trim()) return;

    const userMsg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      const answer = await chatWithDocument(token, selectedDoc.id, chatHistory, userMsg);
      setChatHistory(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      console.error('Chat failed:', err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Lỗi khi gửi tin nhắn.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!compareId1 || !compareId2) return;
    setIsComparing(true);
    setCompareResult('');
    try {
      const result = await compareDocuments(token, compareId1, compareId2);
      setCompareResult(result);
    } catch (err) {
      console.error('Comparison failed:', err);
      setCompareResult('So sánh thất bại.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleExtractClauses = async (docId: string) => {
    setIsLoadingClauses(true);
    setExtractedClauses([]);
    try {
      const clauses = await getClauses(token, docId);
      setExtractedClauses(clauses);
    } catch (err) {
      console.error('Failed to extract clauses:', err);
    } finally {
      setIsLoadingClauses(false);
    }
  };

  const handleStoreOnChain = async (doc: Document) => {
    if (!(window as any).ethereum) {
      alert('Vui lòng cài đặt ví Metamask!');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      alert(`Đang chuẩn bị ký giao dịch lưu trữ Proof cho CID: ${doc.cid}...`);

      const tx = await contract.storeDocument(
        doc.cid,
        doc.id,
        doc.is_ai_verified,
        false, // isPublic (mặc định false)
        0 // docType (mặc định 0 - contract)
      );

      alert(`Giao dịch đã được gửi! Hash: ${tx.hash}\nĐang chờ xác nhận...`);
      await tx.wait();
      alert('Lưu trữ On-Chain thành công! DB sẽ tự động cập nhật trạng thái.');
      loadDocs();
    } catch (err: any) {
      console.error('Store on-chain failed:', err);
      alert(`Giao dịch thất bại: ${err?.message || err}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
        <div className="mb-2">
          <h3 className="font-bold text-lg text-zinc-200">Bảng điều khiển</h3>
          <span className="text-[10px] text-zinc-500 font-mono block truncate mt-1">Ví: {walletAddress}</span>
        </div>
        <button 
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-3 w-full py-2 px-4 rounded-lg font-medium transition-all text-left ${activeTab === 'docs' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'}`}
        >
          📄 Danh sách tài liệu
        </button>
        <button 
          onClick={() => setActiveTab('compare')}
          className={`flex items-center gap-3 w-full py-2 px-4 rounded-lg font-medium transition-all text-left ${activeTab === 'compare' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'}`}
        >
          ⚖️ So sánh tài liệu AI
        </button>

        <div className="mt-8 border-t border-zinc-800 pt-6">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 hover:border-amber-500 rounded-xl p-4 cursor-pointer hover:bg-zinc-800/50 transition-all">
            <span className="text-zinc-400 text-sm mb-2">{isUploading ? 'Đang upload...' : 'Thêm tài liệu mới'}</span>
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="lg:col-span-9 flex flex-col gap-6">
        {activeTab === 'docs' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* List of Documents */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
              <h2 className="text-xl font-bold text-zinc-100">Tài liệu của tôi</h2>
              {documents.length === 0 ? (
                <div className="text-zinc-500 text-center py-8">Chưa có tài liệu nào. Vui lòng tải lên!</div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2">
                  {documents.map(doc => (
                    <div 
                      key={doc.id} 
                      onClick={() => {
                        setSelectedDoc(doc);
                        setChatHistory([]);
                        setExtractedClauses([]);
                      }}
                      className={`border rounded-lg p-4 cursor-pointer transition-all hover:bg-zinc-800/80 ${selectedDoc?.id === doc.id ? 'border-amber-500 bg-zinc-800/40' : 'border-zinc-800 bg-zinc-900'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-zinc-200 truncate max-w-[200px]">{doc.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${doc.is_onchain ? 'bg-green-500/25 text-green-400' : 'bg-amber-500/25 text-amber-400'}`}>
                          {doc.is_onchain ? 'On-Chain' : 'Off-Chain'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{doc.ai_summary}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {doc.tags?.map((t, idx) => (
                          <span key={idx} className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded">#{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document details / AI Panel */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-6">
              {selectedDoc ? (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-100 mb-1">{selectedDoc.title}</h2>
                    <span className="text-xs font-mono text-zinc-500">CID: {selectedDoc.cid}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {!selectedDoc.is_onchain && (
                      <button 
                        onClick={() => handleStoreOnChain(selectedDoc)}
                        className="bg-amber-500 text-zinc-950 font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-400 transition-all"
                      >
                        🔗 Lưu Proof On-Chain
                      </button>
                    )}
                    <button 
                      onClick={() => handleExtractClauses(selectedDoc.id)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium px-4 py-2 rounded-lg text-sm transition-all"
                      disabled={isLoadingClauses}
                    >
                      {isLoadingClauses ? 'Đang trích xuất...' : '🔑 Trích xuất điều khoản'}
                    </button>
                  </div>

                  {/* Clauses Section */}
                  {extractedClauses.length > 0 && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                      <h4 className="font-bold text-zinc-300 text-sm mb-2">Các điều khoản chính:</h4>
                      <ul className="list-disc pl-4 text-xs text-zinc-400 flex flex-col gap-1.5">
                        {extractedClauses.map((c, idx) => <li key={idx}>{c}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* AI Chat section */}
                  <div className="border-t border-zinc-800 pt-6">
                    <h3 className="font-bold text-zinc-200 text-base mb-3">💬 Trò chuyện với tài liệu (AI Chat)</h3>
                    <div className="flex flex-col gap-3 h-[250px] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs mb-3">
                      {chatHistory.length === 0 ? (
                        <span className="text-zinc-600 italic">Đặt câu hỏi: "Hợp đồng này hết hạn khi nào?"...</span>
                      ) : (
                        chatHistory.map((h, idx) => (
                          <div key={idx} className={`p-2 rounded-lg max-w-[85%] ${h.role === 'user' ? 'bg-amber-500/10 text-amber-200 self-end' : 'bg-zinc-800 text-zinc-300 self-start'}`}>
                            {h.content}
                          </div>
                        ))
                      )}
                      {isChatLoading && <span className="text-zinc-500 italic">AI đang trả lời...</span>}
                    </div>

                    <form onSubmit={handleSendChatMessage} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Nhập câu hỏi tại đây..." 
                        value={chatMessage}
                        onChange={e => setChatMessage(e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                        disabled={isChatLoading}
                      />
                      <button 
                        type="submit" 
                        className="bg-amber-500 text-zinc-950 font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-400"
                        disabled={isChatLoading}
                      >
                        Gửi
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-500 text-center py-12">Chọn một tài liệu bên trái để xem chi tiết & trải nghiệm các tính năng AI</div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-6">
            <h2 className="text-xl font-bold text-zinc-100">⚖️ So sánh tài liệu side-by-side</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Tài liệu thứ nhất</label>
                <select 
                  value={compareId1} 
                  onChange={e => setCompareId1(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
                >
                  <option value="">Chọn tài liệu 1</option>
                  {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Tài liệu thứ hai</label>
                <select 
                  value={compareId2} 
                  onChange={e => setCompareId2(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
                >
                  <option value="">Chọn tài liệu 2</option>
                  {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
            </div>

            <button 
              onClick={handleCompare}
              className="bg-amber-500 text-zinc-950 font-bold py-2 rounded-lg text-sm hover:bg-amber-400 mt-2"
              disabled={isComparing || !compareId1 || !compareId2}
            >
              {isComparing ? 'Đang so sánh...' : 'Bắt đầu so sánh'}
            </button>

            {compareResult && (
              <div className="mt-4 border-t border-zinc-800 pt-6">
                <h4 className="font-bold text-zinc-300 mb-3">Kết quả phân tích từ AI:</h4>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                  {compareResult}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
