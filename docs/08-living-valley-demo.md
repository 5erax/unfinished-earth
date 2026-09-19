# Demo: Thung lũng đang sống

Bản cập nhật ngày 20/09/2026 cho game Node/SQLite và Worker/D1 hiện có. Không chuyển backend hoặc thay cơ sở dữ liệu. Theo yêu cầu, đợt này không chạy kiểm thử tự động, build hay kiểm thử trình duyệt; các kết quả kiểm thử của bản trước không đại diện cho bản này.

## Chơi bản demo

Chạy `npm start`, mở `http://127.0.0.1:3000`. Bấm **Thung lũng** để xem thức ăn đủ bao nhiêu ngày, sản xuất/tiêu thụ ở bữa gần nhất, chỗ ở và từng cư dân. Bấm tên địa điểm trong phần **Nhịp sống hôm nay** để tìm nơi đang cần giúp.

- Xe lấy tối đa 8 khẩu phần khỏi kho, đi theo tuyến đến làng rồi quay về. Mỗi chặng mất 2 ngày game; chờ ở kho 3 giờ game trước chuyến mới. Làng chỉ nhận hàng khi xe đến nơi.
- Trong bảng Thung lũng, có thể tạm dừng/tiếp tục xe, chọn làng nhận khi xe rỗng ở kho, hoặc góp thức ăn từ túi. Nhân vật tự đến kho nếu đang ở xa. Di chuyển bằng tay hủy yêu cầu đang chờ.
- Hàng được giữ trên xe khi dừng hoặc đường bị chặn. Tín dụng offline chỉ trả cho thời gian xe được hoạt động; hết tín dụng dừng ngay trong chặng. Sinh kế cơ bản của dân làng vẫn tiếp tục trong giới hạn mô phỏng offline.
- Khẩu phần thiếu được chia cho người đói lâu trước, luân phiên khi bằng nhau. Nguồn cá bị giảm bởi lượng đánh bắt; trồng trọt phụ thuộc độ ẩm. Thông số là cân bằng game, không phải mô hình khoa học đã hiệu chỉnh.
- Dân có thể đổi nghề khi sinh kế khác tốt hơn và đã thiếu ăn; mỗi người chờ ít nhất 5 ngày giữa lần đổi nghề. Chuyển làng cần đường qua cầu, giường trống, dự trữ tốt hơn và ít nhất 7 ngày giữa lần chuyển. Tối đa một người rời mỗi làng trong một ngày; danh tính không bị tạo lại.
- Nhấp NPC trên bản đồ để đọc tên, nghề và lý do quyết định. Hình điệu bộ quanh làng là trang trí; đổi nơi ở xảy ra tại ranh giới ngày, chưa có hành trình đi bộ của từng NPC.
- Biên niên sử có bộ lọc và cửa sổ câu chuyện. Các liên kết nguyên nhân lấy từ sự kiện máy chủ; người chơi có thể lần ngược và mở địa điểm trên bản đồ.
- Hành trình hướng dẫn tiếp tục tới xây nhà, xây kho và khám phá tàn tích; bản đồ bổ sung nhận diện nghề và sắc độ ngày/đêm.

## Lưu dữ liệu

Thêm trường vào save cũ theo giá trị mặc định; giữ schema version 1, ID nhân vật, số hàng và phiên đăng nhập. Tiến độ xe dạng ngày cũ được đổi sang khoảng cách trên tuyến khi thế giới được xử lý tiếp. Không nhập save demo vào site, không thay quyền truy cập Sites. Các trường giao dịch vẫn được máy chủ lưu qua cơ chế snapshot và biên nhận hiện có.

Chưa mở rộng kỹ năng riêng cho ba nghề còn lại hoặc thay lớp mô phỏng TypeScript/PostgreSQL. Đợt này tập trung phần chơi được và UI; không công bố kết quả nghiệm thu hoặc độ ổn định mới.
