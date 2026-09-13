# The Unfinished Earth

**Sandbox co-op trên web, nơi sinh thái, cộng đồng và lịch sử cùng thay đổi theo hành động của người chơi.**

[English](README.en.md) · [Tài liệu thiết kế](docs/README.md) · [Cách đóng góp](CONTRIBUTING.md)

## Dự án là gì

The Unfinished Earth là tên làm việc của một ý tưởng game diễn ra khoảng 300 năm sau sự sụp đổ của nền văn minh cũ. Người chơi điều khiển một nhân vật, khám phá, xây dựng và tổ chức hậu cần trong một thế giới có khả năng lưu trạng thái lâu dài. Một con đường, khu rừng bị khai thác hay công trình dẫn nước có thể thay đổi cuộc sống của cả cộng đồng và trở thành lịch sử của thế giới đó.

Game hướng đến chơi solo và co-op PvE trong các thế giới riêng, với mục tiêu 1–8 người. Trọng tâm là quan hệ nhân quả giữa hệ sinh thái, xã hội NPC và lịch sử; chiến đấu đóng vai trò phụ.

## Trạng thái hiện tại

**Đã có prototype gameplay 0.1 trên nhánh này. Chưa đạt MVP đầy đủ và chưa có benchmark hiệu năng.**

Prototype gồm một vùng 3D dạng greybox, thu thập, sửa cầu, cống tưới, cây trồng, nhà và kho đặt trên bản đồ, xe giao hàng, 24 NPC và Chronicle. Máy chủ Node.js quyết định trạng thái; SQLite lưu world và biên nhận lệnh. Xem [hướng dẫn chạy và giới hạn](docs/06-playable-prototype.md).

### Chạy thử

Cài Node.js 24 trở lên, sau đó:

```sh
npm ci
npm start
```

Mở `http://127.0.0.1:3000`. Dùng danh sách địa điểm để đi đến nguồn gỗ/đá, thu thập **8 gỗ + 4 đá**, sửa cầu rồi lấy thức ăn từ kho và giao cho Làng Hạ. `npm test` chạy kiểm thử mô phỏng và API.

Đồng hồ prototype mặc định **×30** (một ngày game = một phút thực). Đặt `SIM_SPEED=1` để dùng nhịp 30 phút/ngày của thiết kế. Dữ liệu nằm trong `data/world.sqlite`; giữ thư mục này qua lần chạy lại.

Có [Docker Compose](compose.yaml) cho một máy chủ với ổ dữ liệu bền vững. Có thêm adapter Cloudflare Workers/D1 cho bản staging trên Sites; xem phần staging trong hướng dẫn.

Game Design Bible v0.1 gồm 117 mục, 20 tình huống phát sinh, bản đồ tương tác hệ thống, phạm vi MVP và kế hoạch kiểm chứng. Các con số về quy mô, hiệu năng và tiến độ là mục tiêu hoặc giả định cần thử nghiệm, chưa phải kết quả đo.

Repository và README được công bố ở commit khởi tạo trước khi viết tài liệu chi tiết.

## Hướng thiết kế

- Thế giới lưu trạng thái và ghi lại các sự kiện có nguyên nhân, địa điểm và hậu quả.
- Xây dựng tác động đến nước, tài nguyên, sinh kế và quan hệ giữa các cộng đồng.
- NPC và quần thể động vật tiếp tục phát triển thông qua mô phỏng với mức chi tiết phù hợp.
- Người vắng mặt được bảo vệ khỏi mất căn cứ chỉ vì không đăng nhập; sản xuất offline có giới hạn.
- Prototype nhỏ chứng minh một chuỗi tương tác hoàn chỉnh trước khi mở rộng nội dung.

Persistence không đồng nghĩa với mô phỏng mọi cá thể toàn thời gian. Thiết kế sẽ dùng máy chủ quyết định trạng thái, mô phỏng vùng, lưu dữ liệu và cập nhật bù có giới hạn. Không cam kết thế giới vô hạn, nội dung vô tận hoặc dịch vụ vận hành vĩnh viễn.

## Cấu trúc

| Đường dẫn | Nội dung |
| --- | --- |
| `README.md` | Giới thiệu dự án bằng tiếng Việt |
| `README.en.md` | English project overview |
| `docs/README.md` | Điểm bắt đầu và chỉ mục bộ tài liệu |
| `docs/01-vision-and-player.md` | Tầm nhìn, nhân vật, xây dựng và hậu cần |
| `docs/02-world-and-ecology.md` | Thế giới, nước, hệ sinh thái và tài nguyên |
| `docs/03-society-and-knowledge.md` | NPC, cộng đồng, kinh tế và tri thức |
| `docs/04-persistence-and-production.md` | Co-op, offline, kiến trúc và kế hoạch sản xuất |
| `docs/05-scenarios-and-validation.md` | Kịch bản, quyết định và tiêu chí kiểm chứng |
| `exports/` | Bản tài liệu tổng hợp để đọc và chia sẻ |
| `CONTRIBUTING.md` | Quy tắc đề xuất và sửa thiết kế |
| `CHANGELOG.md` | Lịch sử các mốc tài liệu |

## Bước tiếp theo

Đọc [phạm vi MVP](docs/04-persistence-and-production.md#99-mvp-scope), kiểm tra giả định nhân lực và làm prototype một vùng. Chuỗi cần chứng minh: xây dựng → nước/đường → nguồn thức ăn → quyết định NPC → lịch sử. Prototype 0.1 là bước thử kiến trúc ban đầu; các khoảng cách tới MVP và thứ tự công việc tiếp theo được ghi trong [kế hoạch triển khai](docs/06-playable-prototype.md#khoảng-cách-tới-mvp).

## Quyền sử dụng

Chưa chọn giấy phép phân phối. Việc có quyền truy cập repository không tự cấp quyền tái sử dụng hoặc phân phối tài liệu và tài sản của dự án.
