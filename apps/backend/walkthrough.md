# DocVault Backend - Phase 1 MVP Walkthrough

Cảm ơn bạn đã phê duyệt kế hoạch. Tôi đã hoàn thành việc xây dựng **Phase 1 (MVP)** cho backend của DocVault. Dưới đây là các tính năng đã được triển khai:

## 1. Cấu hình Database
- Đã cấu hình kết nối **PostgreSQL** với **TypeORM**.
- Định nghĩa 2 entity cốt lõi:
  - `User`: Lưu trữ thông tin người dùng (`wallet_address`, `nonce` dùng cho xác thực).
  - `Document`: Lưu trữ metadata của tài liệu (`id`, `wallet_address`, `title`, `cid`, `ai_summary`, `tags`, `is_ai_verified`, `is_onchain`).

## 2. Xác thực Web3 (Auth Module)
Triển khai cơ chế xác thực bằng ví tiền mã hóa (như MetaMask), không cần mật khẩu:
- `GET /auth/nonce/:wallet_address`: Trả về một chuỗi ngẫu nhiên (`nonce`) cho người dùng ký.
- `POST /auth/verify`: Nhận chữ ký từ Frontend, sử dụng `ethers.verifyMessage` để xác thực xem người ký có đúng là chủ ví hay không. Nếu hợp lệ, hệ thống sẽ cấp một JWT Token.

## 3. Xử lý tài liệu (Documents Module)
Cốt lõi của hệ thống - Tích hợp AI và IPFS:
- `POST /documents/upload`: 
  1. Nhận file upload.
  2. Gửi văn bản trong file cho **Anthropic AI (Claude 3.5 Sonnet)** để lấy tóm tắt, tự động tạo thẻ tags, và kiểm tra tính an toàn (loại bỏ mã độc/spam).
  3. Sau khi AI duyệt, upload file lên mạng lưới lưu trữ phi tập trung **IPFS thông qua Pinata SDK**.
  4. Lưu toàn bộ metadata vào cơ sở dữ liệu PostgreSQL.
- `GET /documents`: Trả về danh sách tất cả tài liệu của người dùng đang đăng nhập.

## 4. Lắng nghe Smart Contract (Blockchain Module)
- Xây dựng `BlockchainService` sử dụng `ethers.JsonRpcProvider`.
- Dịch vụ này tự động lắng nghe sự kiện `DocumentStored` từ Smart Contract `DocVaultStorage.sol`. 
- Ngay khi bạn lưu thành công CID lên Blockchain qua Frontend, sự kiện sẽ được bắn ra. Backend bắt được sự kiện này, đối chiếu `offchainId`, và tự động đánh dấu tài liệu là `is_onchain = true` trong database.

## Các bước tiếp theo để chạy thử (Local)
1. Bạn có thể thay đổi các thông số cấu hình như `DB_PASSWORD`, `RPC_URL`, `DOCVAULT_STORAGE_ADDRESS`, `ANTHROPIC_API_KEY`, và `PINATA_JWT` trong file `.env` ở thư mục backend.
2. Mở terminal tại thư mục backend (`c:\ALStorageBox\apps\backend`) và chạy lệnh `npm run start:dev`.

> [!TIP]
> Hệ thống Backend đã build thành công 100% không còn lỗi. Bạn đã sẵn sàng để phát triển Frontend hoặc thử nghiệm API với Postman/Swagger!


DocVault - Phase 2 (Intelligence) Walkthrough
Tôi đã hoàn thành việc triển khai Phase 2 (Intelligence) cho cả Backend và Frontend của DocVault. Dưới đây là chi tiết các thay đổi:

1. Cải tiến Database & Backend API
Lưu trữ văn bản gốc: Bảng documents đã được bổ sung cột content_text để lưu trực tiếp nội dung văn bản sau khi đọc từ file, phục vụ cho việc hỏi đáp và trích xuất.
API Hỏi Đáp (Smart Q&A):
POST /documents/:id/chat nhận câu hỏi của người dùng và lịch sử chat, gửi kèm nội dung tài liệu gốc đến Anthropic Claude để trả lời chính xác dựa trên ngữ cảnh tài liệu.
API So sánh tài liệu (Compare):
POST /documents/compare cho phép so sánh hai tài liệu và chỉ ra các điểm khác biệt, sửa đổi quan trọng bằng markdown.
API Trích xuất điều khoản (Key Clause Extraction):
GET /documents/:id/clauses tự động trích xuất các điều khoản quan trọng (thời hạn, phạt vi phạm, thanh toán...) thành danh sách ngắn gọn.
2. Giao diện người dùng (React, TypeScript & TailwindCSS)
Giao diện đã được nâng cấp thành một Dashboard hoàn chỉnh và chuyên nghiệp:

Xác thực ví Web3 (Auth Flow):
Nút Kết nối ví tại Header. Khi người dùng click, hệ thống yêu cầu MetaMask đăng nhập, lấy nonce từ Backend, yêu cầu ký và gửi chữ ký để xác thực lấy JWT Token lưu vào localStorage.
Bảng điều khiển (Dashboard):
Danh sách tài liệu: Hiển thị toàn bộ tài liệu đã tải lên kèm theo tags, tóm tắt tự động, và nhãn trạng thái On-Chain / Off-Chain.
Kéo thả / Upload: Hộp thoại upload file nhanh chóng tích hợp trực tiếp vào sidebar.
Trò chuyện với tài liệu (AI Chat Panel):
Khi click chọn 1 tài liệu, thanh AI Chat bên phải sẽ mở ra cho phép hỏi đáp trực tiếp (ví dụ: "Khi nào hợp đồng hết hạn?") với câu trả lời được sinh ra theo thời gian thực.
Nút Trích xuất điều khoản hiển thị trực tiếp danh sách điều khoản quan trọng ngay phía trên hộp chat.
Tương tác On-Chain (Blockchain integration):
Nếu tài liệu chưa được lưu On-Chain (Off-Chain), nút Lưu Proof On-Chain sẽ hiển thị. Khi click, frontend sử dụng ethers để gọi hàm storeDocument của Smart Contract qua ví MetaMask. Sau khi giao dịch được xác nhận, backend bắt sự kiện và tự động cập nhật trạng thái sang On-Chain.
Giao diện So sánh tài liệu:
Tab So sánh tài liệu AI cho phép chọn nhanh 2 tài liệu từ danh sách dropdown và hiển thị kết quả phân tích so sánh side-by-side chi tiết.
Cách chạy thử dự án
Khởi chạy Backend:
cd c:\ALStorageBox\apps\backend
npm run start:dev
Khởi chạy Frontend:
cd c:\ALStorageBox\apps\frontend
npm run dev
Đảm bảo ví MetaMask của bạn được kết nối với mạng thử nghiệm (Localhost hoặc Testnet tương ứng với cấu hình trong .env).
TIP

Cả 2 phần Backend và Frontend đã được build hoàn chỉnh không có lỗi biên dịch. Bạn có thể tiến hành test thử các luồng hoạt động trực quan bằng trình duyệt!