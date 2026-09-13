# Đóng góp vào The Unfinished Earth

Mỗi đề xuất cần nêu vấn đề của người chơi, quy tắc thay đổi, các hệ thống bị tác động, chi phí triển khai và cách kiểm chứng. Dùng ví dụ cụ thể thay cho lời hứa về độ sâu hoặc quy mô.

Khi thay đổi một quyết định nền tảng, cập nhật mọi phần liên quan và ghi lý do trong lịch sử quyết định. Không thêm tính năng vào MVP nếu chưa nêu phần bị thay thế hoặc tác động tới nguồn lực.

Thông số cân bằng là giả thuyết để playtest. Phân biệt rõ dữ liệu đo được, mục tiêu thiết kế và ước lượng. Không đưa khóa truy cập, dữ liệu cá nhân hoặc tài sản chưa có quyền sử dụng vào repository.

## Đóng góp mã nguồn prototype

Scaffold architecture spike đã bắt đầu. Mọi PR mã nguồn nên:

- liên kết issue hoặc acceptance gate trong Game Design Bible;
- giữ simulation cốt lõi tách khỏi rendering và framework HTTP;
- coi world server là nguồn thẩm quyền cho inventory, ownership và world revision;
- giữ các thay đổi ledger/persistence có thể retry/idempotent;
- thêm test cho quy tắc deterministic hoặc invariant mới;
- không biến giả định hiệu năng thành “đã đạt” nếu chưa có benchmark;
- không mở rộng content breadth trước khi chuỗi MVP đang kiểm chứng hoạt động.

Xem `DEVELOPMENT.md` để chạy scaffold và `docs/architecture/0001-prototype-stack.md` để hiểu lý do chọn stack hiện tại.
