# Prototype gameplay 0.1

## Mục đích và phạm vi thực tế

Kiểm chứng chuỗi nhỏ có thể thao tác: lấy vật liệu → sửa cầu → vận chuyển thức ăn → NPC đổi nghề/nơi sống → xem lại nguyên nhân. Đây là mốc khởi đầu cho MVP ở mục 99, không phải tuyên bố hoàn thành MVP 16–24 tuần.

| Hệ thống | Đã triển khai | Chưa nghiệm thu / còn thiếu |
| --- | --- | --- |
| Client | Canvas 2D nhìn từ trên xuống, đồ họa pixel, thu phóng/kéo bản đồ, về nhân vật, bật/tắt nhãn, click chọn vật thể, WASD/phím mũi tên, tìm đường và bảng tương tác tiếng Việt | Chưa có benchmark FPS, nghiệm thu đầy đủ trên thiết bị di động hoặc playtest nhiều người |
| Vùng | Lưới địa hình 32 × 32 đại diện 512 × 512 m, hai làng, một ruin; nhân vật di chuyển liên tục với tọa độ lẻ, kiểm tra đường đi và tốc độ trên máy chủ | Va chạm dùng hình học đơn giản của ô địa hình/công trình; chưa đạt navmesh và vận tốc theo đơn vị thực của thiết kế |
| Xây dựng | Cầu cố định 8 gỗ/4 đá, cống cố định 4 gỗ/2 đá | Có đặt nhà nhỏ và kho cá nhân; chưa đủ 8 building definitions, nhà tùy chỉnh, condition/repair |
| Hậu cần | Túi 40 đơn vị, kho chung, xe chở 8 khẩu phần trong hai ngày | Xe dùng tiến độ theo ngày, chưa pathfind vật lý; chưa có cầu hỏng giữa chuyến và cargo recovery |
| Sinh thái | Cống → độ ẩm/cá → crop, cỏ, grazer/predator; chu kỳ nắng/mưa/hạn | Là chỉ số thử nghiệm, chưa ledger nước m³, lũ không gian, sinh vật có reservation/ID, LOD hoặc seed đa dạng |
| NPC | 24 danh tính; ăn, đổi nghề khi thiếu ăn ba ngày và ruộng đủ ẩm; di cư khi có cầu và làng nhận còn dự trữ | Chưa housing capacity, cooldown đầy đủ, tuổi đời hoặc hành vi đi lại vật lý |
| Save | SQLite WAL/FULL; snapshot và biên nhận commandId cùng transaction trước phản hồi; tạo nhân vật và session cùng transaction; đã có kiểm thử crash tiến trình Node | Chưa thử mất điện/host DB, migration, rollback, compaction hoặc sổ giao dịch đầy đủ theo thiết kế |
| Co-op | Cùng một world trên một server; cookie phiên, polling hai giây; giới hạn 8 kết nối gần nhất | Đã kiểm thử hai phiên tranh item qua HTTP; chưa playtest 1–4 người, stress 8 AOI, WebSocket hay network budget |
| Offline | Một deadline 72 giờ từ đầu vắng; xe ngừng khi hết tín dụng 8 giờ; reconnect không tự cộng tín dụng | Credit tiêu theo lát thời gian đến cuối ngày; chưa production theo giây, equivalence toàn ledger hay mọi edge case T07–T11 |
| Chronicle | Event có ID/ngày/địa điểm/causeIds; tồn tại qua save; client xem 60 gần nhất và tra nguyên nhân cũ | Chưa quyền biết, evidence certainty hoặc lịch sử truy vấn/phân trang đầy đủ |

Các khác biệt ở cột cuối là khoảng trống triển khai, không thay thế các quyết định A01–A13 của Game Design Bible. Nhà nhỏ có thể xây bổ sung hai chỗ ở cho làng gần nhất. Không có chiến đấu hoặc tiền tệ ở bản này.

## Chạy trên máy cá nhân

Yêu cầu Node.js >=24 (dùng `node:sqlite` tích hợp) và npm. Không cần dịch vụ DB bên ngoài.

```sh
npm ci
npm run check
npm test
npm start
```

Mở `http://127.0.0.1:3000`. Máy chủ mặc định chỉ bind loopback. `npm run dev` chạy cùng Worker API với SQLite cục bộ trong `.sites-runtime/preview.sqlite`. `npm run dev:node` chạy máy chủ Node riêng ở chế độ watch. Hai bản dùng save riêng.

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| HOST | 127.0.0.1 | Địa chỉ lắng nghe |
| PORT | 3000 | Cổng HTTP |
| DATA_DIR | thư mục data của repo | Thư mục chứa world.sqlite và WAL |
| SIM_SPEED | 30 | 1–30; 30 là một ngày game/phút, 1 là nhịp thiết kế |
| WORLD_ACCESS_CODE | rỗng trên loopback | Bắt buộc >=16 ký tự khi bind ra mạng |

Máy chủ không tự đọc `.env` khi chạy `npm start`; shell dùng biến môi trường, hoặc `node --env-file=.env src/server.js`. Docker Compose đọc `.env` trực tiếp. Không thay SIM_SPEED giữa một phép đối chiếu online/offline.

## Bản đồ và điều khiển

Canvas 2D là renderer mặc định, không cần WebGL. Địa hình, cây, công trình và nhân vật dùng hình pixel vẽ bằng mã; định hướng màu sắc và khả năng đọc bản đồ được ghi ở [định hướng đồ họa](07-visual-direction.md). Đây là thay đổi cách thể hiện thế giới hiện có, không mở rộng quy mô mô phỏng.

- **WASD/phím mũi tên:** di chuyển liên tục theo hướng trên màn hình, gồm hướng chéo.
- **Cuộn chuột hoặc các nút +/−:** thu phóng bản đồ.
- **Kéo bản đồ:** dịch góc nhìn; click vật thể để chọn và xem hành động.
- **Toàn cảnh:** đưa góc nhìn về toàn bộ vùng; **về nhân vật:** đưa nhân vật vào giữa góc nhìn.
- **Nhãn:** bật/tắt tên địa điểm để quan sát cảnh hoặc tìm mục tiêu.
- **E:** thực hiện hành động tại mục tiêu đang chọn; hành động ở xa có thể tự dẫn nhân vật tới gần trước.
- **Q/R với Thợ dựng:** gom vật liệu/tập trung khi kỹ năng đã hồi.

Kéo hoặc thu phóng chỉ thay đổi góc nhìn. Hành động gameplay vẫn phải được máy chủ xác nhận; các mục địa điểm và bảng tương tác vẫn dùng được để chọn mục tiêu.

## Chuỗi chơi đầu tiên

1. Vào thung lũng. Chọn **Gỗ gần nhà** → **Đi đến địa điểm** → thu thập ít nhất 8 gỗ.
2. Chọn **Đá gần nhà**, đi đến và lấy 4 đá.
3. Chọn **Cầu đá cũ**, đi đến bờ tây, sửa cầu. Vật liệu trừ đúng một lần.
4. Chọn **Kho và xe kéo**, lấy thức ăn. Đến **Làng Hạ**, giao thức ăn; hoặc chờ xe giao khi cầu đã thông và kho còn hàng.
5. Lấy thêm 4 gỗ + 2 đá, đến **Cống tưới** và mở. Quan sát độ ẩm tăng và cá giảm qua ngày.
6. Đến **Ruộng chung**, thu hoạch khi cây đạt 100% để bổ sung kho. Tới **Tàn tích** để đọc dấu tích.
7. Mở Chronicle, bấm **Nguyên nhân #…** để xem sự kiện nguồn. Tải lại trang/khởi động lại máy chủ và tiếp tục bằng cùng cookie.

Không có nút reset thế giới. Save thuộc máy chủ; xóa cookie làm mất khả năng quay lại nhân vật cũ bằng giao diện hiện tại. Tạo nhiều phiên dùng chung kho thế giới, không sinh vật phẩm ban đầu.

## Lưu trữ, bảo toàn và vận hành

Một tiến trình Node là một world actor: không có `await` giữa kiểm tra, thay đổi state và COMMIT của giao dịch. Các lệnh hợp lệ chỉ nhận `type`, tham số hành động và `commandId`; máy chủ không nhận inventory/state từ client. Gửi lại cùng ID của cùng người chơi trả lại biên nhận cũ, cả khi lần đầu bị từ chối. Client thử lại một lần bằng cùng ID khi lỗi mạng.

World snapshot và receipt cùng nằm trong một transaction SQLite. `synchronous=FULL` phụ thuộc sự bảo đảm fsync của filesystem/host. Kiểm thử reopen không thay cho phép thử mất điện. Một ổ dữ liệu chỉ dùng bởi **một instance** server. Không chạy nhiều replica với snapshot trong RAM.

Khi tạo phiên trên Node, nhân vật và session được lưu cùng transaction trước khi cấp cookie. Lỗi ghi session phải rollback cả snapshot; client không nhận cookie của một phiên chưa lưu. Có kiểm thử lỗi ghi rồi thử lại và mở lại SQLite. Architecture spike PostgreSQL có [kiểm thử chết tiến trình trước/sau COMMIT](07-process-death-durability.md) riêng; kết quả của spike không thay thế kiểm tra mất điện hoặc độ bền D1 thật.

Tín dụng hoạt động tính theo khoảng cách giữa lệnh hợp lệ toàn nhóm, tối đa 5 giây mỗi khoảng; khoảng dài hơn 5 giây không cộng. Heartbeat/reconnect không cộng. Đây là xấp xỉ hoạt động, chưa chống AFK tự động hoàn chỉnh. Mô phỏng vùng vẫn phát triển tối đa 72 giờ thực khi vắng, xe vận hành chỉ khi còn tín dụng. Nhà/túi người chơi không bị hỏng hay mất do logout ở mô hình này.

Command receipts, Chronicle và player records hiện chưa được cắt gọn; snapshot tăng theo thời gian và được lưu mỗi giây. Trước chạy world dài hạn phải bổ sung retention/compaction, giới hạn tạo phiên và đo dung lượng/tick latency. NPC nội bộ vẫn sản xuất thức ăn khi offline; work credit hiện áp dụng cho xe/kho hoạt động của nhóm, không phải toàn xã hội.

## Chạy bằng Docker trên máy chủ riêng

Tạo `.env` từ `.env.example`, đặt mã thế giới riêng ít nhất 16 ký tự, rồi:

```sh
docker compose -f compose.playable.yaml up -d --build
docker compose -f compose.playable.yaml logs --tail=50 earth
```

Compose chỉ mở `127.0.0.1:3000` trên host. Đặt HTTPS reverse proxy phía trước cổng này để chơi từ xa; chuyển tiếp Host gốc và `X-Forwarded-Proto: https`. Chia sẻ mã thế giới với nhóm thử nghiệm qua kênh riêng. Cookie là HttpOnly/SameSite=Strict, Secure khi qua HTTPS. Thay access code chưa thu hồi session đang tồn tại: cơ chế quản lý/thu hồi thành viên chưa được làm.

Dùng volume `earth-data`; không dùng filesystem tạm của serverless cho SQLite. Không chạy `docker compose -f compose.playable.yaml down -v` nếu muốn giữ save. Bản này chưa phù hợp GitHub Pages hoặc chức năng serverless không có ổ bền vững. Chưa build/chạy image Docker trong phiên phát triển này; cần smoke test trên host đích trước đưa cho người chơi.

Có công cụ sao lưu nhất quán khi SQLite đang chạy và kiểm tra/khôi phục vào tệp mới; xem phần dưới. Chưa có script migration; bản không khớp version sẽ từ chối mở save.

## Bằng chứng kiểm thử

`npm run check` và `npm test` chạy trên Node.js 24.19.0. Các kiểm thử bao phủ:

- Chặn teleport, qua sông trước khi có cầu và move quá nhanh.
- Hai người tranh vật phẩm cuối: đúng một thành công.
- Xây cầu tiêu vật liệu một lần; xe không nhân đôi cargo.
- Can thiệp nước tạo khác biệt sinh thái, không âm thức ăn và giữ 24 ID NPC.
- Vắng nhiều đợt vượt 72 giờ không gia hạn deadline; hết credit không giao hàng.
- Snapshot + receipt tồn tại qua đóng/mở SQLite.
- HTTP: cookie, command retry trước/sau restart, không lộ túi người khác, chặn cross-origin POST.
- Luồng hoàn chỉnh qua HTTP từ túi rỗng: thu thập → sửa → qua cầu → giao → mở cống → thu hoạch.

**QA staging trước đợt thay đồ họa:** bản đồ 2D tương thích trên desktop, thu thập gỗ/đá, tự đi đến địa điểm, sửa cầu, qua sông, giao thức ăn và mở cống đã thao tác qua trình duyệt preview. Tải lại trang và khởi động lại preview vẫn giữ nhân vật/vật liệu. Renderer pixel mới thay thế cả bản 3D và bản đồ tương thích cũ; kết quả QA cũ không phải benchmark của renderer mới. FPS/mobile, Docker runtime và stress tám người vẫn chưa nghiệm thu. Kiểm tra crash Node sau commit được mô tả riêng ở phần khôi phục thao tác bên dưới.

## Khoảng cách tới MVP

**QA local ngày 14/09/2026:** đã kiểm tra renderer pixel trong trình duyệt ở bố cục desktop và chiều rộng 390 px: chọn làng bằng mái nhà, thu thập gỗ, di chuyển bằng bàn phím, zoom, kéo bản đồ, về nhân vật và bật/tắt nhãn. Tải lại trang vẫn giữ vật liệu; không ghi nhận lỗi JavaScript trong lượt thử này. Kiểm thử tự động bổ sung kiểm tra phép đổi tọa độ, điểm neo zoom và chọn sprite/ô xây dựng. Đây là kiểm tra chức năng, chưa phải đo FPS hay nghiệm thu mobile đầy đủ.

| Thứ tự | Công việc tiếp theo | Điều kiện hoàn thành |
| --- | --- | --- |
| P0 | Playtest trực quan desktop trên host chạy được | Hoàn thành luồng chơi bằng giao diện; địa hình/trạng thái dễ đọc, không clip UI hoặc lỗi điều khiển |
| P0 | Save hardening và restore drill | Crash sau ACK, migration/rollback và replay không mất/nhân đồ; compaction có giới hạn |
| P0 | Nước và offline có đơn vị chuẩn | Ledger m³, tín dụng theo giây và online/catch-up đáp ứng tolerance phụ lục C |
| P1 | Co-op transport và quyền nhóm | 1–4 người chơi thật, rồi tám AOI đạt tick/bandwidth gate; quản lý session/thành viên |
| P1 | Xây dựng và logistics thực | Đặt 8 definitions, collision, bridge failure giữa chuyến, cargo reservation/recovery |
| P1 | Sinh thái và NPC đầy đủ | Nước/lũ theo không gian, animal reservation, housing/cooldown và nhu cầu NPC |
| P2 | Art/UI/audio và playtest nhân quả | Tối thiểu 8/10 người thử giải thích đúng nguyên nhân và cách phản ứng |

Nhân lực, ngân sách và host vận hành chưa được xác định trong repo. Cần chốt các yếu tố đó trước khi gán lịch nghiệm thu MVP; không diễn giải phạm vi prototype này thành cam kết thời gian mới.

## Staging trên Sites / Cloudflare Workers

Thêm `src/cloud-worker.js` và `src/cloud-store.js` để chạy trên Worker với binding D1 `DB`, dùng chung `src/world.js` với bản Node. `npm run build` đóng gói entrypoint và static assets, kèm migration trong `drizzle/`. Bản staging bắt đầu với save mới, không nhập save local. Dữ liệu thử nghiệm preview không được đóng gói.

D1 batch commit snapshot + receipt trong một transaction. Revision compare-and-swap và receipt guard ngăn mất cập nhật/lặp lệnh giữa các Worker instance. Mỗi request đọc qua D1 session `first-primary`. Phiên dùng cookie HttpOnly/SameSite và có Secure trên HTTPS. Site giữ quyền truy cập riêng của chủ sở hữu; không công khai hoặc mời người ngoài trong bước này.

Worker không giữ bộ đếm thời gian trong RAM: mỗi request cập nhật bù từ save; sau heartbeat cuối 15 giây chuyển sang trạng thái vắng. Deadline 72 giờ được giữ qua cold start. Giới hạn 100 nhân vật cho staging; chưa có UI thu hồi phiên hoặc compaction dài hạn. Bản kiểm thử có 21 tests, bao gồm hai session độc lập, tranh tài nguyên, receipt race, CAS retry và reopen DB bằng runtime adapter. Đây chưa phải đo tải D1 thực hoặc playtest hai người thật qua hai trình duyệt.

Giao diện dùng chung renderer pixel Canvas 2D với bản Node local. Các nút hành động giữ DOM ổn định qua heartbeat; mã lệnh dùng Web Crypto getRandomValues để hoạt động cả trong preview HTTP.

### Xây nhà và kho

Mở **Xây dựng**, chọn loại và ô trên bản đồ hoặc nhập tọa độ. Đi tới ô chọn rồi xây khi đủ vật liệu. Nhà nhỏ cần 6 gỗ/2 đá, nằm gần làng; kho cần 4 gỗ/2 đá, chứa 80 đơn vị. Chỉ chủ kho được cất/lấy; túi vẫn giới hạn 40. Không được xây trên sông, đường chính, tài nguyên, nhân vật hoặc bịt lối đi. Tối đa 64 công trình, chưa có tháo dỡ.

Save cũ giữ nguyên. Khi xây căn nhà đầu tiên, sức chứa nền mỗi làng lấy tối thiểu 12 hoặc dân số hiện tại nếu cao hơn, rồi cộng hai chỗ cho mỗi nhà mới. Di cư từ đó chịu giới hạn chỗ ở.

### Khôi phục thao tác sau mất kết nối

Client lưu thao tác vào trình duyệt trước khi gửi. Khi mất phản hồi hoặc tải lại trang, game tự gửi lại cùng mã thao tác sau khi nhận diện đúng nhân vật. Máy chủ dùng biên nhận đã lưu để trả lại kết quả mà không xây/trừ vật liệu lần nữa. Lỗi máy chủ và hết phiên không xóa thao tác đang chờ; nhân vật khác không tự nhận thao tác đó. Khi chưa xác nhận được kết quả, thao tác mới tạm dừng và bảng đồng bộ có nút kết nối lại.

28 kiểm thử đạt, gồm mất ACK khi xây kho rồi mở lại client, hai tab không ghi đè biên nhận, lỗi 5xx/hết phiên, và SIGKILL tiến trình Node ngay sau commit rồi mở lại SQLite. Crash drill dùng cơ sở dữ liệu tạm, không tác động save thật. Chưa nghiệm thu crash hạ tầng D1 thật, migration/rollback hoặc compaction dài hạn. Xóa dữ liệu trình duyệt vẫn làm mất bản ghi client và cookie; đây chưa phải cơ chế khôi phục tài khoản.

### Sao lưu và khôi phục máy chủ SQLite

Chạy bằng Node.js 24, trong thư mục repo. Chọn đường dẫn đang dùng bởi máy chủ (mặc định `data/world.sqlite`). Tạo thư mục riêng để giữ bản sao:

```sh
mkdir -p backups
node scripts/world-backup.mjs backup data/world.sqlite backups/world-2026-09-13.sqlite
node scripts/world-backup.mjs verify backups/world-2026-09-13.sqlite
mkdir -p data/restored
node scripts/world-backup.mjs restore backups/world-2026-09-13.sqlite data/restored/world.sqlite
```

Công cụ dùng SQLite VACUUM INTO để lấy snapshot nhất quán, gồm cả thay đổi đã commit trong WAL. Bản sao chứa toàn bộ bảng thế giới, phiên đăng nhập và biên nhận lệnh; không chỉ JSON gameplay. Công cụ kiểm tra integrity, phiên bản, tồn kho, danh tính và liên kết session/receipt trước khi công bố tệp. Báo cáo in số lượng và SHA-256, không in session token. Trên POSIX, tệp có quyền 0600; trên Windows, tệp kế thừa ACL của thư mục đích. Lưu bản sao ở thư mục riêng tư và chuyển thêm một bản sang thiết bị/ổ lưu trữ độc lập. Nội dung tệp được flush trước khi công bố; bước fsync thư mục bổ sung chỉ chạy trên POSIX vì Node không hỗ trợ thao tác này trên Windows.

`restore` luôn tạo tệp mới, từ chối ghi đè tệp có sẵn hoặc khôi phục vào nguồn. Sau khi kiểm tra bản sao, dừng máy chủ cũ rồi chạy `DATA_DIR=data/restored npm start` để dùng bản khôi phục. Giữ cả dữ liệu cũ cho tới khi đã xác minh nhân vật, kho và lịch sử trên bản khôi phục. Chạy máy chủ cũ và bản khôi phục cùng lúc sẽ tạo hai thế giới độc lập; không có cơ chế hợp nhất tự động.

Hỗ trợ Node/SQLite và SQLite của adapter D1 cục bộ. Không kết nối database D1 cloud, PostgreSQL hoặc sao lưu dữ liệu cloud thật. Công cụ không thay thế migration/rollback và chưa có lịch sao lưu tự động. Ba kiểm thử restore mới bao phủ WAL đang mở, session/receipt, snapshot D1 cục bộ, từ chối ghi đè và save không hợp lệ. Chạy bộ kiểm thử prototype bằng `npm test`.

### Trải nghiệm chơi và di chuyển liên tục

Renderer pixel Canvas 2D nhìn từ trên xuống thay thế bản đẳng cự và tùy chọn 3D trước đây. Giao diện ưu tiên bản đồ; hướng dẫn mục tiêu chuyển theo vật liệu/cầu/lương thực/cống, dẫn tới nguồn tài nguyên gần nhất và báo khi kho hết hàng. Chọn thao tác ở xa sẽ tự đi tới rồi thực hiện; E thao tác tại điểm đang chọn. Thu phóng, kéo bản đồ, toàn cảnh, về nhân vật và bật/tắt nhãn vẫn dùng được.

Client dự đoán chuyển động liên tục và gửi đoạn đường gồm các điểm tọa độ lẻ. Máy chủ kiểm tra toàn bộ đoạn, giới hạn tốc độ theo thời gian đã trôi qua, rồi xác nhận phần đủ ngân sách; client đối chiếu số điểm đã xác nhận và giữ cơ chế retry bằng cùng mã lệnh. Đường đi tránh công trình và chỉ qua sông tại cầu đã sửa. Các lệnh di chuyển theo ô cũ vẫn được giữ để tương thích, nhưng không mô tả điều khiển hiện tại. Kiểm thử có đường tới tọa độ lẻ, vật cản, chặn vượt sông và chu kỳ ACK giả lập 650 ms; đây chưa phải đo độ trễ mạng thực.

Hình địa hình và vật thể của renderer hiện tại được vẽ bằng mã Canvas. `public/world-sprites.png` là bộ minh họa tạo cho giai đoạn trước; hình chọn nhân vật nằm ở `public/characters-v1.png`. Các tài sản này thuộc phạm vi minh họa prototype, chưa phải bộ animation nhân vật hay art MVP hoàn chỉnh. Xem [định hướng đồ họa](07-visual-direction.md).

### Nhân vật và kỹ năng

Người chơi mới đặt tên và chọn Thợ dựng, Người giữ nguồn, Người dẫn đường hoặc Người kết nối. Hồ sơ được máy chủ kiểm tra và lưu; nhân vật cũ vẫn mở được. Có thể đổi tên/nghề khi về gần nơi trú ẩn.

Thợ dựng thu thập tối đa hai đá mỗi lần, luôn trừ đúng lượng lấy khỏi nguồn. **Q — Gom vật liệu** lấy tối đa sáu vật liệu từ nguồn còn hàng trong hai ô, giữ giới hạn túi 40 và hồi 30 giây. **R — Tập trung** giảm khoảng cách giữa lần thu thập xuống 0,25 giây trong 15 giây, hồi 60 giây. Ba nghề còn lại chơi được hoạt động chung; kỹ năng riêng đang phát triển. Kiểm thử bao phủ hồ sơ không hợp lệ, đổi nghề ở xa, bảo toàn vật liệu, túi đầy và thời gian hồi; chưa có hệ thống chiến đấu hoặc cân bằng đầy đủ giữa các nghề.
