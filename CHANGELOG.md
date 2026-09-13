# Lịch sử thay đổi

## 2026-09-13 — Nhà và kho có thể xây

Thêm nhà nhỏ (6 gỗ/2 đá, thêm hai chỗ ở) và kho cá nhân (4 gỗ/2 đá, chứa 80 đơn vị). Có chọn ô trên bản đồ, báo lỗi vị trí và cất/lấy tài nguyên. Máy chủ kiểm tra vật liệu, quyền sở hữu và đường đi; bảo toàn save cũ. 21 kiểm thử mô phỏng/API đạt, gồm tranh ô xây và gửi lại lệnh.

## 2026-09-12 — Staging và kiểm thử giao diện

Bổ sung Worker/D1, transaction CAS chống mất cập nhật giữa instance, migration và build cho Sites. Bản đồ 2D tự thay thế khi không có WebGL. Sửa mã lệnh trong preview HTTP và giữ nút thao tác ổn định qua heartbeat. 14 kiểm thử mô phỏng/API đạt; kiểm tra trực quan desktop và chuỗi xây cầu/giao thức ăn đã chạy trên preview.

## 2026-09-12 — Prototype gameplay 0.1

Thêm client 3D trực giao và máy chủ Node.js/SQLite. Nối thu thập → sửa cầu → vận chuyển thức ăn, cùng cống tưới → ruộng/cá → nghề và di cư NPC → Chronicle. Bổ sung kiểm thử lệnh lặp, tranh vật phẩm, save/restart và chuỗi chơi qua HTTP; cấu hình CI, Docker và hướng dẫn vận hành.

Đây là thử nghiệm nền tảng đầu tiên, chưa nghiệm thu MVP, chưa triển khai hosting và chưa xác minh giao diện bằng trình duyệt. Bộ thiết kế v0.1 cùng các bản xuất vẫn là tài liệu mục tiêu; không sửa chúng để coi phạm vi thử nghiệm nhỏ hơn là MVP hoàn tất.

## 2026-09-11 — Game Design Bible v0.1

Bổ sung 117 mục theo cấu trúc concept, chia thành năm chương có thể đọc trực tiếp trên GitHub. Tài liệu xác định luật nhân vật, xây dựng, hậu cần, sinh thái, NPC, kinh tế, tri thức, offline và lưu trữ; kèm 20 tình huống phát sinh, bản đồ tương tác, sổ quyết định và tiêu chí prototype.

Giới hạn MVP ở một vùng 512 × 512 m, hai khu định cư và một chuỗi hậu quả hoàn chỉnh. Chốt homestead bảo hộ thường trực, tối đa 72 giờ mô phỏng khi cả nhóm vắng, sản xuất offline bằng tín dụng có giới hạn, danh tính bền vững và sổ giao dịch chống nhân đôi. Tiến hóa, chiến tranh và các đại dự án đắt được tách khỏi cam kết ban đầu.

Rà soát phạm vi, mốc thời gian, bảo toàn vật tư, quyền bàn giao và sự nhất quán giữa các chương. Tài liệu mô tả thiết kế dự kiến; chưa triển khai game hoặc chạy benchmark hiệu năng.

Bổ sung bản Markdown tổng hợp và bản Word có mục lục, số trang và bảng định dạng để đọc, chỉnh sửa và chia sẻ. Các bản xuất dùng cùng nội dung với năm chương trong thư mục `docs/`.

## 2026-09-11 — Khởi tạo repository

Tạo phần giới thiệu tiếng Việt và tiếng Anh, chỉ mục tài liệu và quy tắc đóng góp trước khi bắt đầu viết Game Design Bible. The Unfinished Earth là tên làm việc; trạng thái dự án là tiền sản xuất.
