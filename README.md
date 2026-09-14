# The Unfinished Earth

**Sandbox co-op trên web, nơi sinh thái, cộng đồng và lịch sử cùng thay đổi theo hành động của người chơi.**

[English](README.en.md) · [Tài liệu thiết kế](docs/README.md) · [Cách phát triển](DEVELOPMENT.md) · [Cách đóng góp](CONTRIBUTING.md)

## Dự án là gì

The Unfinished Earth là tên làm việc của một ý tưởng game diễn ra khoảng 300 năm sau sự sụp đổ của nền văn minh cũ. Người chơi điều khiển một nhân vật, khám phá, xây dựng và tổ chức hậu cần trong một thế giới có khả năng lưu trạng thái lâu dài. Một con đường, khu rừng bị khai thác hay công trình dẫn nước có thể thay đổi cuộc sống của cả cộng đồng và trở thành lịch sử của thế giới đó.

Game hướng đến chơi solo và co-op PvE trong các thế giới riêng, với mục tiêu 1–8 người. Trọng tâm là quan hệ nhân quả giữa hệ sinh thái, xã hội NPC và lịch sử; chiến đấu đóng vai trò phụ.

## Trạng thái hiện tại

**Đã có prototype gameplay 0.1 trên nhánh này. Chưa đạt MVP đầy đủ và chưa có benchmark hiệu năng.**

Prototype gồm một vùng nhìn từ trên xuống bằng Canvas 2D, với đồ họa pixel, thu thập, sửa cầu, cống tưới, cây trồng, nhà và kho đặt trên bản đồ, xe giao hàng, 24 NPC và Chronicle. Máy chủ Node.js quyết định trạng thái; SQLite lưu world và biên nhận lệnh. Xem [hướng dẫn chạy và giới hạn](docs/06-playable-prototype.md) và [định hướng đồ họa](docs/07-visual-direction.md).

### Chạy thử

Cài Node.js 24 trở lên, sau đó:

```sh
npm ci
npm start
```

Mở `http://127.0.0.1:3000`. Dùng danh sách địa điểm để đi đến nguồn gỗ/đá, thu thập **8 gỗ + 4 đá**, sửa cầu rồi lấy thức ăn từ kho và giao cho Làng Hạ. `npm test` chạy kiểm thử mô phỏng và API.

Di chuyển liên tục bằng **WASD/phím mũi tên**; cuộn chuột hoặc dùng các nút **+/−** để thu phóng, kéo bản đồ để dịch góc nhìn. Cụm điều khiển bản đồ có nút xem toàn cảnh, về nhân vật và bật/tắt nhãn địa điểm. Đồ họa prototype không cần WebGL. Khi vào game, đặt tên và chọn nghề; Thợ dựng có kỹ năng gom vật liệu **Q** và tập trung **R**.

Đồng hồ prototype mặc định **×30** (một ngày game = một phút thực). Đặt `SIM_SPEED=1` để dùng nhịp 30 phút/ngày của thiết kế. Dữ liệu nằm trong `data/world.sqlite`; giữ thư mục này qua lần chạy lại.

Có architecture spike TypeScript/PostgreSQL tại `apps/` và `packages/`; xem [DEVELOPMENT.md](DEVELOPMENT.md). Chạy kiểm thử/build spike bằng `pnpm test:workspace` / `pnpm build:workspace`.

Có [Docker Compose](compose.playable.yaml) cho một máy chủ với ổ dữ liệu bền vững. Có thêm adapter Cloudflare Workers/D1 cho bản staging trên Sites; xem phần staging trong hướng dẫn.

Game Design Bible v0.1 gồm 117 mục, 20 tình huống phát sinh, bản đồ tương tác hệ thống, phạm vi MVP và kế hoạch kiểm chứng. Các con số về quy mô, hiệu năng và tiến độ vẫn là mục tiêu hoặc giả định cần thử nghiệm cho tới khi có evidence từ prototype.

## Hướng thiết kế

- Thế giới lưu trạng thái và ghi lại các sự kiện có nguyên nhân, địa điểm và hậu quả.
- Xây dựng tác động đến nước, tài nguyên, sinh kế và quan hệ giữa các cộng đồng.
- NPC và quần thể động vật tiếp tục phát triển thông qua mô phỏng với mức chi tiết phù hợp.
- Người vắng mặt được bảo vệ khỏi mất căn cứ chỉ vì không đăng nhập; sản xuất offline có giới hạn.
- Prototype nhỏ chứng minh một chuỗi tương tác hoàn chỉnh trước khi mở rộng nội dung.

Persistence không đồng nghĩa với mô phỏng mọi cá thể toàn thời gian. Thiết kế dùng máy chủ quyết định trạng thái, mô phỏng vùng, lưu dữ liệu và cập nhật bù có giới hạn. Không cam kết thế giới vô hạn, nội dung vô tận hoặc dịch vụ vận hành vĩnh viễn.

## Cấu trúc

| Đường dẫn | Nội dung |
| --- | --- |
| `apps/client/` | Web client: accessible HTML UI + Three.js rendering spike |
| `apps/world-server/` | Authoritative world-server/gateway spike |
| `packages/protocol/` | Shared runtime-validated wire contracts |
| `packages/sim/` | Deterministic simulation rules independent of rendering/server |
| `packages/db/` | PostgreSQL schema and migration tooling |
| `docs/architecture/` | Architecture Decision Records (ADR) |
| `docs/` | Game Design Bible — nguồn thiết kế chuẩn |
| `exports/` | Bản tài liệu tổng hợp để đọc và chia sẻ |
| `DEVELOPMENT.md` | Thiết lập môi trường và lệnh chạy prototype |
| `CONTRIBUTING.md` | Quy tắc thay đổi thiết kế/mã nguồn |
| `CHANGELOG.md` | Lịch sử các mốc tài liệu |

## Bước tiếp theo

Đọc [phạm vi MVP](docs/04-persistence-and-production.md#99-mvp-scope), kiểm tra giả định nhân lực và làm prototype một vùng. Chuỗi cần chứng minh: xây dựng → nước/đường → nguồn thức ăn → quyết định NPC → lịch sử. Prototype 0.1 là bước thử kiến trúc ban đầu; các khoảng cách tới MVP và thứ tự công việc tiếp theo được ghi trong [kế hoạch triển khai](docs/06-playable-prototype.md#khoảng-cách-tới-mvp).

## Quyền sử dụng

Chưa chọn giấy phép phân phối. Việc có quyền truy cập repository không tự cấp quyền tái sử dụng hoặc phân phối tài liệu và tài sản của dự án.
