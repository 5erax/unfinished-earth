# Đóng góp vào thiết kế

Mỗi đề xuất cần nêu vấn đề của người chơi, quy tắc thay đổi, các hệ thống bị tác động, chi phí triển khai và cách kiểm chứng. Dùng ví dụ cụ thể thay cho lời hứa về độ sâu hoặc quy mô.

Khi thay đổi một quyết định nền tảng, cập nhật mọi phần liên quan và ghi lý do trong lịch sử quyết định. Không thêm tính năng vào MVP nếu chưa nêu phần bị thay thế hoặc tác động tới nguồn lực.

Thông số cân bằng là giả thuyết để playtest. Phân biệt rõ dữ liệu đo được, mục tiêu thiết kế và ước lượng. Không đưa khóa truy cập, dữ liệu cá nhân hoặc tài sản chưa có quyền sử dụng vào repository.

Prototype chạy bằng Node.js 24+: `npm ci`, `npm start`; kiểm tra bằng `npm run check` và `npm test`. Mô phỏng nằm trong `src/world.js`, HTTP/session trong `src/server.js`, lưu trữ trong `src/store.js`, giao diện trong `public/`. Thay đổi gameplay phải nêu invariant bị ảnh hưởng và cập nhật kiểm thử có ý nghĩa. Không thay snapshot/save thật để kiểm thử. Xem `docs/06-playable-prototype.md` để phân biệt prototype đã triển khai với MVP còn phải nghiệm thu.
