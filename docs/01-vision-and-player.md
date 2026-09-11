# Vision and Player Systems

## 1 Executive Summary

The Unfinished Earth là sandbox co-op PvE trên trình duyệt, đặt người chơi vào một thế giới khoảng 300 năm sau khi nền văn minh cũ sụp đổ. Mỗi người điều khiển một nhân vật, sống bằng khám phá, xây dựng, trao đổi và tổ chức hậu cần. Giá trị khác biệt của game nằm ở việc một hành động nhỏ có thể thay đổi hệ sinh thái, sinh kế của NPC và lịch sử địa phương theo chuỗi nguyên nhân quan sát được.

Đề xuất triển khai đầu tiên là một vùng 512 × 512 m, hai khu định cư NPC và một lưu vực có các nhánh nước. Người chơi sửa một tuyến vận chuyển hoặc thay đổi dòng nước, nhìn thấy nguồn thức ăn biến đổi, rồi chứng kiến cộng đồng phản ứng. Prototype phải lưu được những thay đổi đó qua nhiều phiên, cập nhật khi người chơi vắng mặt và giải thích chúng trong World Chronicle. Nếu chuỗi này chưa tạo được quyết định thú vị, tăng số biome hoặc công thức chế tạo sẽ không giải quyết vấn đề.

**ASSUMPTION A01:** Game dùng thế giới riêng có lời mời, hỗ trợ solo và hướng tới 8 người đồng thời; repository công khai không có nghĩa game là MMO công khai. MVP kiểm thử trải nghiệm 1–4 người trước, sau đó kiểm tra tải 8 người. Chưa có build hoặc kết quả benchmark.

**ASSUMPTION A02:** Một nhóm có một homestead được bảo hộ thường trực. Tài sản cốt lõi không mất vì offline; hạ tầng công cộng vẫn chịu hậu quả. Sản xuất tại nhà tiêu vật tư và tín dụng vận hành có giới hạn. Thế giới vắng toàn bộ người chơi tiến thêm tối đa 72 giờ thực rồi ngủ đông. Thiết kế này giữ hậu quả địa phương mà không buộc người chơi đăng nhập để tránh bị phạt.

**ASSUMPTION A03:** MVP giữ số loại nội dung thấp: 2 kiểu thực vật chức năng, 3 loài động vật, 1 cây trồng, khoảng 24 định nghĩa vật phẩm, 12 công thức và 8 định nghĩa công trình. Các con số là ngân sách khởi đầu; phần 99 quy định tiêu chí phải đạt trước khi mở rộng.

Tài liệu v0.1 là cơ sở cho thiết kế, prototype và quyết định sản xuất. Thông số đề xuất phải được đo hoặc playtest; mục tiêu hiệu năng không phải cam kết đã được chứng minh. Các ví dụ tương lai phân biệt rõ tính năng MVP, mục tiêu 1.0 và phần nghiên cứu sau phát hành.

## 2 High Concept

Người chơi tới một thung lũng nơi rừng đã phủ lên công trình cũ, hai cộng đồng phụ thuộc vào cùng một dòng sông và một cây cầu hỏng làm trao đổi lương thực đình trệ. Không có vai cứu thế được định sẵn. Người chơi có thể dựng nhà, trồng trọt, sửa cầu, buôn bán hoặc rời đi; NPC vẫn phải ăn, tìm việc và quyết định nơi sống.

Một phiên chơi tốt kết thúc bằng thay đổi mà người chơi có thể chỉ ra trên bản đồ: nước tới được ruộng, kho của làng ổn định hơn, đường mòn xuất hiện hoặc một người quen chuyển nghề. Những thay đổi có ý nghĩa được ghi lại để người quay lại sau này hiểu vì sao thế giới có hình dạng hiện tại.

Tên The Unfinished Earth là tên làm việc bằng tiếng Anh. Cụm “unfinished” nói tới quá trình tiếp diễn, không hàm ý game phát hành thiếu tính năng. Tài liệu nội bộ dùng tiếng Việt; tên hệ thống tiếng Anh giữ để đội đa chuyên môn tra cứu cùng một khái niệm.

## 3 Game Vision

Thiết kế ưu tiên hậu quả dễ đọc, có độ trễ và có phương án phản ứng. Một cống tưới giúp ruộng hạ lưu gần nhà nhưng có thể làm giảm nước ở bãi sinh sản của cá. Game phải cho người chơi thấy dấu hiệu trước khi thiệt hại lớn xảy ra, cho phép thay đổi lịch vận hành và công nhận thành quả khi hệ thống ổn định.

“Nothing exists in isolation” là quy tắc về quan hệ nhân quả, không yêu cầu mọi module đọc trạng thái của mọi module khác. Mỗi hệ thống công bố đầu vào, đầu ra và thời điểm cập nhật. Những phản hồi dài đi qua sự kiện hoặc dữ liệu tổng hợp có phiên bản. Một biến động không được gây hàng loạt sụp đổ trong cùng bước mô phỏng chỉ vì thứ tự xử lý.

Ba câu hỏi duyệt tính năng: người chơi có thể nhận biết tác động bằng cách nào; có ít nhất một lựa chọn đối nghịch có lợi ích thật hay không; hệ thống nào dùng kết quả của nó. Chưa trả lời được thì không đưa vào MVP.

## 4 Design Pillars

| Trụ cột | Biểu hiện phải thấy | Điều kiện kiểm chứng |
| --- | --- | --- |
| Living Ecosystem | Nước, cây và quần thể đổi vì điều kiện thật | Can thiệp vào nước tạo khác biệt có thể đo giữa hai nhánh cùng seed |
| Living Civilization | NPC chọn nghề, nơi sống và trao đổi dựa vào nhu cầu | Một tuyến vận chuyển tốt làm giảm thiếu hụt và thay đổi ít nhất một quyết định NPC |
| Persistent World History | Công trình và biến cố để lại hồ sơ có nguyên nhân | Load lại vẫn giữ tác động và liên kết từ sự kiện tới địa điểm |

Xây dựng nối ba trụ cột. Survival tạo giới hạn cho một chuyến đi; combat tạo rủi ro có thể tránh. Tỷ trọng 30/25/20/15/10 trong concept là định hướng chú ý của thiết kế, không phải quota thời gian bắt buộc của người chơi.

## 5 Player Fantasy

Người chơi muốn sống ở một nơi đáng hiểu và đáng chăm sóc. Quyền lực đến từ kiến thức, công cụ, quan hệ và khả năng tổ chức vật chất. Xây một cây cầu quan trọng vì người, thực phẩm và thông tin có thể đi qua đó; game không thưởng giá trị trừu tượng chỉ vì người chơi đặt đủ số khối.

Solo có thể hoàn thành cùng loại mục tiêu với dự án nhỏ hơn và hợp đồng lao động NPC. Co-op giúp chia việc khảo sát, chuyên chở và thương lượng, không tạo cửa khóa cần hai người bấm công tắc cùng lúc. Người chuyên chăm rừng phải có đóng góp rõ ngang người xây nhà.

## 6 Target Audience

Đối tượng chính là nhóm bạn thích chơi sandbox hợp tác, xây căn cứ, khám phá và chứng kiến hệ quả dài hạn. Đối tượng phụ là người chơi solo thích thử nghiệm hệ thống nhưng không muốn quản lý từng NPC như game điều hành thuộc địa. Nhịp phiên tham chiếu 30–90 phút; game vẫn có việc hữu ích trong 5–15 phút.

Giả thuyết nhu cầu chưa được xác nhận bằng nghiên cứu người dùng. Test với ít nhất 5 nhóm có kinh nghiệm khác nhau ở vertical slice. Đo khả năng giải thích nguyên nhân, thời gian đến quyết định đầu tiên, tỷ lệ bỏ dở do vận chuyển lặp lại và mức lo lắng khi chuẩn bị offline; không suy luận thành công chỉ từ thời lượng online cao.

## 7 Platform Strategy

**ASSUMPTION A04:** Desktop browser, chuột/bàn phím và màn hình 1080p là nền tảng đầu tiên. Mobile, touch và console không nằm trong MVP. Camera trực giao trên cảnh 3D low-poly giúp xoay 90° mà không cần vẽ bốn bộ sprite cho mọi tổ hợp công trình. Lựa chọn Three.js/WebGL2 là đề xuất kỹ thuật cần spike ở 89; hỗ trợ thiết bị được chốt theo kiểm thử thực tế.

Client tải phần cần nhìn; máy chủ nắm trạng thái thế giới. Mất tab, trình duyệt tiết kiệm pin hoặc máy khách bị chỉnh sửa không được làm dừng/điều khiển lịch sử của server. Có màn hình kiểm tra khả năng đồ họa, giảm bóng/chi tiết và giải thích kết nối trước khi vào thế giới.

**ASSUMPTION A05:** Chưa chốt mô hình doanh thu. Không thiết kế bán tốc độ mô phỏng, vật tư hoặc bảo hộ offline. Chi phí hosting phải được đo trong prototype trước khi quyết định tự host, thuê world hoặc gói dịch vụ; dự toán sản xuất ở 99–108 chưa bao gồm lời hứa vận hành lâu dài.

## 8 Core Gameplay Loop

```text
Quan sát một thay đổi
  -> Thu thập bằng chứng từ địa hình, NPC và bản đồ
  -> Chọn can thiệp cùng chi phí và tác động dự kiến
  -> Chuẩn bị vật tư, công cụ và tuyến hậu cần
  -> Trực tiếp thực hiện hoặc thuê NPC theo hợp đồng
  -> Thế giới cập nhật theo các bước mô phỏng
  -> Nhìn hậu quả, đọc nguyên nhân và sửa phương án
  -> Lưu dấu vào địa điểm, quan hệ và Chronicle
```

Vòng đầu tiên: thấy ruộng khô, hỏi người trông ruộng, đo mực nước, mang gỗ tới sửa cống, chọn mở vừa thay vì mở hết, rồi quay lại xem ruộng và bờ sông. Nhiệm vụ giới thiệu hướng mắt người chơi vào các dấu hiệu; sau đó hệ thống sinh yêu cầu từ trạng thái thật, có thể tự kết thúc nếu NPC khác giải quyết vấn đề.

Không yêu cầu phải làm đúng chuỗi trên ở mọi phiên. Người chơi có thể thu thập vật tư cho dự án chung hoặc đi khảo sát; các hoạt động đó vẫn phải kết nối được với một mục đích trong thế giới.

## 9 Short / Mid / Long-Term Gameplay Loop

| Khoảng thời gian chơi | Kết quả hữu hình | Giới hạn nhịp thiết kế |
| --- | --- | --- |
| 5 phút | Khảo sát một đoạn sông, giao một kiện hàng, đặt một bản thiết kế | Không bắt mở toàn bộ bảng quản trị |
| 1 giờ | Một chuyến khám phá và một can thiệp nhỏ có phản hồi | Đi bộ rỗng dưới 25% phiên ở test |
| 10 giờ | Một tuyến xe kéo, dự trữ ổn định và quan hệ với NPC | Tự động hóa việc lặp lại trước khi mở quy mô mới |
| 100 giờ | Thay đổi một phần lưu vực và liên kết các cộng đồng | Mở dự án tự chọn, cho phép giai đoạn ổn định |
| 1000 giờ | Nhiều lớp công trình và lịch sử xấp xỉ 16,67 năm nếu mô phỏng liên tục | Là viễn cảnh 1.0, không là lượng nội dung cam kết của MVP |

**ASSUMPTION A06:** 1 ngày game = 30 phút thực; 1 năm = 120 ngày game; 1 mùa = 30 ngày = 15 giờ thực. Vì vậy 100 giờ mô phỏng tương đương 200 ngày, không phải nhiều thế kỷ. Tuổi thế giới dùng thời gian đã mô phỏng; số giờ chơi riêng của một người không xác định được tuổi world có co-op/offline. Lịch sử 300 năm trước game tạo bằng bước macro. Không đổi tốc độ lịch âm thầm để ép xuất hiện thế hệ mới.

## 10 Camera & Controls

**Purpose:** Giữ cảm giác sống qua một nhân vật và cho phép đọc địa hình. **Player Experience:** Theo chân nhân vật khi di chuyển, lùi camera để bố trí nhà và xem tuyến đường.

**Core Rules:** WASD di chuyển theo màn hình; chuột trỏ mục tiêu; E tương tác; Tab inventory; B xây; M map; J journal; Q/R xoay camera 90° ngoài menu; con lăn zoom. Phím có thể remap. Đổi hướng camera giữ nguyên vị trí con trỏ thế giới khi khả thi và không đổi hướng lệnh đang giữ giữa frame. **Inputs:** Bàn phím, con trỏ, trạng thái focus và vị trí nhân vật.

**Outputs:** Ý định di chuyển/tương tác và góc nhìn cục bộ. **Interactions With Other Systems:** Camera dùng che khuất mái, preview xây dựng và quyền khám phá; zoom không mở thông tin chưa biết.

**Player Actions:** Đi, chạy, quan sát, xoay, đánh dấu và hủy hành động. **NPC Actions:** Không nhận lệnh trực tiếp từ click lên bản đồ; tương tác đi qua hội thoại/hợp đồng.

**Simulation Logic:** Input gửi cho server theo sequence; client dự đoán di chuyển, server xác nhận va chạm. Camera hoàn toàn client. **Offline Behavior:** Mất focus ngừng sinh input; không giả định tab nền vẫn chạy timer.

**Failure States:** Kẹt sau mái, chọn sai tầng hoặc thao tác kéo quá xa. **Emergent Outcomes:** Đọc dòng nước và giao thông ngay trên cảnh giúp người chơi tự phát hiện vấn đề.

**UI Presentation:** Outline đối tượng, tooltip thao tác, phím hủy luôn rõ. Mái mờ khi che nhân vật, mode xây giữ một tầng trong MVP. **Performance Considerations:** Giới hạn khoảng zoom; xa chuyển mesh/nhãn tổng hợp, không tải tất cả chi tiết của settlement.

**Edge Cases:** Chat focus vô hiệu hóa WASD; Esc đóng panel trước khi mở menu; thay phím không làm mất phím hủy. **Future Expansion:** Gamepad và nhiều tầng sau khi giải quyết chọn tầng, không chỉ thêm nút.

## 11 Character System

**Purpose:** Nhân vật là điểm tiếp xúc với thế giới. **Player Experience:** Mang giới hạn cơ thể vừa đủ để chuẩn bị chuyến đi, có năng lực riêng mà không bị khóa nghề.

**Core Rules:** MVP có stamina 0–100, tải mang, tình trạng sống/đang gục và bộ kỹ năng hoạt động. Ngoại hình không tạo buff. Mỗi tài khoản chỉ có một nhân vật hoạt động trong world. **Inputs:** Ý định người chơi, vật phẩm mặc, tải, hiệu ứng môi trường và trạng thái injury.

**Outputs:** Tốc độ di chuyển, khả năng dùng công cụ, nhu cầu nghỉ và các hành động có chứng từ. **Interactions With Other Systems:** Crafting kiểm công cụ và kiến thức; logistics kiểm tải; NPC đánh giá hành vi và quan hệ.

**Player Actions:** Chọn tên, diện mạo, bộ đồ nghề khởi đầu rồi học thêm qua làm việc. **NPC Actions:** Công nhận tư cách thành viên/hợp đồng, hướng dẫn sử dụng trạm hoặc hỗ trợ cứu hộ.

**Simulation Logic:** Đi bộ 3 m/s trên đường phẳng; chạy 4,5 m/s tiêu 10 stamina/giây, hồi 8 stamina/giây sau 2 giây không chạy. Đây là điểm bắt đầu playtest. Server tính tải và stamina; kỹ năng không tăng chỉ nhờ giữ nút ở trạng thái không sinh kết quả. **Offline Behavior:** Không tiêu đói, khát, stamina hoặc tuổi sinh lý bắt buộc khi ngắt kết nối an toàn.

**Failure States:** Quá tải, kiệt sức hoặc gục. **Emergent Outcomes:** Vai trò của nhóm hình thành từ công cụ và thói quen, có thể đổi mà không cần tạo nhân vật lại.

**UI Presentation:** Chỉ hiện stamina rõ khi dùng; mục hồ sơ ghi kinh nghiệm và quyền sử dụng trạm. **Performance Considerations:** Tối đa 8 player actors; không gửi mọi thống kê mỗi frame.

**Edge Cases:** Hai tab cùng tài khoản chỉ một phiên được quyền phát lệnh; phiên cũ thành quan sát rồi ngắt. **Future Expansion:** Ngoại hình theo tuổi tùy chọn, thói quen nghề và di sản cá nhân; không buộc người chơi chết già.

Vật phẩm khởi đầu dùng ngân sách onboarding cố định trong seed, tối đa tám suất cho một world. Mỗi lần cấp lưu receipt theo account/world; xóa nhân vật, cứu hộ hoặc reconnect không cấp lại. Khi đã dùng hết ngân sách, thành viên mới dùng đồ do nhóm chuyển giao hoặc mượn công cụ từ kho cứu hộ ở mục 13. Đổi tài khoản không tạo thêm vật tư ngoài tổng ngân sách. Công cụ mượn không thể bán, tháo hay dùng làm nguyên liệu; trả về kho khi kết thúc quyền mượn.

## 12 Player Progression

**Purpose:** Mở rộng loại vấn đề có thể giải quyết. **Player Experience:** Có bản vẽ trước khi có máy móc để dùng nó; tìm một chuyên gia hoặc sửa đường có thể quan trọng hơn săn thêm vật liệu.

**Core Rules:** Công nghệ yêu cầu knowledge record, dụng cụ, trạm, nguyên liệu và quyền truy cập; không yêu cầu cấp nhân vật. Kỹ năng thực hành chỉ giảm tối đa 20% thời gian công việc, không tăng vật chất tạo ra từ cùng đầu vào. **Inputs:** Việc hoàn tất có giá trị, tài liệu, cố vấn và khám phá.

**Outputs:** Quyền thử công thức và tốc độ thao tác. **Interactions With Other Systems:** Knowledge 71–74 lưu nguồn tri thức; nghề NPC cung cấp lao động; hạ tầng quyết định khả năng sản xuất thật.

**Player Actions:** Quan sát, sao chép, thực hành, thử nghiệm, thuê chuyên gia. **NPC Actions:** Dạy trong thời gian hợp đồng hoặc từ chối nếu người chơi chưa có quan hệ/quyền vào trạm.

**Simulation Logic:** Ba mức thực hành Familiar/Practiced/Proficient đạt bằng công việc hợp lệ đa dạng; thời gian giảm 0/10/20%. Nhật ký bài học lưu ID hành động để chống gửi lặp. **Offline Behavior:** Chỉ công trình nghiên cứu có đủ nhân công và vật tư hoạt động; nhân vật vắng không tự học kỹ năng cơ thể.

**Failure States:** Biết công thức nhưng thiếu trạm hoặc kiến thức nằm ở thư viện đã mất. **Emergent Outcomes:** Nhóm đầu tư vào trường học/bản sao thay vì ôm một bộ blueprint duy nhất.

**UI Presentation:** Hiện đúng điều kiện còn thiếu và cách tìm, không có cây khóa với hàng chục icon mờ. **Performance Considerations:** Cập nhật khi event hoàn tất; không tick mọi skill.

**Edge Cases:** Mượn blueprint không tự chuyển quyền sở hữu; tri thức đã đọc còn trong nhật ký nhưng không thay giấy phép dùng trạm. **Future Expansion:** Nghiên cứu nhiều cộng đồng, chuyên ngành giao nhau; hoãn cây công nghệ lớn.

## 13 Death & Legacy

**Purpose:** Giữ rủi ro có ý nghĩa mà không xóa công sức xây world. **Player Experience:** Bị gục là lúc cần cứu, chuẩn bị tốt giảm tổn thất; cái chết vĩnh viễn là lựa chọn luật world riêng sau MVP.

**Core Rules:** Mặc định Able → Downed → Rescued → Recovering → Able. Downed kéo dài 60 giây đủ thời gian gọi hỗ trợ; solo có cứu hộ tự động. Phí cứu hộ tối đa 10 credit, trừ tối đa 25% tiền đang mang; không đủ thì ghi nhận cứu trợ không nợ lãi. Trang bị giữ, hàng hóa đang mang rơi thành container cứu hộ thu hồi trong 24 giờ thực. Cứu hộ chỉ phục hồi trạng thái nhân vật, không cấp lại bộ vật phẩm khởi đầu. Khi cần tránh bế tắc, người chơi mượn công cụ gắn quyền sử dụng từ kho cứu hộ hữu hạn; công cụ mượn không thể giao dịch và mỗi lần cấp phải ghi allocation. **Inputs:** Chấn thương, hỗ trợ và disconnect.

**Outputs:** Thời gian hồi phục, vị trí cứu hộ và container rơi có ID. **Interactions With Other Systems:** Hợp đồng vận tải có thể chậm, NPC ghi nhớ cứu giúp; Chronicle chỉ ghi cái chết khi xảy ra thật.

**Player Actions:** Cứu đồng đội, gọi cứu hộ, quay lại lấy hàng; sau MVP có thể chủ động kết thúc đời nhân vật. **NPC Actions:** Đội cứu hộ đưa về điểm an toàn đã biết, không tạo bản sao cơ thể ở vùng khác.

**Simulation Logic:** Server giải quyết một kết quả cuối cùng theo casualtyId; nhân vật/corpse không cùng sở hữu inventory. MVP không có trạng thái chết vĩnh viễn. Legacy 1.0 tùy chọn giữ đất, nhóm và hồ sơ tri thức đã gửi thư viện; người kế tục có kỹ năng thực hành mới. **Offline Behavior:** Disconnect ngoài nhà giữ cơ thể tối đa 60 giây, sau đó cứu hộ theo cùng phí; reconnect nhận trạng thái server.

**Failure States:** Hàng cứu hộ không thu hồi sẽ chuyển kho cứu trợ địa phương, mất quyền đòi sau hạn; tài sản trong nhà không liên quan. **Emergent Outcomes:** Một thất bại trở thành chuyến cứu người/hàng, không buộc cày lại căn cứ.

**UI Presentation:** Cảnh báo đang gục, đếm thời gian hỗ trợ, vị trí và hạn container. **Performance Considerations:** Một container có TTL thay vì vật phẩm rơi riêng rẽ.

**Edge Cases:** Disconnect không xóa injury hay đưa miễn phí đến nơi mong muốn; cứu hộ chọn điểm gần nhất hợp lệ. Với container ở nước sâu, đặt điểm tiếp cận bờ gần nhất, giữ ID. **Future Expansion:** Chế độ legacy death tự chọn, mộ và di chúc; không thay luật giữa phiên mà thiếu đồng thuận.

## 14 Survival System

**Purpose:** Tạo quyết định chuẩn bị, trú ẩn và thời điểm trở về. **Player Experience:** Mang một ít thức ăn và nước cho cả chuyến đi, nhận cảnh báo sớm thay vì bị ép ăn vài phút một lần.

**Core Rules:** Một ration 0,5 kg đáp ứng 90 phút thực hoạt động; 1 lít nước đáp ứng 60 phút, trời nóng nhân nhu cầu tối đa 1,5. Đói/khát trước hết giảm hồi stamina, không giết trực tiếp trong MVP. Nhu cầu sinh hoạt player dùng phút hoạt động để bảo vệ nhịp chơi; NPC dùng khẩu phần/ngày game trong mô hình dân số, không là mô hình dinh dưỡng hiện thực. **Inputs:** Thời gian hoạt động hợp lệ, hoạt động nặng, môi trường và vật tư.

**Outputs:** Hiệu ứng stamina, nhu cầu trú và tiêu thụ vật phẩm. **Interactions With Other Systems:** Nước bẩn tăng exposure disease; mái và quần áo giảm tiếp xúc; nguồn thực phẩm nối với kinh tế.

**Player Actions:** Ăn, đổ bình, đun/lọc, nghỉ tại nơi trú. **NPC Actions:** Tiêu khẩu phần từ kho theo ngày, chọn việc và di cư khi thiếu kéo dài; chi tiết ở phần 47.

**Simulation Logic:** Cảnh báo ở mức còn 25%; đến 0 giảm hồi stamina 50% tối đa. Nghỉ có mái 30 giây phục hồi exhaustion, không tua giờ toàn server. Player không cần ngủ liên tục qua một đêm game (30 phút thực/ngày game). **Offline Behavior:** Player dừng nhu cầu khi đã shelter/rescue; NPC ngoài homestead vẫn chịu mô hình thiếu hụt, NPC trú homestead ngủ đông theo phần 77.

**Failure States:** Chuyến đi kéo dài, nước không an toàn, gánh quá nặng. **Emergent Outcomes:** Trạm nước và nơi trú ven đường thay đổi tuyến di chuyển.

**UI Presentation:** Bình nước/đồ ăn chỉ cảnh báo khi cần; inspect nguồn nước ghi tình trạng và độ tin cậy. **Performance Considerations:** Nhu cầu mỗi giây hoặc khi ăn, không theo 20 Hz movement.

**Edge Cases:** AFK không nạp credit sản xuất; tạm không tiêu đói không được coi là active work. Thức ăn trong nhà có thể thiu theo lịch nếu không bảo quản, nhưng UI nêu trước và không tự tiêu vật liệu nhà để bù. **Future Expansion:** Nhiệt độ, giấc ngủ tùy chọn và bệnh theo vùng ở alpha; mỗi loại phải tạo phương án xử lý riêng.

## 15 Combat System

**Purpose:** Tạo rủi ro địa phương có thể tránh hoặc giải quyết bằng chuẩn bị. **Player Experience:** Một con thú bảo vệ lãnh thổ khiến người chơi đổi đường, xua đuổi hoặc dùng vũ khí, không thành điểm farm.

**Core Rules:** MVP một vũ khí cận chiến, một kiểu né ngắn và hành vi bỏ chạy; không súng, suppression hoặc chiến thuật đội hình. Không tăng máu địch theo cấp người chơi. Đánh có windup 0,45 giây, recovery 0,65 giây, tiêu 15 stamina; hit test từ server. **Inputs:** Ý định, khoảng cách, line of sight, condition vũ khí và stamina.

**Outputs:** Injury, tác động lên quần thể và sự kiện thù địch. **Interactions With Other Systems:** Săn trừ population thật; hành hung NPC tác động quan hệ, quyền vào làng và thương mại.

**Player Actions:** Tránh, lùi, đe dọa, đánh, cứu người. **NPC Actions:** Đánh giá sợ hãi, bảo vệ người quen hoặc chạy về nơi trú; không truy đuổi vô hạn.

**Simulation Logic:** Có thể chọn attack nếu target còn trong tầm ở tick giải quyết; mỗi attackId gây hit tối đa một lần/target. Thú thoát khi vượt bán kính lãnh thổ 60 m hoặc mất dấu 10 giây. **Offline Behavior:** Combat không chạy trong home được bảo hộ; disconnect ngoài nhà theo phần 13, quần thể còn lại chuyển macro sau khi kết thúc encounter.

**Failure States:** Bị gục, công cụ hỏng, gây thù hoặc săn quá mức. **Emergent Outcomes:** Tuyến xe tránh vùng sinh sản hoặc đội nhóm dùng tiếng động để giảm đối đầu.

**UI Presentation:** Windup rõ qua chuyển động và âm thanh; không cần đọc sát thương nổi. **Performance Considerations:** Tối đa số actor hoạt động chung cho toàn world; hành vi xa dùng ý định cấp vùng.

**Edge Cases:** Friendly fire off ở mặc định; tấn công không phá công trình nhóm. Server từ chối hit qua tường và sequence quá cũ. **Future Expansion:** Súng ít đạn, cover và điều kiện thời tiết ở 1.0 sau test độ trễ; mục tiêu combat vẫn phụ.

## 16 Injury System

**Purpose:** Chuyển va chạm thành nhu cầu chăm sóc có thể đọc. **Player Experience:** Băng bó và nghỉ có vai trò, không phải chẩn đoán y khoa phức tạp.

**Core Rules:** MVP Bruised, Bleeding, Downed; chảy máu gây giảm condition theo giây cho tới khi băng hoặc gục, thời gian gục ở phần 13. Không mô phỏng từng cơ quan. **Inputs:** Damage event, exposure và vật tư cứu thương.

**Outputs:** Hiệu ứng tốc độ, hồi phục và casualty event. **Interactions With Other Systems:** Vận tải cung cấp băng, NPC y tế hỗ trợ, combat tạo nguồn injury.

**Player Actions:** Băng bó trong 5 giây có thể bị gián đoạn; giúp người khác khi đứng gần. **NPC Actions:** Nhận hợp đồng cấp cứu, ưu tiên người gục trước người bầm.

**Simulation Logic:** Một effect loại Bleeding có intensity cộng dồn tối đa 3, không tạo vô hạn effect độc lập. Băng tiêu 1 item khi hoàn tất, không ở đầu animation. **Offline Behavior:** Rescue chặn tiến triển gây chết của player; bên trong shelter hiệu ứng được xử lý rồi ngủ đông.

**Failure States:** Thiếu băng hoặc bị gián đoạn khi đang nguy hiểm. **Emergent Outcomes:** Trạm cứu hộ bên đường giúp mở tuyến mới.

**UI Presentation:** Icon + chữ + chuyển động, không chỉ màu đỏ. **Performance Considerations:** Event/effect list ngắn, update 1 Hz.

**Edge Cases:** Hai người cứu cùng lúc chỉ một transaction tiêu băng; người còn lại nhận kết quả đã cứu. **Future Expansion:** Fracture/infection/pain ở alpha nếu phân biệt rõ cách xử lý; hệ thống hoàn toàn giả tưởng phục vụ gameplay.

## 17 Inventory System

**Purpose:** Làm khoảng cách và hậu cần có giá trị. **Player Experience:** Mang đủ đồ dùng, cần xe kéo cho hàng xây dựng.

**Core Rules:** Túi 30 kg tải chuẩn, tối đa 45 kg; trên 30 kg tốc độ giảm tuyến tính tới 60% ở 45 kg. Không nhặt nếu vượt 45 kg. Vật có tag Bulky không vào túi dù nhẹ. Đồ mặc tính vào khối lượng. **Inputs:** Item stacks, ownership, container revision và yêu cầu chuyển.

**Outputs:** Tải, trạng thái slot chức năng và transfer receipt. **Interactions With Other Systems:** Craft reservation, xe, kho, loot và quyền nhóm dùng cùng ledger.

**Player Actions:** Chuyển số lượng, chia stack, đánh dấu giữ riêng, gửi kho. **NPC Actions:** Lấy đúng allocation theo hợp đồng, không tự mượn công cụ cá nhân.

**Simulation Logic:** Tính mass từ định nghĩa có version; chuyển nguyên tử trừ nguồn/cộng đích và kiểm capacity sau reservation. Giới hạn 80 stacks/container, stack vật liệu 50 đơn vị; đồ cá thể có condition riêng. **Offline Behavior:** Kho giữ ownership; perishables xuống chất lượng theo batch, không tự biến thành hàng mới.

**Failure States:** Kho đầy, mất quyền, hàng đang được đặt trước. **Emergent Outcomes:** Kho trung chuyển trở thành nơi trao đổi và mục tiêu sửa đường.

**UI Presentation:** Danh sách/search/filter, hai panel nguồn–đích, thanh kg; không grid-tetris. **Performance Considerations:** Gửi delta theo container đang mở; không sync inventory mọi NPC cho mọi client.

**Edge Cases:** Hai người lấy item cuối, reconnect gửi lại và đổi capacity khi đang craft đều được kiểm soát bằng version/transactionId. **Future Expansion:** Bảo quản lạnh, container kín và hàng nguy hiểm sau MVP.

## 18 Item System

**Purpose:** Tạo giá trị từ công dụng, nguồn gốc và độ tin cậy. **Player Experience:** Một dụng cụ cũ đã sửa có thể hữu ích hơn đồ mới thiếu phụ tùng.

**Core Rules:** ItemDef xác định mass, volumeClass, tags và chức năng; ItemInstance giữ condition 0–100, provenance và mods khi cần. Không rarity màu. Vật tư đồng nhất gộp theo batch; kỷ vật giữ ID. **Inputs:** Recipe, salvage, resource harvest và repair.

**Outputs:** Dụng cụ, vật liệu, phế liệu và thông tin nguồn. **Interactions With Other Systems:** Craft, trade, pollution, Chronicle và knowledge dùng tag/ID.

**Player Actions:** Kiểm tra, dùng, bảo dưỡng, tháo và giữ làm kỷ vật. **NPC Actions:** Định giá theo công dụng/condition; bảo tàng tương lai mới trả thêm cho lịch sử đã chứng thực.

**Simulation Logic:** Condition giảm theo số lần dùng thật; về 0 thì unusable, không xóa item. Repair tiêu phụ tùng và chỉ phục hồi nếu vượt ngưỡng hiệu quả, không tạo kim loại ròng. **Offline Behavior:** Đồ không tiêu hao chỉ vì người sở hữu vắng; food batch có expiry riêng.

**Failure States:** Đồ hỏng, giả thông tin hoặc không tương thích trạm. **Emergent Outcomes:** Một máy tồn tại qua nhiều chủ có lịch sử phục hồi.

**UI Presentation:** Công dụng, condition, yêu cầu phụ tùng, provenance ngắn; chi tiết kỹ thuật trong inspect. **Performance Considerations:** Chỉ một phần item cần instance; phần lớn dùng stack/batch.

**Edge Cases:** Đổi bản định nghĩa không làm âm khối lượng; save migration giữ defVersion cũ tới khi chuyển hợp lệ. **Future Expansion:** Manufacturer, mods và bảo tàng; không triển khai hàng trăm biến thể ở MVP.

## 19 Crafting System

**Purpose:** Biến vật tư và lao động thành công cụ tác động thế giới. **Player Experience:** Bắt đầu làm tay, tiến tới trạm và sản xuất theo yêu cầu; không phải bấm hàng nghìn lần.

**Core Rules:** Recipe cần knowledge, station, inputs, workSeconds và output capacity. Handcraft cho nhu yếu; workstation cho công cụ; industry sau MVP. Hàng đợi tối đa 10 job/trạm. **Inputs:** Vật tư có đặt trước, người làm, nguồn điện nếu cần và quyền sử dụng.

**Outputs:** Sản phẩm, phụ phẩm, heat/pollution khi recipe khai báo. **Interactions With Other Systems:** Logistics đặt vật tư, workforce phân công, energy giới hạn throughput, ecology nhận waste.

**Player Actions:** Tạo job, chọn số lượng/đích đến, hủy, làm việc. **NPC Actions:** Nhận job đúng nghề và lịch; dừng khi hết lương/đồ ăn/quyền.

**Simulation Logic:** Planned → Reserved → Working → Completed hoặc Paused/Cancelled. Reserve giữ item ở kho với ownerJob; Completed trừ vật tư, cộng output và ghi event trong một transaction. Trong MVP, hủy trước Completed chỉ giải phóng reservation đúng một lần; chưa trừ vật tư và chưa có output để thu hồi. Recipe chia nhiều giai đoạn là mở rộng sau MVP; khi đó mỗi giai đoạn phải ghi riêng vật tư đã tiêu và chỉ hoàn lại phần chưa dùng. **Offline Behavior:** Job tại home cần credit phần 77; hết điều kiện thì Paused, không catch-up nhân output theo elapsed đơn thuần.

**Failure States:** Thiếu nguyên liệu, full kho, trạm hỏng hoặc mất điện. **Emergent Outcomes:** Sửa cầu mở nguồn vật liệu giúp xưởng vận hành, công việc mới hút NPC.

**UI Presentation:** Lý do tạm dừng cụ thể, ước tính thời gian và khối lượng vận chuyển. **Performance Considerations:** Chỉ job đang chạy được lịch hóa; trạm dormant không tick.

**Edge Cases:** Hai recipe tranh input, disconnect ở tick hoàn tất, kho output bị thu quyền; mọi trường hợp dùng reservation và idempotency. **Future Expansion:** Orders theo mức tồn kho, belt/assembly sau khi xe và kho chứng minh vòng cốt lõi.

### Bộ dữ liệu khởi đầu

Các công thức dưới đây minh họa đơn vị và ledger, không phải toàn bộ danh mục 24 item. Thời gian là giây thực làm việc; lao động NPC dùng cùng workSeconds, dân số và mùa dùng ngày game.

| Công thức | Đầu vào | Đầu ra và phụ phẩm | Thời gian |
| --- | --- | --- | --- |
| Sẻ gỗ | 10 kg gỗ | 8 kg ván + 2 kg mùn | 60 giây tại bàn |
| Khẩu phần | 2 kg hạt + 1 L nước sạch | 4 ration × 0,5 kg + 1 L nước thải/thoát hơi | 45 giây tại bếp |
| Băng | 0,2 kg vải | 2 băng × 0,1 kg | 20 giây làm tay |
| Thu hồi kim loại | 5 kg phế liệu | 3 kg kim loại + 2 kg xỉ | 120 giây tại trạm |
| Bộ sửa cầu | 8 kg ván + 2 kg kim loại | 1 bộ 10 kg Bulky | 90 giây tại bàn |

Nước 1 L quy đổi 1 kg cho hậu cần; recipe khai báo đủ đầu ra để giữ cân bằng khối lượng. Số food 0,5 kg là đơn vị game, không cam kết calorie hay quy trình thực.

## 20 Building System

**Purpose:** Cho người chơi tạo tài sản, tuyến đi và can thiệp môi trường. **Player Experience:** Đặt preview, nhìn phần vật tư còn thiếu, tự xây hoặc để nhóm vận chuyển tới.

**Core Rules:** Grid 1 m, các phần kết cấu snap; đồ nhỏ đặt tự do trong footprint hợp lệ. MVP một tầng, không mô phỏng phá hủy vật lý. Tám def khởi đầu: nền, tường, mái, kho, bàn, ruộng, cầu, cống. Lửa trại là deployable item; house ghép từ 3 def kết cấu. **Inputs:** Blueprint, quyền đất, mặt bằng, vật liệu và lao động.

**Outputs:** Công trình có ID/condition, thay đổi nav và dịch vụ hạ tầng. **Interactions With Other Systems:** Nền có chiếm đất, ruộng rút nước, cầu nối đường, mái giảm exposure, cống sửa đồ thị nước.

**Player Actions:** Survey, đặt, cung ứng, xây, sửa, tháo. **NPC Actions:** Nhận hợp đồng công trình, chọn dùng đường/trạm sau hoàn thành.

**Simulation Logic:** Preview → Planned → Supplied → Building → Operational → Damaged → Ruin. Footprint được reserve ngay khi Plan được server nhận; collider đầy đủ chỉ khi kết cấu đủ điều kiện. Tháo tạo batch phế liệu bằng 70% vật liệu đã đầu tư, không hoàn 100% để farm repair. **Offline Behavior:** Homestead bảo hộ core condition; ngoài đất bảo hộ có maintenance daily và cảnh báo trước. Cầu public hỏng không xóa nhà quanh đó.

**Failure States:** Mặt bằng chặn lối, thiếu vật tư, support không hợp lệ, utility mất. **Emergent Outcomes:** Người khác và NPC đi qua một công trình, làm trung tâm trao đổi phát triển.

**UI Presentation:** Trước đặt hiện ảnh hưởng diện tích/nước/lối đi; trước tháo cảnh báo dịch vụ và quyền người khác. **Performance Considerations:** Nav invalidations theo chunk, mesh instance các def lặp; giới hạn MVP 2.000 placed parts/world để benchmark.

**Edge Cases:** Không được bịt đường public duy nhất tới home hoặc cửa vào vùng. Hai người đặt trùng ô, nhân vật đứng trong preview và tháo kho khi còn đồ phải trả lỗi rõ. **Future Expansion:** Tầng hai, stairs, thẩm mỹ tự do; kết cấu support graph đơn giản thay rigidbody.

## 21 Terraforming

**Purpose:** Cho sửa địa hình cục bộ với chi phí hữu hình. **Player Experience:** Đào rãnh và san nền giúp dự án hoạt động nhưng phải xử lý đất dư.

**Core Rules:** MVP chỉ rãnh irrigation định sẵn và nền san trong footprint; độ cao đất đổi tối đa ±0,5 m mỗi ô, không đào hang. Sông chính và vị trí claim không được đổi để chặn shared flow. **Inputs:** Height cell, soil class, quyền, cuốc và đất thải.

**Outputs:** Surface patch, spoil stock, nav dirty và water edge update. **Interactions With Other Systems:** Water phần 34 đọc độ dốc/cống; vegetation mất diện tích; building kiểm độ nền.

**Player Actions:** Xem mặt cắt, chọn độ sâu, đào/bồi; public hydrology edit cần quyền Steward phần 75. **NPC Actions:** Làm theo hợp đồng, vận chuyển đất dư đến điểm tập kết.

**Simulation Logic:** V thay đổi = diện tích ô × độ cao thay đổi; 4 m² × 0,25 m = 1 m³ đất. Soil cargo đo theo m³ và khối lượng giả định 1.500 kg/m³; cần xe để dọn lượng lớn. **Offline Behavior:** Công việc dừng nếu kho container đất dư đầy; terrain patch đã commit vẫn còn.

**Failure States:** Hết diện tích tập kết, tạo ô không thể đi hoặc rãnh không nối. **Emergent Outcomes:** Cải đất ở một nơi để lại bãi đất cần trồng phủ ở nơi khác.

**UI Presentation:** Hiện m³ đất cần chuyển và nhánh nước ảnh hưởng trước xác nhận. **Performance Considerations:** Cập nhật vùng dirty đệm theo batch; không rebuild toàn map mỗi nhát cuốc.

**Edge Cases:** Không đào dưới chân NPC hoặc công trình đang ở; đổ đất vào sông không làm biến mất khối lượng. **Future Expansion:** Mỏ sâu, ao và đê ngoài MVP; rủi ro sạt lở dùng stability score.

## 22 Infrastructure

**Purpose:** Biến công trình thành mạng dịch vụ. **Player Experience:** Sửa một điểm nghẽn tạo lợi ích cho nhiều người dùng tuyến.

**Core Rules:** Một service graph/node có mức phục vụ, capacity, condition và owner. Cầu đang hỏng không cấp connection; ruộng không coi là được tưới chỉ vì gần cống. **Inputs:** Công trình operational, routes và demand.

**Outputs:** Reachability, capacity và service allocation. **Interactions With Other Systems:** Trade/dân cư tìm tuyến, water chạy mạng riêng; road giảm habitat cục bộ.

**Player Actions:** Khảo sát, đặt ưu tiên bảo dưỡng, ký hợp đồng sửa chữa. **NPC Actions:** Đi đường mở, thuê vận chuyển, tăng trade offer nếu đủ capacity.

**Simulation Logic:** Mỗi network loại khác nhau có ID riêng; road không tự thành điện. Demand đặt trước slot throughput; nodes dirty được tính lại khoảng cách. Trail score tăng theo traversal thật tối đa 10 điểm/ngày/cell, đủ 50 và đất hợp lệ thì hiện trail; đường gravel phải xây. **Offline Behavior:** Traffic macro thật cũng tăng trail; không tăng do đứng AFK.

**Failure States:** Đứt mạng, capacity quá tải, maintenance thiếu. **Emergent Outcomes:** Tuyến mới dịch chuyển cửa hàng và khu ở, vùng cũ có thể vắng.

**UI Presentation:** Overlay dịch vụ bật theo nhu cầu, nút “vì sao không tới được”. **Performance Considerations:** Graph cấp chunk/định cư, chỉ refine route gần player.

**Edge Cases:** Cầu sập đang có xe, chọn giải pháp dừng trước mép hoặc cứu hộ; không dịch xe qua để khớp graph. **Future Expansion:** Cảng, đường sắt, đèn đường, radio; ngân sách mạng định lượng trước.

## 23 Electricity

**Purpose:** Tạo bài toán capacity và ưu tiên dịch vụ. **Player Experience:** Chọn giữa vận hành xưởng nhanh và giữ điện dự trữ cho bơm/lạnh.

**Core Rules:** Sau MVP; mạng điện abstraction, không electrical circuit physics. Node công suất kW, battery energy kWh; ưu tiên cứu hộ/nước uống trước industry, đèn decor cuối. **Inputs:** Generation, loads, wire connectivity, fuel và weather.

**Outputs:** Energy allocation, blackout, fuel/waste ledger. **Interactions With Other Systems:** Water cho phép thủy điện, weather ảnh hưởng solar/wind, craft hiểu năng lượng đã nhận.

**Player Actions:** Nối mạng, đặt priority, đầu tư battery, bảo dưỡng. **NPC Actions:** Chỉ vận hành station đã cấp điện, vận chuyển fuel.

**Simulation Logic:** Với Δt giờ thực, energy = power × Δt; 5 kW × 0,5 giờ = 2,5 kWh. Dùng đồng hồ thực vận hành để recipe và offline credit nhất quán; day/night theo lịch game quy định profile phát. Charge/discharge giới hạn công suất và dung lượng, hiệu suất 0,9 mỗi chiều. **Offline Behavior:** Chỉ tích điện khi máy vận hành trong hạn credit; khi dormant không phát miễn phí vào lưới public.

**Failure States:** Thiếu điện, cạn fuel, hỏng mạng. **Emergent Outcomes:** Cộng đồng giữ rừng để chống bồi lắng cho thủy điện, hoặc đổi lịch xưởng theo nắng.

**UI Presentation:** “Đủ điện/thấp/quá tải”, nguyên nhân và công việc bị dừng; chi tiết kW/kWh optional. **Performance Considerations:** Giải phân phối theo service priority mỗi giây khi mạng dirty, không theo mỗi dây/frame.

**Edge Cases:** Mạng vòng không nhân energy, hai battery đấu nối không tự nạp vô hạn; ngắt giữa chu kỳ chỉ tính energy đã nhận. **Future Expansion:** Grid liên vùng và máy phát hạt nhân không cam kết 1.0; thủy điện lớn chỉ sau validation nước.

## 24 Logistics

**Purpose:** Chuyển vật chất và lao động thành throughput có thể dự đoán. **Player Experience:** Mang bằng tay ở đầu, đặt hợp đồng tuyến khi việc lặp lại; nhìn thấy vì sao kho thiếu.

**Core Rules:** Shipment luôn có source, destination, cargo reservation, vehicle, carrier và route version. MVP xe kéo 120 kg, kho 500 kg; capacity không chỉ là icon. Nhận đơn khi đích có slot nhận. **Inputs:** Order, tồn kho nguồn, sức chở, người vận chuyển và lối đi.

**Outputs:** Cargo move, ETA, phí lao động và route wear. **Interactions With Other Systems:** Trade đặt shipment; craft tạm dừng khi hàng chưa tới; survival tiêu đồ ăn người kéo.

**Player Actions:** Kéo xe, tạo tuyến, chọn mức tồn kho mục tiêu và ưu tiên đơn. **NPC Actions:** Nhận việc, đến bốc hàng, đi qua tuyến, trả hàng; đóng vai world carrier khi xa.

**Simulation Logic:** Requested → Reserved → Loaded → InTransit → Delivered; Blocked khi tuyến hỏng, Cancelled chỉ trả hàng theo trạng thái. Throughput tham chiếu = payload/(thời gian đi + về + bốc dỡ). Với 120 kg, chặng 240 m, vận tốc 2 m/s, 40 giây bốc dỡ mỗi đầu: 120/(120 + 120 + 80) = 0,375 kg/s = 22,5 kg/phút. **Offline Behavior:** Carrier xa đi theo edge ETA, vẫn kiểm cầu và nguy hiểm theo tick; không teleport hàng khi đến ETA trong tuyến đã đứt.

**Failure States:** Cầu hỏng, kho đầy, carrier bệnh, cargo bị đặt trước bởi đơn khác. **Emergent Outcomes:** Tuyến đảm bảo thuốc giữ làng sống được dù làng không sản xuất thuốc.

**UI Presentation:** Mỗi tuyến 3 thông tin: hàng đang ở đâu, nghẽn vì sao, việc khắc phục. **Performance Considerations:** Path cấp graph xa; actor/render entity chỉ vật chất hóa ở vùng nhìn.

**Edge Cases:** Hai người nhìn thấy cùng xe phải chung shipmentId; đứt tuyến ở tick Delivered phải kiểm revision trước commit. Cướp hàng tại kho đích trước claim là truy cập trái phép. **Future Expansion:** Đội xe, trạm trung chuyển, đường sắt; không conveyor belt MVP.

## 25 Transportation

**Purpose:** Làm đầu tư hạ tầng thay đổi khả năng đi lại. **Player Experience:** Tuyến tốt rút ngắn chuyến đi, phương tiện lớn đòi hỏi đường phù hợp.

**Core Rules:** MVP đi bộ và xe kéo; đường phẳng đi bộ 3 m/s, kéo xe đầy 2 m/s, đất khó × 0,6. Xe cần lối rộng 2 m, cầu đủ capacity. Không teleport mặc định; rescue phần 13 là hệ thống thất bại, không là dịch vụ chuyển hàng. **Inputs:** Terrain, road condition, weight và vehicle capability.

**Outputs:** Thời gian, hao mòn và exposure. **Interactions With Other Systems:** Logistics phần 24 sở hữu cargo/state; exploration dùng chuyến đi để thu thập information.

**Player Actions:** Kéo thả xe, đổi tuyến và thiết lập điểm dừng. **NPC Actions:** Chọn đường theo chi phí gồm thời gian + rủi ro + phí đường, không luôn chọn đường ngắn nhất.

**Simulation Logic:** Mỗi edge cost dùng metre/velocity; router thêm phí/risk đã chuẩn hóa theo trọng số personality. Đổi đường khi đường hiện tại bị khóa hoặc phương án mới tốt hơn 20% để tránh dao động. **Offline Behavior:** World carrier đi theo lịch phần 24; xe player đỗ giữ quyền, có nhận job thì mới chạy.

**Failure States:** Quá tải, cầu hẹp, xe đứt bánh và không có tuyến an toàn. **Emergent Outcomes:** Cộng đồng dịch chuyển ra đường lớn, đường mòn bỏ hoang trở thành rừng.

**UI Presentation:** ETA kèm độ tin cậy, cảnh báo tuyến chưa khảo sát và cách xác nhận. **Performance Considerations:** Xe MVP không rigidbody; kinematic actor trên surface.

**Edge Cases:** Player đang kéo disconnect thì xe đỗ điểm hợp lệ cuối, không đi 60 giây vô lệnh. **Future Expansion:** Boat/bicycle ở Alpha, xe tải nhỏ ở 1.0; rail là đại dự án, aircraft ngoài kế hoạch 1.0.

## 26 Exploration

**Purpose:** Tạo kiến thức có ích cho quyết định. **Player Experience:** Khám phá được nguồn nước, hàng phế liệu và cơ hội hợp tác có thể thay đổi kế hoạch của nhóm.

**Core Rules:** Vùng chưa biết không hiển thị trạng thái chính xác; ruin loot stock hữu hạn. Tỷ lệ nội dung đặt trước MVP: 1 ruin, 2 settlement và các điểm quan trắc tạo từ seed. **Inputs:** Đường đi, line of sight, rumor và archives.

**Outputs:** Observation timestamp, POI state và knowledge record. **Interactions With Other Systems:** Map phần 27 lưu độ tươi; quest phần 66 có thể khởi phát nhờ bằng chứng, ruin phần 69 giữ nguồn gốc.

**Player Actions:** Khảo sát, chụp và ghi chú game, đánh dấu, chia sẻ, lấy mẫu và trở lại. **NPC Actions:** Kể rumor có nguồn, đi ra đường và cập nhật tin ở chợ.

**Simulation Logic:** Discovery event ghi duy nhất người khám phá đầu tiên, observation sau cập nhật thời gian; đọc map người khác sao chép information, không spawn loot. **Offline Behavior:** POI tiếp tục thay đổi, hồ sơ khám phá không tự làm mới.

**Failure States:** Bản đồ cũ, chuyến đi thiếu tiếp tế, loot đã được thu hồi. **Emergent Outcomes:** Một POI cũ trở thành trạm NPC, khiến mang hàng trao đổi hữu dụng hơn săn loot.

**UI Presentation:** Dấu hiệu thấy tại chỗ, lời NPC, mặt cắt địa hình và ghi chú đủ đọc. **Performance Considerations:** Discovery theo chunk, không tính visibility cho mọi tile xa.

**Edge Cases:** Co-op khám phá đồng thời lưu nhóm tham gia, không là cuộc thi đánh last-hit. **Future Expansion:** Radio, tháp quan trắc và drone; vệ tinh nằm ngoài 1.0.

## 27 Map & Information System

**Purpose:** Giữ thông tin có nguồn và tuổi, giúp quyết định trong thế giới thay đổi. **Player Experience:** Thấy cây cầu từng hoạt động nhưng lần xác nhận đã lâu; có thể hỏi thương nhân thay vì tự chạy đi.

**Core Rules:** Observation {subjectId, value, observedAt, sourceId, confidence, visibilityScope}; bản đồ không đọc server truth của chủ thể chưa được báo tin. Confidence Confirmed/Reported/Rumor, thông tin trái dấu hiện cả 2 nguồn. **Inputs:** Khám phá phần 26, radio, người đưa tin và member chia sẻ.

**Outputs:** Bản đồ theo tri thức của người/nhóm, cơ hội khảo sát và độ chắc chắn ETA. **Interactions With Other Systems:** Trade phần 64 và quest phần 66 tách “được biết” với “thực tế”; Chronicle phần 79 cũng có quyền xem.

**Player Actions:** Lọc, tạo pin, chia sẻ hoặc thu hồi quyền ghi notes. **NPC Actions:** Mua/bán tin, truyền tin qua mạng dựa trên tuyến thật.

**Simulation Logic:** Độ tươi age = worldNow − observedAt; ví dụ cầu trên 2 ngày game chưa được nhìn lại hiện “chưa xác nhận gần đây”, không tự báo hỏng. Chat ngoài game vẫn dùng được; communication infrastructure tác động tin NPC, tự động cập nhật map và hợp đồng, không cấm bạn nói chuyện. **Offline Behavior:** age cộng theo giờ đã mô phỏng, chặn ở khi ngủ đông.

**Failure States:** Quyết định dựa vào tin cũ hoặc tin nhầm. **Emergent Outcomes:** Người khảo sát có giá trị kinh tế và xã hội mà không cần săn đồ.

**UI Presentation:** “Cầu hoạt động · xác nhận 2 ngày trước · người đưa tin Nara”; overlay tùy chọn chứ không đầy biểu đồ. **Performance Considerations:** Lưu snapshot tri thức cho chủ thể quan trọng; không lưu mọi frame quan sát.

**Edge Cases:** Có tri thức không tự được quyền truy cập trạm xa hoặc nội dung kho; thu hồi quyền nhóm không xóa ký ức đã biết, nhưng ngừng nhận tin mới. **Future Expansion:** Cartography trade, mạng radio có độ trễ và ký lục nguồn gốc bằng chứng.
