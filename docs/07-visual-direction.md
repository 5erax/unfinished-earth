# Định hướng đồ họa: thung lũng pixel

Mục tiêu là một thế giới nhìn từ trên xuống, màu sắc rõ ràng, có thể nhận ra địa hình và hoạt động chỉ trong vài giây. [WorldBox](https://www.superworldbox.com/) là tham chiếu về cảm giác quan sát một thế giới pixel thu nhỏ. Dự án dùng bảng màu, hình vẽ Canvas và giao diện riêng; không nhập hoặc sao chép sprite, logo hay tài sản của WorldBox.

Đợt này thay cách thể hiện prototype hiện có và giữ di chuyển liên tục của bản cập nhật gameplay. Quy mô vùng, quy tắc đi lại, công thức xây dựng và quyết định mô phỏng vẫn nằm ở máy chủ; đây chưa phải bộ đồ họa hoàn chỉnh cho MVP.

## Màu sắc và cách đọc địa hình

| Thành phần | Hướng màu và hình | Mục đích |
| --- | --- | --- |
| Đồng cỏ, rừng | Xanh cỏ vừa; tán rừng xanh đậm, bóng gọn | Nền dịu để vật thể tương tác nổi lên; rừng có khối rõ |
| Nước | Xanh lam sâu ở lòng sông, xanh aqua ở mép | Nhận ra vùng không đi qua được và vị trí bờ |
| Bờ, đường | Cát ấm và đất nâu sáng | Phân biệt lối đi với nền cỏ mà không cần kẻ toàn bộ ô |
| Làng Thượng | Mái đất nung, tường sáng | Tạo dấu hiệu màu dễ nhớ cho làng |
| Làng Hạ | Mái đá phiến, tường sáng | Phân biệt hai cộng đồng cả khi ẩn nhãn |
| Người chơi | Điểm nhấn vàng, viền tối và dấu chọn | Tìm lại nhân vật khi cảnh có nhiều cây hoặc công trình |
| Giao diện | Nền tối, chữ sáng, điểm nhấn vàng có tiết chế | Đọc hành động và số liệu mà không lấn át bản đồ |

Giữ đúng lưới **32 × 32** và dòng sông thẳng ở **x = 15…17** của dữ liệu thế giới. Chi tiết bờ nước chỉ trang trí trong phạm vi ô; không vẽ lối qua sông, đảo hoặc nhánh đường gây hiểu nhầm về khả năng đi lại. Cầu, cống, ruộng và công trình của người chơi phải xuất hiện đúng tọa độ và phản ánh trạng thái thực.

Trật tự đọc hình: nền địa hình → đường/bờ → cây và kiến trúc → nhân vật/dấu chọn → nhãn. Dùng đốm cỏ, viên đá và gợn nước vừa đủ, tránh phủ nhiễu lên toàn bộ mỗi ô. Khi thu nhỏ, ưu tiên mảng màu và đường nét chính; khi phóng to, giữ cạnh pixel sắc nét.

## Hình dáng sprite và trạng thái

Cây dùng tán thành khối, thân ngắn, bóng lệch nhẹ; đá có mặt sáng/tối đơn giản. Nhà nhận diện bằng mái, cửa và bóng nền, với hình dáng nhất quán giữa cảnh và công cụ xây dựng. Nhân vật dùng đầu, thân và chân tách rõ để không lẫn với bụi cỏ. Tàn tích có đường nét đứt gãy và sắc đá trầm để khác công trình đang hoạt động.

Phân biệt trạng thái bằng **hình và màu cùng lúc**: cầu chưa sửa có phần bị gián đoạn; cầu hoàn thành nối bờ; ruộng thể hiện mức phát triển; mục đang chọn có dấu viền dễ thấy. Màu vàng dành chủ yếu cho người chơi, lựa chọn hoặc hành động chính. Chi tiết trang trí không được giả làm tài nguyên có thể thu thập hay NPC có thể tương tác.

## Giao diện và chuyển động

Bản đồ chiếm diện tích chính. Thông tin thế giới gọn ở phần đầu, công cụ góc nhìn đặt cạnh bản đồ, các nhóm địa điểm/hành động ở bảng bên. Trên màn hình hẹp, bố cục cần giữ được nút thao tác và vùng bản đồ, tránh các bảng che kín nhân vật.

Dùng **phông hệ thống hỗ trợ đầy đủ dấu tiếng Việt** cho nội dung và nút; hiệu ứng pixel thuộc về cảnh game. Tên địa điểm có thể bật/tắt. Dấu chọn và trạng thái focus phải còn rõ với bàn phím; nhãn hành động cần mô tả cụ thể việc sẽ làm và vật liệu cần dùng.

Gợn nước, nhịp sáng dấu chọn và các chuyển động nhỏ phục vụ việc quan sát. Nhân vật di chuyển liên tục bằng tọa độ lẻ trong lưới địa hình; client dự đoán rồi đối chiếu với phần đường được máy chủ xác nhận. Renderer hiển thị các tọa độ này và không tự quyết định vị trí đi được hoặc kết quả hành động. Không làm rung toàn bản đồ hay dùng hiệu ứng che mất trạng thái. Tôn trọng thiết lập giảm chuyển động của người dùng khi bổ sung hiệu ứng.

## Công việc đồ họa tiếp theo

1. Playtest chuỗi lấy vật liệu → sửa cầu → giao thức ăn với nhãn bật và tắt; kiểm tra người chơi có tìm đúng nhân vật, đường đi và mục tiêu không.
2. Hoàn thiện trạng thái hình của cầu, cống, ruộng và công trình; thêm phản hồi ngắn cho thao tác thành công hoặc bị từ chối theo kết quả máy chủ.
3. Bổ sung biến thể cây, đá và mái nhà theo quy tắc cố định, giữ vị trí tài nguyên thật và khả năng nhận diện hai làng.
4. Kiểm tra thu phóng, kéo bản đồ, chữ tiếng Việt và thao tác trên màn hình nhỏ; đo hiệu năng trên thiết bị mục tiêu trước khi tăng mật độ chi tiết.

Mỗi thay đổi hình ảnh cần được đối chiếu với thế giới đang lưu và chuỗi chơi thực. Chưa có benchmark hiệu năng hoặc kết luận rằng phần art/UI đã đạt tiêu chí MVP.
