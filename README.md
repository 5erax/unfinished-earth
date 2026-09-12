# The Unfinished Earth

**Sandbox co-op trên web, nơi sinh thái, cộng đồng và lịch sử cùng thay đổi theo hành động của người chơi.**

[English](README.en.md) · [Tài liệu thiết kế](docs/README.md) · [Cách phát triển](DEVELOPMENT.md) · [Cách đóng góp](CONTRIBUTING.md)

## Dự án là gì

The Unfinished Earth là tên làm việc của một ý tưởng game diễn ra khoảng 300 năm sau sự sụp đổ của nền văn minh cũ. Người chơi điều khiển một nhân vật, khám phá, xây dựng và tổ chức hậu cần trong một thế giới có khả năng lưu trạng thái lâu dài. Một con đường, khu rừng bị khai thác hay công trình dẫn nước có thể thay đổi cuộc sống của cả cộng đồng và trở thành lịch sử của thế giới đó.

Game hướng đến chơi solo và co-op PvE trong các thế giới riêng, với mục tiêu 1–8 người. Trọng tâm là quan hệ nhân quả giữa hệ sinh thái, xã hội NPC và lịch sử; chiến đấu đóng vai trò phụ.

## Trạng thái hiện tại

**Giai đoạn tiền sản xuất + architecture spike.** Đã có scaffold mã nguồn cho client web, world server, protocol, simulation và database, nhưng **chưa có game có thể chơi và chưa có benchmark được xác nhận**.

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

Chạy architecture spike cho issue #1 và #2 trước. Chuỗi MVP cần chứng minh vẫn là:

**xây dựng → nước/đường → nguồn thức ăn → quyết định NPC → lịch sử.**

Lựa chọn stack hiện tại là giả thuyết kỹ thuật có thể kiểm chứng, được giải thích trong `docs/architecture/0001-prototype-stack.md`; không được coi là khóa cho 1.0 trước benchmark.

## Quyền sử dụng

Chưa chọn giấy phép phân phối. Việc có quyền truy cập repository không tự cấp quyền tái sử dụng hoặc phân phối tài liệu và tài sản của dự án.
