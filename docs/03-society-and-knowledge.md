# Society, Economy, Narrative & Knowledge

Game Design Bible · The Unfinished Earth · v0.1 · Sections 45–74

Các giá trị cân bằng dưới đây là giả thuyết cần đo trong prototype. Một ngày game bằng 30 phút thực; một năm gồm 120 ngày. “Ngày” trong chương này luôn là ngày game. Khi cả nhóm vắng mặt, mọi hệ thống chỉ chạy trong cửa sổ tối đa 72 giờ thực kể từ lúc vắng người, rồi ngủ đông; khởi động lại máy chủ không mở cửa sổ mới. Chính sách này áp dụng cả khi máy chủ chạy liên tục lẫn khi tải lại save. Các hệ thống con được ghi rõ kế thừa toàn bộ 16 nhãn của hệ thống cha; phần riêng mô tả quy tắc thay đổi hoặc bổ sung, không miễn trừ yêu cầu offline, hiệu năng hay xử lý lỗi.

## 45 NPC Architecture

**Purpose; Player Experience.** NPC là cư dân có quyền lợi và lịch sử riêng. Người chơi nhận ra cùng một người bán hàng sau khi cầu hỏng: họ đổi tuyến đi làm, thiếu hàng và nhớ ai giúp sửa cầu.

**Core Rules; Inputs.** MVP bắt đầu với 24 người trưởng thành có ID cố định, chia giữa hai làng. Hồ sơ chứa tuổi, tính cách, nghề, sức khỏe, nhà, tài sản và quan hệ; quyết định đọc trạng thái đó cùng nhu cầu, luật địa phương và việc có thể làm.

**Outputs; Interactions With Other Systems.** AI chỉ phát yêu cầu hành động hợp lệ. Giao dịch vật phẩm, trả lương, di chuyển nơi ở và biến cố đều đi qua cùng giao dịch thế giới, nối NPC với logistics, kinh tế và Chronicle.

**Player Actions; NPC Actions.** Người chơi có thể đề nghị hợp đồng, trợ giúp hoặc thương lượng. NPC nhận, từ chối, đổi việc, nghỉ ngơi hay rời làng theo lợi ích; không có lệnh điều khiển cư dân như đơn vị RTS.

**Simulation Logic; Offline Behavior.** Chu trình là `Observe → Rank → Reserve → Act → Commit → Reconsider`. Ngoại tuyến dùng lịch và giao dịch theo ngày, không giả vờ đã đi một tuyến bị chặn. ID, sở hữu và hậu quả được giữ nguyên.

**Failure States; Emergent Outcomes.** Nếu đường mất giữa hành trình, NPC tới điểm an toàn rồi lập kế hoạch lại. Một thợ sửa cầu bị ốm có thể khiến vận chuyển đình trệ, tạo cơ hội cho người có nghề khác học việc.

**UI Presentation; Performance Considerations.** Tương tác hiện tên, việc đang làm và một lý do ngắn. Chỉ tác nhân gần người chơi chạy lựa chọn chi tiết; không tìm đường cho toàn dân mỗi khung hình.

**Edge Cases; Future Expansion.** NPC chết không được tái tạo từ mẫu dân số. Alpha bổ sung hộ gia đình, sinh sản và cohort nhưng vẫn giữ mọi ID từng được đặt tên; AI hội thoại sinh văn bản không nằm trong MVP.

```ts
type Citizen = {
  id: UUID; revision: number; birthDay: number;
  alive: boolean; settlementId?: UUID; householdId?: UUID;
  traits: Record<Trait, number>; needs: Record<Need, number>;
  occupation?: JobId; ownedInventoryId: UUID;
  homeId?: UUID; currentTask?: TaskReservation;
  importantMemoryIds: UUID[]; relationshipIds: UUID[];
};
// Task commit kiểm tra actor còn sống, revision, reservation,
// vị trí hợp lệ và tồn kho trước khi thay đổi bất kỳ số dư nào.
```

## 46 NPC Personality

Hệ thống con kế thừa toàn bộ hợp đồng 16 nhãn của **45. NPC Architecture**. MVP dùng bốn trục `caution`, `sociability`, `stewardship`, `tradition` trong [0,1]. Trục định hướng lựa chọn, không biến nhân vật thành kiểu người cố định. Giá trị là mức ưu tiên như an toàn gia đình, công bằng phân phối hoặc giữ đất canh tác; chúng không đồng nghĩa thiện–ác.

Tính cách chỉ điều chỉnh trọng số tối đa ±25% quanh giá trị nền. Người táo bạo vẫn ăn khi đói và không chọn việc chắc chắn gây chết vì bonus tính cách. Tình trạng tức thời như hoảng loạn tồn tại riêng, có nguyên nhân và thời hạn. Hạt giống tạo nhân vật được lưu; tải lại save không đổi tính cách.

UI mô tả hành vi đã quan sát: “thường tránh qua sông khi nước cao”. Không công khai toàn bộ hồ sơ tâm lý. Alpha cho giá trị thay đổi sau biến cố lớn, tối đa 0,05 mỗi mùa, kèm event nguồn; không đổi ý chỉ vì người chơi lặp một câu thoại.

## 47 NPC Needs

**Purpose; Player Experience.** Nhu cầu khiến làng tự vận hành: người thiếu ăn tìm thực phẩm, người kiệt sức nghỉ, thợ thiếu dụng cụ đổi công việc. Người chơi đọc được nguyên nhân qua hành vi.

**Core Rules; Inputs.** Năm biến `food`, `water`, `rest`, `shelter`, `safety` đo mức thiếu hụt [0,1]. Chúng đọc tồn kho, khả năng tiếp cận, giờ lao động, nhà và rủi ro; không chỉ đọc số hàng toàn làng.

**Outputs; Interactions With Other Systems.** Nhu cầu tạo ưu tiên mua, nhận cứu trợ, nghỉ và di cư. Thiếu kéo dài giảm giờ làm trước khi làm tăng bệnh hoặc tử vong, tạo vòng phản hồi với nguồn cung.

**Player Actions; NPC Actions.** Người chơi giao khẩu phần, xây giếng hoặc tạo việc làm. NPC phân bổ ngân sách, chia tài nguyên trong hộ và xin trợ cấp; không phải mọi người đều nhường đồ cho người chơi.

**Simulation Logic; Offline Behavior.** Mức khẩn cấp được tính trước lịch làm việc. Cùng lượng tiêu thụ theo ngày áp dụng gần, xa và offline; nhu cầu không dừng riêng vì người chơi rời làng.

**Failure States; Emergent Outcomes.** Có lương nhưng hàng không tới vẫn gây thiếu ăn. Cứu trợ một làng có thể hút người từ nơi khác; ưu tiên nhu yếu phẩm có thể làm dự án cầu chậm.

**UI Presentation; Performance Considerations.** NPC nói “hai ngày chưa nhận đủ nước”, làng hiện số ngày dự trữ. Chỉ tính lại lựa chọn khi nhu cầu vượt ngưỡng, công việc kết thúc hoặc nguồn cung đổi.

**Edge Cases; Future Expansion.** Không để worker trong homestead được bảo vệ chết vì chủ offline; họ chuyển trú ẩn/ngủ việc, ngừng tiêu thụ và sản xuất. Alpha bổ sung chất lượng thực phẩm và chăm sóc người phụ thuộc.

```text
deficit[n,d+1] = clamp(deficit[n,d] + dailyNeed[n] - received[n], 0, 1)
utility(a) = Σ weight[n] * urgency(deficit[n]) * expectedRelief(a,n)
             + wageValue(a) - travelCost(a) - riskCost(a)
urgency(x) = x²; emergency nếu food hoặc water >= 0.85
Chọn việc mới nếu utility mới > utility hiện tại + 0.10;
emergency được ngắt việc ngay. MVP giữ nguyên reservation và tiến độ
khi pause; hủy trước hoàn tất giải phóng reservation đúng một lần.
Chi phí sinh hoạt đã commit riêng không được hoàn lại.
```

Khẩu phần NPC là đơn vị định mức: một người trưởng thành cần một khẩu phần thực phẩm mỗi ngày. Vật phẩm quy đổi qua `nutritionUnits`; đơn vị này không tự đặt tần suất ăn hay chỉ số sinh tồn của nhân vật người chơi.

## 48 NPC Memories

**Purpose; Player Experience.** Quan hệ được xây qua việc có thật. NPC có thể nhớ một lần cứu mạng lâu hơn nhiều lần bán hàng, đồng thời biết rằng người giúp mình từng làm hại dòng sông.

**Core Rules; Inputs.** Ký ức luôn trỏ `eventId`, người liên quan, mức tin cậy và cách biết: chứng kiến, được kể hoặc đọc. Sổ cái sự kiện là sự thật máy chủ; ký ức là cách cư dân hiểu sự kiện đó.

**Outputs; Interactions With Other Systems.** Ký ức điều chỉnh tin cậy, sợ hãi, nghĩa vụ và quan điểm chính sách. Một sự kiện có thể tạo hai đánh giá trái dấu ở hai người có quyền lợi khác nhau.

**Player Actions; NPC Actions.** Người chơi giải thích, đưa bằng chứng hoặc bồi thường. NPC kể chuyện trong mạng quan hệ, kiểm chứng khi có hồ sơ; không tự biết hành vi ở vùng chưa có kênh truyền tin.

**Simulation Logic; Offline Behavior.** Ký ức thường giảm sức ảnh hưởng theo ngày. Cứu mạng, giết người thân, mất nhà vĩnh viễn và nhận con nuôi giữ bản ghi cá nhân suốt đời; thời gian vẫn có thể thay đổi cảm xúc.

**Failure States; Emergent Outcomes.** Tin đồn sai có thể làm mất hợp đồng. Khi có đính chính, NPC cập nhật niềm tin nhưng không xóa tổn thất đã xảy ra; bồi thường có tác dụng riêng.

**UI Presentation; Performance Considerations.** Hội thoại hiện một đến ba nguyên nhân liên quan. Giữ tối đa 32 ký ức thường hoạt động/NPC; bản cũ gộp theo đối tượng và loại, sự kiện vĩnh viễn không bị loại theo hạn mức này.

**Edge Cases; Future Expansion.** Gửi cùng event nhiều lần không nhân ảnh hưởng. Mâu thuẫn nguồn được lưu riêng; Chronicle không coi lời đồn là sự thật. Alpha thêm truyền miệng giữa thế hệ qua người kể hoặc tài liệu cụ thể.

```text
effectiveWeight = initialWeight * confidence * 2^(-ageDays / halfLifeDays)
halfLife: giao dịch thường 12 ngày; giúp việc đáng kể 60 ngày.
permanent=true: giữ eventRef và narrative tag; emotionalWeight
có thể giảm, nhưng floor riêng cho hệ quả quan hệ tối đa 0.25.
Unique key: (npcId, eventId, interpretationVersion).
```

“Vĩnh viễn” là không quên rằng việc đã xảy ra, không phải cấm tha thứ. Kho ký ức vĩnh viễn lưu tham chiếu nhỏ; chi tiết dùng chung nằm trong kho lịch sử lưu trữ.

## 49 NPC Relationships

Hệ thống con kế thừa toàn bộ 16 nhãn của **48. NPC Memories** và cách thực thi hành động của **45. NPC Architecture**. Quan hệ có hướng: A tin B không đồng nghĩa B tin A. Lưu `trust`, `fear`, `obligation`, `familiarity` và thẻ quan hệ; không cộng thành một điểm yêu thích duy nhất.

Hợp đồng tín dụng yêu cầu trust; trao tin nguy hiểm cần cả trust lẫn familiarity; fear có thể tạo tuân phục ngắn hạn nhưng tăng ý muốn rời đi. Giao dịch nhỏ lặp lại bị giới hạn đóng góp quen biết một lần/ngày/cặp, tránh mua một viên đá hàng nghìn lần để trở thành bạn thân.

MVP chỉ cập nhật các cặp từng tương tác hoặc cùng hộ/nhóm làm việc, không tạo ma trận N². Người đã chết chuyển cạnh quan hệ thành tham chiếu lịch sử, không xóa ký ức. Hôn nhân và sinh con thuộc alpha: cần hai người đồng thuận theo mô hình quan hệ và năng lực hộ gia đình; không thưởng sinh sản vì spam quà.

## 50 NPC Careers

Hệ thống con kế thừa toàn bộ 16 nhãn của **45. NPC Architecture**. MVP có nhóm nghề người trồng trọt, người thu gom, thợ xây/sửa, người vận chuyển và người trao đổi; đây là phân công với năng lực, không phải class khóa cứng. Một người có nghề chính nhưng vẫn tự kiếm ăn khi làng thiếu hàng.

`jobScore = expectedRealWage + suitability + socialFit - commute - risk`. Chỉ xét đổi việc lúc bình minh hoặc khi việc hiện tại mất điều kiện. Công việc phải có người trả, vật tư và vị trí; “cần thợ” không tự sinh việc có lương. Đề nghị tốt hơn cần giữ ưu thế ba ngày để tránh đổi nghề liên tục; mất việc cho phép tìm ngay.

Đào tạo tốn giờ của cả thầy lẫn học viên, dụng cụ và đầu vào thực hành. Kỹ năng cải thiện chất lượng/tốc độ trong giới hạn, không mở khóa vật phẩm bằng cấp độ. Người chơi thuê theo ca hoặc đầu việc, không giành quyền điều khiển NPC. Một thợ chuyển làng mang năng lực đi, không tự chuyển tài sản của nơi làm cũ.

## 51 NPC Aging

Hệ thống con kế thừa toàn bộ 16 nhãn của **45. NPC Architecture**. Tuổi tính bằng `(worldDay - birthDay) / 120`, độc lập số phiên truy cập. 100 giờ thế giới mô phỏng là 1,67 năm; 1.000 giờ là 16,67 năm. Không mô tả một em bé thành người lớn sau vài chục giờ thực.

MVP có người trưởng thành và ghi tuổi đúng đồng hồ; chết do thương tích hoặc thiếu hụt dùng hệ thống sức khỏe, không dùng chu kỳ thay NPC. Alpha mới có trẻ em, chăm sóc và già hóa. Một chu kỳ thai kỳ giả định dài 90 ngày, tuổi tự lập 18 năm; các giá trị xã hội không sao chép nhịp 365 ngày/năm ngoài đời.

Sức khỏe tuổi già thay đổi dần theo nhóm tuổi, không có ngày sinh nhật tự động giết nhân vật. Tử vong ghi nguyên nhân, chuyển sở hữu theo quy tắc thừa kế và cập nhật nơi làm việc trong một giao dịch. Người chơi không bắt buộc chết vì tuổi già. Thời gian ngủ đông không làm NPC tăng tuổi âm thầm; ngày sinh và worldDay phải cùng lịch.

## 52 NPC Population Simulation

**Purpose; Player Experience.** Dân số thay đổi vì sinh, chết và di cư có nguồn gốc. Người đến làng cần nhà và thức ăn; một bảng dân số tăng không được che giấu vật phẩm hay nhân vật sinh vô cớ.

**Core Rules; Inputs.** MVP giữ từng người trong 24 ID ban đầu. Alpha có thêm cohort theo nơi ở, nhóm tuổi và vai trò; mọi NPC đã có danh tính tiếp tục tồn tại độc lập ở mọi khoảng cách.

**Outputs; Interactions With Other Systems.** Dân số cung cấp lao động, nhu cầu hàng hóa và áp lực nhà ở. Mỗi chuyển hộ đổi cả số dân, sức mua, suất ăn và nơi giữ tài sản.

**Player Actions; NPC Actions.** Người chơi tạo chỗ ở hoặc tài trợ đoàn di cư. Cư dân xét rời đi khi điều kiện sống xấu kéo dài, chỉ lên đường nếu có nơi đến hoặc lựa chọn trú tạm.

**Simulation Logic; Offline Behavior.** Mọi ngày kiểm tra bảo toàn `Pnext = P + births - deaths + arrivals - departures`. Cohort phân bổ lao động và tiêu thụ bằng cùng định mức cá thể; catch-up không cộng thêm “dân tăng tự nhiên”.

**Failure States; Emergent Outcomes.** Làng hứa việc nhưng thiếu nhà tạo khu trú tạm và chi phí cứu trợ. Thiếu người vận chuyển có thể dẫn đến đói dù vùng còn nhiều thực phẩm.

**UI Presentation; Performance Considerations.** Biến động dân số luôn có dòng giải thích và điểm đến biết được. Chỉ chia cohort khi khác quy tắc tiêu thụ, sức khỏe hoặc quyết định; không tạo tổ hợp thuộc tính vô hạn.

**Edge Cases; Future Expansion.** Cá thể chuyển từ cohort sang named dùng giao dịch trừ một người khỏi cohort, tạo ID và phần tài sản tương ứng; không nhân bản. Nhập cư từ ngoài bản đồ chỉ alpha, có sổ nguồn, hạn mức và chi phí tiếp nhận rõ ràng.

MVP có thể chuyển người giữa hai làng; tổng cư dân thế giới giảm nếu có tử vong. Không bổ sung người để giữ cửa hàng luôn mở. Việc mất một nghề thiết yếu được giải bằng học việc, tự làm hoặc thay tuyến mua bán.

## 53 Simulation LOD

**Purpose; Player Experience.** Thế giới xa vẫn có hậu quả nhất quán; đến làng không làm bữa ăn xuất hiện lần hai hoặc khởi động lại mùa vụ.

**Core Rules; Inputs.** LOD A chạy tác nhân gần người chơi; B chạy lịch và sự kiện từng ID; C chạy settlement/cohort từ alpha. MVP chỉ dùng A/B cho con người. Mọi cấp cùng sổ tồn kho và ngày đã giải quyết gần nhất.

**Outputs; Interactions With Other Systems.** LOD thay cách lên lịch, không thay sản lượng, mức ăn, xác suất chết hay kết quả sở hữu. Chặn cầu làm giảm năng lực vận chuyển ở cả mô phỏng gần và xa.

**Player Actions; NPC Actions.** Người chơi tiếp cận sẽ nhìn thấy nhiệm vụ đang diễn ra. NPC được dựng tại điểm hợp lệ tương ứng tiến độ tuyến, tiếp tục phần việc còn lại, không nhận một nhiệm vụ mới miễn phí.

**Simulation Logic; Offline Behavior.** Chuyển cấp tại ranh giới actor tick bằng `freeze → reconcile → materialize/dematerialize → resume`. Ngày macro xử lý một lần theo `lastDailyTick`; catch-up dùng đúng hàm ngày thường.

**Failure States; Emergent Outcomes.** Thiếu điểm dựng an toàn khiến NPC ở điểm trú gần nhất và chậm hành trình, không xuất hiện trong tường. Đoàn buôn có thể đang mắc kẹt khi nhóm trở lại.

**UI Presentation; Performance Considerations.** Khoảng cách không hiện như nhãn LOD. Tối đa 128 tác nhân NPC/động vật chạy đầy đủ trong tổng vùng quan tâm của cả nhóm tám người; vượt ngân sách thì giảm nhịp AI có ưu tiên.

**Edge Cases; Future Expansion.** Cư dân đang được giao dịch, bị thương hoặc mang hàng thiết yếu giữ tương tác được dù giảm nhịp quyết định. Alpha kiểm thử đối chiếu chạy cùng seed ở A/B/C; chênh lệch ledger bằng không, đường đi được phép khác.

```text
Không giải quyết production/consumption từ animation hoặc AI frame.
scheduleWork(actor, interval) -> WorkReservation
resolveWork(reservation, worldTick) -> committed quantity delta
lodTransfer giữ reservationId, resolvedWork và vị trí tiến độ.
Daily macro chỉ xử lý phần work chưa commit; không chạy lại trọn ngày.
```

## 54 Settlement System

**Purpose; Player Experience.** Làng là nơi ở, làm việc, trao đổi và quyết định chung. Sửa một công trình cải thiện đời sống nếu nó giải được một giới hạn thực tế.

**Core Rules; Inputs.** Làng có danh sách cư dân, nhà, công việc, kho, ngân sách, quyền đất và chính sách. MVP khởi tạo hai làng quy mô nhỏ; nhãn Camp/Hamlet/Village chỉ mô tả trạng thái, không cấp buff.

**Outputs; Interactions With Other Systems.** Làng phát nhu cầu lao động, đơn mua hàng, kế hoạch sửa chữa và lời mời định cư; mọi đề xuất phải tính khả năng tiếp cận nước, thực phẩm và đường vận tải.

**Player Actions; NPC Actions.** Người chơi góp hàng, xây công trình được chấp thuận hoặc nhận hợp đồng. Cư dân tiêu dùng, đóng góp, phản đối, sửa chữa và bầu/chọn người điều hành theo mô hình chính quyền.

**Simulation Logic; Offline Behavior.** Bình minh chốt tiêu thụ, ngân sách, phân việc và chỉ số thiếu hụt; các sự kiện khẩn cấp có thể ngắt lịch. Làng NPC vẫn hoạt động trong cửa sổ mô phỏng offline, không chịu hạn mức sản xuất homestead của người chơi.

**Failure States; Emergent Outcomes.** Nhà đủ nhưng nước thiếu không tạo tăng trưởng. Chính quyền có thể bỏ dự án trang trí để sửa cầu, làm nhóm cư dân kỳ vọng dự án cũ bất mãn.

**UI Presentation; Performance Considerations.** Bảng làng hiện ba nút thắt lớn nhất, ngày dự trữ và việc đang được tài trợ. Tổng hợp cache theo ngày; cập nhật khẩn cấp chỉ khi đầu vào liên quan đổi.

**Edge Cases; Future Expansion.** Công trình nhiều chủ phải chỉ định bên trả bảo trì và quyền dùng kho. Alpha cho thêm vùng và làng mới khi có đoàn sáng lập thật; không sinh thị trấn trên ô thuận lợi chỉ vì điểm hấp dẫn cao.

## 55 Settlement Growth

Hệ thống con kế thừa toàn bộ 16 nhãn của **54. Settlement System**. Tăng trưởng đòi hỏi người mới đến hoặc sinh ra; lượng nhà thừa không tự sinh dân. `capacity = min(housingSlots, waterSupportedPeople, foodSupportedPeople)` là mức kiểm tra, không phải dân số mục tiêu bắt buộc đạt.

Một đề nghị mở rộng chỉ được tài trợ khi tồn kho dự trữ ít nhất sáu ngày, có vật tư không bị đặt trước, ít nhất một lao động khả dụng và đường tiếp cận. Hội đồng có thể vượt ngưỡng này trong khẩn cấp nhưng phải hiển thị chi phí cơ hội. Hạng làng đổi sau mười ngày liên tiếp đạt tiêu chí dân số và dịch vụ; hạng giảm cũng dùng độ trễ để tránh nhấp nháy.

MVP đo phát triển bằng số nhà sử dụng được, công việc được đáp ứng, mức ăn ổn định và công trình sửa xong. Không cần tăng quy mô dân số để chứng minh làng phát triển. Alpha cho hình thành khu nghề nếu đủ dòng hàng và lao động, không dùng nút “nâng cấp town level”.

## 56 Settlement Collapse

**Purpose; Player Experience.** Suy tàn là một chuỗi có thể thấy, can thiệp và ghi lại. Người chơi có thời gian đọc dấu hiệu trước khi một địa điểm bị bỏ hoang.

**Core Rules; Inputs.** Trạng thái `Stable → Strained → Crisis → Evacuating → Abandoned`. Đầu vào gồm tỷ lệ đáp ứng ăn/nước, dân số, nhà an toàn, dòng tiền và tuyến thoát; một chỉ số xấu đơn lẻ chưa xóa làng.

**Outputs; Interactions With Other Systems.** Khủng hoảng tạo phân phối khẩn cấp, nghỉ việc, di cư và nợ hợp đồng. Bỏ hoang để lại tài sản, công trình xuống cấp, nghĩa địa và hồ sơ quyền sở hữu.

**Player Actions; NPC Actions.** Người chơi cứu trợ, phục hồi tuyến hoặc hỗ trợ sơ tán. NPC ưu tiên sống sót, mang tài sản trong sức chở, bỏ hàng nặng khi cần; không chuyển toàn kho tới nơi mới tức thì.

**Simulation Logic; Offline Behavior.** Thiếu ít nhất 25% nhu yếu phẩm ba ngày tạo Strained; thiếu 50% ba ngày hoặc mất nguồn nước an toàn tạo Crisis. Đủ cung bốn ngày đưa về Strained, thêm sáu ngày ổn định mới hồi phục.

**Failure States; Emergent Outcomes.** Nếu điểm đến không nhận thêm người, đoàn ở trại tạm có tồn kho hữu hạn. Cứu làng bằng bán hết dụng cụ có thể trì hoãn sản xuất mùa sau.

**UI Presentation; Performance Considerations.** Mỗi chuyển trạng thái nêu ngưỡng, nguồn và thời gian dự kiến. Mô phỏng giữ đồng hồ khủng hoảng theo ngày; chỉ đánh giá lại toàn bộ nguyên nhân khi dữ kiện đổi.

**Edge Cases; Future Expansion.** Abandoned cần không còn cư dân tại chỗ lẫn hộ dự định quay về trong ba ngày; không xóa ID làng. Offline có thể suy tàn trong giới hạn 72 giờ thực; homestead được bảo vệ không trở thành phế tích theo quy tắc này.

## 57 Player Settlements

**Purpose; Player Experience.** Nhóm có nơi ở an toàn và có thể gây dựng cộng đồng công khai trong thế giới. Cư dân tham gia vì điều kiện sống và thỏa thuận, không vì người chơi đặt cờ.

**Core Rules; Inputs.** Mỗi nhóm chỉ có một homestead tối đa 32×32 m, không chặn đường công cộng hoặc dòng sông. Phần lõi, sở hữu và đồ không hỏng được bảo vệ cả online; khu công cộng bên ngoài chịu quy luật thế giới.

**Outputs; Interactions With Other Systems.** Nhà, kho, lương, dịch vụ và chính sách tạo sức hấp dẫn định cư. Nhận cư dân phát sinh trách nhiệm tiêu dùng, quyền tiếp cận và đường vận chuyển.

**Player Actions; NPC Actions.** Người chơi đặt ưu tiên công việc và đề nghị hợp đồng. NPC có thể từ chối hoặc rời đi đúng điều khoản; lao động không phải tài sản chuyển theo quyền sở hữu tòa nhà.

**Simulation Logic; Offline Behavior.** Công việc nhà dùng tín dụng offline tích từ chơi tích cực, tối đa tám giờ thực. Hết tín dụng, vật tư hoặc an toàn kết nối thì việc dừng; worker trú an toàn và không tiêu hao đầu vào khi ngủ việc.

**Failure States; Emergent Outcomes.** Kết nối điện/nước bên ngoài có thể hỏng mà nhà vẫn nguyên vẹn. Nhóm phải quyết định dùng hàng cứu làng hay dự trữ để duy trì sản xuất của mình.

**UI Presentation; Performance Considerations.** UI phân biệt ranh giới được bảo vệ, công trình công cộng và ngân sách việc offline còn lại. Lịch lao động dùng giao dịch công việc giống NPC khác, chỉ thêm điều kiện tín dụng.

**Edge Cases; Future Expansion.** Không cộng thêm tám giờ vì đăng nhập lại; một phút chơi tích cực đã xác minh nạp một phút, trần tám giờ. Chuyển public estate thành di sản NPC cần hành động xác nhận rõ ràng, không kích hoạt do vắng mặt.

MVP ưu tiên homestead và đóng góp cho hai làng có sẵn. Thành lập chính quyền người chơi đầy đủ, tuyển đoàn sáng lập và quản lý public estate là alpha. Việc protected overlay ngăn hư hại nhà không được làm đổi dòng nước công cộng.

## 58 Governance

**Purpose; Player Experience.** Chính quyền thay cách quyết định, phân phối hàng và chịu trách nhiệm. Chính sách có người được lợi và người chịu chi phí, không phải chọn biểu tượng để nhận phần trăm bonus.

**Core Rules; Inputs.** MVP có hội đồng làng cố định và hai đề xuất hữu hạn: ưu tiên khẩu phần, ngân sách sửa công trình. Alpha thêm hợp tác xã và lãnh đạo tập trung; mỗi mô hình định nghĩa ai đề xuất, biểu quyết, phủ quyết và thi hành.

**Outputs; Interactions With Other Systems.** Policy sửa trực tiếp quyền lấy kho công, thứ tự hợp đồng, thuế và giới hạn khai thác. Chi ngoài ngân sách bị từ chối; thuế tạo chuyển số dư thật, không sinh thêm tiền.

**Player Actions; NPC Actions.** Người chơi đưa đề xuất và hàng tài trợ. NPC bỏ phiếu theo nhu cầu hộ, giá trị và bằng chứng; người thi hành cần thời gian, vật tư và đường tới nơi.

**Simulation Logic; Offline Behavior.** Luồng `Proposed → Deliberating → Accepted/Rejected → Scheduled → Active → Repealed`. Thảo luận hai ngày, hiệu lực từ bình minh tiếp theo; máy chủ lưu người có quyền biểu quyết tại lúc mở phiên.

**Failure States; Emergent Outcomes.** Nghị quyết sửa cầu thiếu gỗ ở kho sẽ ở Scheduled với lý do thiếu đầu vào. Ration ưu tiên trẻ nhỏ có thể gây bất mãn ở lao động nặng dù tổng số người sống sót tăng.

**UI Presentation; Performance Considerations.** Phiếu chính sách hiện thay đổi thao tác, ngân sách, người chịu ảnh hưởng và thời điểm hiệu lực. Chỉ đánh giá lại phiếu khi có event liên quan, không chạy tranh luận từng frame.

**Edge Cases; Future Expansion.** Luật mới không tịch thu ngược hàng đã bán hoặc hủy thanh toán đã commit. Alpha thêm vi phạm, khiếu nại và mất tính chính danh; nổi loạn cần lực lượng, nguồn lực và bất mãn kéo dài, không tung xúc xắc theo tên chính thể.

```text
Policy ration_priority v1:
  eligibleInventory = publicFoodStore
  reserve = 2 ngày nhu cầu tối thiểu của cư dân đã đăng ký
  allocationOrder = emergencyHealth, dependents, equalAdultShares
  exportAllowed = stockAfterReserve > 0
  enforcement = chỉ điều khiển kho công; không mở khóa kho tư nhân
  evaluation = mỗi bình minh, ghi allocation transaction và unmetDemand
```

## 59 Factions

**Purpose; Player Experience.** Phe là tổ chức theo đuổi lợi ích qua người, tài sản và chính sách. Người chơi có thể giúp một cộng đồng mà vẫn bất đồng với lãnh đạo của nó.

**Core Rules; Inputs.** MVP dùng hai nhóm cư dân gắn hai làng, quan hệ trao đổi và quyền công trình. Alpha mới có phe nhiều làng, phe tách/nhập và phe người chơi; lịch sử được viết sẵn không cấp nguồn lực miễn phí.

**Outputs; Interactions With Other Systems.** Phe tạo điều ước, ngân sách liên làng, quyền đi qua và mục tiêu hạ tầng. Các quyết định đọc nguồn cung, ý thức hệ, quan hệ và khả năng thực thi.

**Player Actions; NPC Actions.** Người chơi thương lượng hoặc xin gia nhập. Thành viên đóng góp theo luật, rời tổ chức hoặc phản đối; một người bán hàng không biết mọi bí mật của phe.

**Simulation Logic; Offline Behavior.** Phe xét một ưu tiên chiến lược mỗi ngày và chỉ khởi động dự án đủ tài trợ. Các thay đổi offline có cùng độ trễ tin tức và giới hạn 72 giờ thực.

**Failure States; Emergent Outcomes.** Thiếu ngân sách làm nghĩa vụ hỗ trợ thất bại, tăng bất tín. Một tuyến thương mại mới có thể làm hai làng hợp tác dù giữ giá trị khác nhau.

**UI Presentation; Performance Considerations.** Hiện cam kết, lãnh thổ ảnh hưởng đã biết và đại diện có thẩm quyền. Cache quan hệ cấp phe; chỉ quan hệ cá nhân quan trọng mới tham gia quyết định chiến lược.

**Edge Cases; Future Expansion.** Tách phe phân tài sản theo chủ sở hữu và hợp đồng, không sao chép kho. Một phe hết thành viên thành tổ chức lịch sử, không xóa nợ hoặc sự kiện liên quan; tái lập cần tổ chức mới có quan hệ kế thừa.

## 60 Territory

Hệ thống con kế thừa toàn bộ 16 nhãn của **59. Factions**. Influence đo năng lực hiện diện, không mặc nhiên là quyền sở hữu. Điểm làng, tuyến vận tải đang dùng và trạm có người phụ trách phát ảnh hưởng giảm theo chi phí di chuyển: `I(f,c) = Σ sourceStrength / (1 + travelCost/100m)`. Chỉ dùng đường khả thi; cầu gãy làm thay đổi phạm vi.

MVP hiển thị vùng phục vụ và thẩm quyền quanh hai làng; không có chiếm ô. Alpha có vùng tranh chấp khi hai ảnh hưởng lớn gần nhau, nhưng quyền xây vẫn kiểm tra lô đất và thỏa thuận riêng. Influence không chặn di chuyển bằng tường vô hình, không cho phép mở homestead của nhóm khác.

Mỗi nguồn có chi phí người/vật tư; đặt cờ rỗng không phát ảnh hưởng. Tính lại khi mạng đường hoặc nguồn thay đổi, có cache vùng ảnh hưởng. Tin bản đồ ghi ngày xác minh. Tuần tra tương lai có thể giảm trộm cắp, đồng thời làm cư dân phản đối kiểm soát; không biến territory thành buff thu nhập thụ động.

## 61 Diplomacy

**Purpose; Player Experience.** Ngoại giao biến lợi ích chung thành cam kết có điều khoản. Người chơi có thể giải quyết thiếu hụt bằng quyền đi qua hoặc trao đổi thay vì chiến đấu.

**Core Rules; Inputs.** MVP có thỏa thuận chuyển hàng, chia chi phí sửa cầu và cấp quyền dùng công trình. Điều khoản chỉ dùng loại hành động máy chủ kiểm chứng được; cần bên ký có thẩm quyền và tài sản bảo đảm.

**Outputs; Interactions With Other Systems.** Hiệp định tạo permission, hạn mức hàng, escrow và thời hạn. Đường giao hàng, tồn kho cùng luật làng quyết định điều khoản có thể thực hiện hay không.

**Player Actions; NPC Actions.** Người chơi đề xuất và ký. NPC đánh giá lợi ích, rủi ro và ký ức vi phạm, có thể đề nghị lượng ít hơn hoặc thời hạn dài hơn.

**Simulation Logic; Offline Behavior.** `Offer → Accepted → Active → Fulfilled/Expired/Breached`. Vi phạm chỉ phát sinh sau hạn và thời gian ân hạn đã ký; hợp đồng tiếp tục được đánh giá trong ngày offline được mô phỏng.

**Failure States; Emergent Outcomes.** Lũ được điều khoản bất khả kháng bao phủ có thể tạm hoãn; hợp đồng không có điều khoản ấy vẫn chịu hậu quả. Hai bên có động lực tài trợ tuyến dự phòng.

**UI Presentation; Performance Considerations.** Trước khi ký hiện chính xác lượng, nơi, hạn, phạt tối đa và tình trạng escrow. Dùng sự kiện và lịch deadline, không quét mọi điều ước mỗi tick.

**Edge Cases; Future Expansion.** Một lần giao chỉ đáp ứng một nghĩa vụ trừ khi hợp đồng chủ động cho phép phân bổ. Alpha thêm trung gian và đình chiến; quan hệ tốt không tự giải phóng tiền khỏi kho của bên khác.

## 62 War

**Purpose; Player Experience.** Chiến tranh là thất bại nghiêm trọng của quan hệ và nguồn cung, để lại thương vong, di tản và hạ tầng hỏng. Đây là hướng nghiên cứu sau phát hành, ngoài MVP, vertical slice và phạm vi cam kết 1.0. Ngoại giao, tranh chấp quyền đi qua và ngừng giao thương trước đó dùng hợp đồng kinh tế, không cần giao chiến.

**Core Rules; Inputs.** Xung đột cần tranh chấp cụ thể, quyết định phe, lực lượng và tiếp tế. Trạng thái `Tension → Mobilizing → Conflict → Negotiating → Truce`; không bắt đầu vì bộ đếm cần sinh nội dung.

**Outputs; Interactions With Other Systems.** Huy động rút người khỏi sản xuất; thương vong giảm dân thật; đoàn tị nạn mang lượng hàng có thể chuyên chở. Hạ tầng hỏng dùng cùng durability và lịch sửa thường.

**Player Actions; NPC Actions.** Người chơi cứu trợ, mở hành lang, thương lượng hoặc tham gia PvE. Phe chọn mục tiêu giữ được bằng lực lượng thực, dân tìm trú ẩn; không có PvP trong cấu hình mặc định.

**Simulation Logic; Offline Behavior.** Trận xa dùng ngày giao chiến, sức sẵn sàng và dự trữ, tính tổn thất có seed và trần theo quân tham gia. NPC có ID bị chọn theo vai trò/phơi nhiễm; không rút người chết mới từ cohort.

**Failure States; Emergent Outcomes.** Quân thắng nhưng mất nguồn lương có thể phải rút. Sơ tán giảm thương vong nhưng gây thiếu lao động nhiều mùa; đình chiến không khôi phục dân và kho.

**UI Presentation; Performance Considerations.** Báo cáo ghi nguồn tin, mất mát xác minh và vùng nguy hiểm. Đánh trận đầy đủ chỉ ở nơi có người chơi; ngày chiến sự và giao chiến gần dùng chung ngân sách lực lượng.

**Edge Cases; Future Expansion.** Không nhân đôi trận khi đổi LOD; tổn thất đã commit không được quay lại thành quân sống. Homestead không bị đánh phá; tuyến bên ngoài vẫn có thể mất. Trước khi triển khai phải vượt gate kinh tế, di cư, cứu trợ và tái thiết hoạt động hoàn chỉnh.

## 63 Economy

**Purpose; Player Experience.** Kinh tế chuyển vật phẩm tới người cần và làm rõ giá của việc dùng tài nguyên. Mỗi bữa ăn, cây cầu hay lương trả đều lấy từ nguồn có thật.

**Core Rules; Inputs.** MVP có đổi hàng và settlement-credit chung cho hai làng. Tiền lưu số nguyên minor units, 100 minor = 1 credit; mọi inventory có chủ, sức chứa, reservation và ledger.

**Outputs; Interactions With Other Systems.** Sản xuất, tiêu dùng, hao hụt, khai thác và giao dịch tạo dòng hàng; lương, mua bán, thuế và trợ cấp chuyển tiền. Thời tiết tác động lượng hàng qua sản xuất/vận chuyển trước khi giá phản ứng.

**Player Actions; NPC Actions.** Người chơi sản xuất, vận chuyển, mua bán hoặc tài trợ. NPC lập ngân sách nhu yếu phẩm trước, thuê lao động và mua đầu vào nếu lợi tức dự kiến đủ chi phí.

**Simulation Logic; Offline Behavior.** Mỗi giao dịch cân bằng số dư hai phía và ghi lý do tạo/tiêu hủy vật phẩm. Nền kinh tế NPC tiếp tục trong giới hạn mô phỏng offline; sản xuất homestead còn phải có tín dụng riêng.

**Failure States; Emergent Outcomes.** Tiền có thể cạn ở một làng dù hàng dồi dào; đổi hàng và cứu trợ là đường phục hồi. Người chơi không có người mua vô hạn cho mọi món làm ra.

**UI Presentation; Performance Considerations.** Hiện giá, sức mua còn lại và nguyên nhân thương nhân từ chối. Sổ cái dùng integer quantity theo đơn vị định nghĩa; tổng hợp theo vật phẩm/ngày để phân tích, giữ giao dịch gốc để kiểm toán.

**Edge Cases; Future Expansion.** Vật phẩm đang vận chuyển chỉ thuộc một inventory transit. Recycling hao hụt; khai mỏ giảm trữ lượng hữu hạn. Alpha có ngoại thương theo quota có nguồn và giá nhập; không hứa nền kinh tế luôn tăng hoặc mọi dịch vụ luôn tồn tại.

Bootstrap MVP cho **mỗi làng 12 người**:

| Nguồn ban đầu | Số lượng | Quy tắc |
|---|---:|---|
| Kho thực phẩm công | 48 khẩu phần | Bốn ngày định mức cư dân; cứu trợ theo policy |
| Kho người bán | 24 khẩu phần | Hàng có chủ, không tự bổ sung sau mỗi ngày |
| Kho hạt dự phòng | 9 kg thượng lưu; 3 kg hạ lưu | Hạt có chủ; dùng gieo/nấu phải trừ kho, không bổ sung tự động |
| Quỹ làng | 12.000 minor | Trả việc công và trợ cấp bằng chuyển số dư |
| Vốn cơ sở trao đổi | 8.000 minor | Tài khoản kinh doanh riêng, không trùng tiền túi chủ |
| Tiền cá nhân | 2.000 minor/người | 24 người toàn thế giới có tổng 48.000 minor |

Một ration item nặng 0,5 kg và đáp ứng một định mức thực phẩm NPC/ngày; đây là trừu tượng cân bằng. Khu vực kinh tế NPC khởi đầu có 144 ration, 12 kg grain dự phòng và 88.000 minor. Toàn vùng có 24 ô crop lệch pha, chia 18 ô ở thượng lưu và 6 ô ở hạ lưu, cùng lịch lao động theo §36 Vegetation; cây đang lớn thuộc sổ sinh khối, chưa là grain bán được. Dùng cùng định mức thu hoạch, giữ hạt gieo và recipe nấu để kiểm tra nguồn cung đầu game, không chỉ dựa vào sáu ngày ration dự trữ. Tổng tồn kho thế giới còn cộng đúng vật phẩm onboarding được khai báo trong seed; không tính chúng lần thứ hai ở kho NPC. Người chơi MVP bắt đầu với 0 minor, kiếm tiền bằng giao dịch hoặc công việc. Công cụ/vật liệu khác lấy từ bảng seed content, không cấp thêm khi đổi LOD. Ngân quỹ mua tối đa 12 ration/ngày/làng và tám đơn vị/ngày/loại vật liệu thông dụng, đồng thời phải có nhu cầu, sức chứa và tiền; quota là trần, không phải nghĩa vụ mua. Hạn mức không hồi vì reconnect. Không có nhập hàng ngoài vùng trong MVP.

```text
WorldStockNext = WorldStock + production + extraction + recordedImports
                 - consumption - spoilage - destruction - recordedExports
Trade giữa hai inventory nội bộ có net WorldStockDelta = 0.
MoneyNext = Money + explicitMint - explicitBurn;
MVP: explicitMint = explicitBurn = 0 sau bootstrap.
Thanh toán phí đi vào tài khoản dịch vụ có tên, không biến mất âm thầm.
```

## 64 Trade

**Purpose; Player Experience.** Thương mại biến đường sá thành lợi thế thực tế. Lợi nhuận giữa hai làng đòi hỏi có hàng, vốn, thời gian và khả năng chở tới nơi.

**Core Rules; Inputs.** Mua bán trực tiếp trao hàng và tiền nguyên tử khi hai bên ở đúng điểm. Chuyển xa tạo consignment có chủ hàng, người chở, tuyến, trọng lượng, nơi nhận và quy tắc mất mát.

**Outputs; Interactions With Other Systems.** Đơn hàng đặt trước lượng cụ thể, tạo công việc vận tải và kỳ vọng tồn kho tới hạn. Dự báo hàng đang tới không được tính như hàng đã dùng được.

**Player Actions; NPC Actions.** Người chơi mang hàng, dùng cart hoặc thuê chuyến. NPC gộp đơn theo sức chở, tránh tuyến nguy hiểm và định tuyến lại khi cầu mất; không teleport hàng lúc chuyển sang LOD xa.

**Simulation Logic; Offline Behavior.** `Quoted → Reserved → Loaded → InTransit → Delivered/Returned/Lost`. Mọi chuyển trạng thái kiểm tra revision; ETA dựa chiều dài/độ khó tuyến và thời gian bốc dỡ, tiếp tục tiến trong mô phỏng offline.

**Failure States; Emergent Outcomes.** Kho nhận đầy khiến xe chờ với hàng còn trên xe; hàng dễ hỏng vẫn có thể hỏng. Đầu cơ hàng trên bến gây tắc năng lực chở và tăng chi phí.

**UI Presentation; Performance Considerations.** Phiếu giao hiện lượng, sở hữu, tiến độ, deadline và điều kiện rủi ro. Tính tuyến khi khởi hành hoặc topology đổi, không mỗi tick cho mọi đoàn.

**Edge Cases; Future Expansion.** Mất kết nối trong lúc trả tiền không tạo hai chuyến: `transactionId` và `shipmentId` khử trùng. Alpha thêm bảo hiểm có vốn dự phòng thật; bảo hiểm không tự sinh hàng thay thế hoặc hoàn tiền không giới hạn.

Đổi hàng kiểm tra giá trị chấp nhận của từng bên, không chuyển qua khoản tiền âm tạm thời. Hủy trước Loaded hoàn reservation; hủy sau Loaded trở thành yêu cầu quay về và vẫn phải trả chi phí đã phát sinh.

## 65 Dynamic Prices

**Purpose; Player Experience.** Giá giúp người chơi thấy thiếu hụt và cân nhắc tuyến buôn. Biến động phải có lý do, đủ chậm để đọc được nhưng không cố định bất chấp cầu hỏng.

**Core Rules; Inputs.** Giá theo địa điểm và loại hàng, đọc nhu cầu định mức bảy ngày, hàng bán được, vận chuyển và rủi ro. Lượng giao dịch người chơi tự tạo không được dùng trực tiếp như nhu cầu thiết yếu.

**Outputs; Interactions With Other Systems.** Hệ thống tạo bid người bán mua vào và ask họ bán ra, cộng phí đã công bố. Giá chỉ điều chỉnh ý định; giao dịch vẫn cần tồn kho, tiền và quota.

**Player Actions; NPC Actions.** Người chơi so giá có ngày xác minh, mua lượng phù hợp sức chở. NPC sửa đơn đặt hàng, giảm mua hàng không thiết yếu hoặc chọn sản phẩm thay thế khi có định nghĩa tương đương.

**Simulation Logic; Offline Behavior.** Giá giữa cập nhật mỗi bình minh, trơn hóa và giới hạn tốc độ đổi. Cùng hàm chạy qua từng ngày offline; không nhảy ngay tới giá cuối mà bỏ các giao dịch ngày trước.

**Failure States; Emergent Outcomes.** Price cap không bảo đảm mua được hàng; shortage có thể hiện “hết hàng”. Người chơi tích trữ tạo thiếu thật và phản ứng xã hội, nhưng một giao dịch qua lại không tạo demand giả.

**UI Presentation; Performance Considerations.** Báo giá khóa tối đa năm giây thực hoặc hết revision hàng/giá. Hiện nguyên nhân chính, ngày cập nhật và lượng có thể giao; tính giá O(số làng × loại hàng) mỗi ngày.

**Edge Cases; Future Expansion.** Cùng nơi luôn `bid < ask`, kể cả sau làm tròn. Chênh giá liên làng có thể sinh lời nếu trả chi phí vận tải; không loại bỏ thương mại bằng việc ép mọi nơi bằng giá. Tiền phe riêng và tỷ giá chỉ sau alpha.

```text
cover = saleableStock / max(dailyEssentialDemand, 1)
scarcity = clamp((7 - cover) / 7, -0.5, 1)
target = base * clamp(1 + 1.5*scarcity + transportPremium
                      + riskPremium, 0.5, 3.0)
candidate = 0.8 * previousMid + 0.2 * target
mid = clamp(candidate, previousMid*0.9, previousMid*1.1)
bid = floor(mid*0.90); ask = max(bid+1, ceil(mid*1.10))
```

`base` của ration là 100 minor; bootstrap đặt `previousMid = base` cho mỗi làng và loại hàng đúng một lần. Premium có trần lần lượt 0,4 và 0,3, lấy từ tuyến thực. Vật phẩm không có nhu cầu ăn/uống dùng nhu cầu sản xuất có vốn và đơn đã xác nhận; khi không có demand thì NPC không mở bid. Phí không thể âm. Bundle định giá bằng cùng quy tắc tổng và làm tròn ở cấp giao dịch; tách stack không tạo lợi nhuận do làm tròn. Mua lại tại chỗ mất spread, còn vòng liên làng bị giới hạn tồn kho, vốn, quota và sức chở.

## 66 Emergent Quest System

**Purpose; Player Experience.** Yêu cầu xuất hiện từ vấn đề tồn tại trong thế giới. NPC cần cây cầu sửa xong để hàng đi được, không chỉ cần người chơi nhấn nút hoàn thành nhiệm vụ.

**Core Rules; Inputs.** Quest là hợp đồng tham chiếu facts có revision, bên đưa việc và ngân sách. MVP có mẫu thiếu thực phẩm, tuyến hỏng và sửa công trình; không cam kết tỷ lệ 80/20 như số lượng nội dung bắt buộc.

**Outputs; Interactions With Other Systems.** Mẫu tạo mục tiêu đo được, thời hạn và tiền/hàng thưởng đặt cọc. Nó theo dõi logistics, công trình, dân số và policy; không spawn tài nguyên hay kẻ địch chỉ để đáp ứng điều kiện.

**Player Actions; NPC Actions.** Người chơi nhận, chia việc trong nhóm hoặc thương lượng phương pháp. NPC có thể tự giải quyết trước; việc sửa đúng công trình bởi người khác cũng thay đổi fact nguồn.

**Simulation Logic; Offline Behavior.** `Candidate → Offered → Accepted → InProgress → Resolved/Obsolete/Failed`. Máy chủ tái kiểm tra khi nhận và trước commit thưởng. Ngoại tuyến nguồn yêu cầu vẫn đổi; hợp đồng có điều khoản rủi ro và công đã nghiệm thu.

**Failure States; Emergent Outcomes.** Làng đã sơ tán khiến giao lương tới kho cũ lỗi thời; NPC đề nghị địa chỉ mới nếu có quyền và ngân sách. Người chơi nhận công trình cầu có thể giải quyết đồng thời thiếu thực phẩm và công việc.

**UI Presentation; Performance Considerations.** Phiếu ghi “vì sao cần”, lần xác minh, điều kiện nghiệm thu và tiền cọc. Chỉ sự kiện liên quan kích hoạt đánh giá; tối đa một offer mỗi issue key và ba vấn đề ưu tiên/làng.

**Edge Cases; Future Expansion.** Không trả hai lần cho cùng nghiệm thu; giữ phần công đã xác nhận khi nguồn issue mất. Alpha thêm mẫu liên vùng từ các facts tương tự; không dựng chuỗi truyện bắt buộc bất chấp trạng thái mô phỏng.

```ts
type QuestContract = {
  id: UUID; issueKey: string; giverId: UUID;
  sourceFacts: { id: UUID; revision: number; predicate: string }[];
  acceptance: PredicateId; escrowInventoryId: UUID;
  deadlineDay: number; state: QuestState;
  milestoneReceipts: UUID[]; invalidationPolicy: PolicyId;
};
```

Ví dụ `bridge:17:disconnected` chỉ phát offer khi cầu mất ít nhất hai ngày, làng dưới ba ngày lương và tuyến vòng không đủ tải. Acceptance cần cầu an toàn, quyền đi qua và một chuyến thử giao thành công; đổ vật liệu cạnh cầu chưa đủ. Cầu tự được thợ làng sửa làm offer chưa nhận thành Obsolete; hợp đồng đang làm thanh toán milestone đã nghiệm thu, trả escrow dư. Sau khi hết khủng hoảng, cooldown mười ngày tránh liên tục mời cùng việc; cooldown không trì hoãn cảnh báo khẩn cấp.

## 67 Authored Narrative

**Purpose; Player Experience.** Nội dung viết trước cung cấp giọng nói, chi tiết đời sống và manh mối có chủ đích. Nó mở cách hiểu thế giới mà không yêu cầu mọi thế giới đi qua cùng chuỗi sự kiện.

**Core Rules; Inputs.** MVP có một ruin và cụm tài liệu ngắn về mạng nước cũ. Narrative node yêu cầu địa điểm, vật chứng và trạng thái cụ thể; đoạn thoại không khẳng định NPC còn sống nếu fact đã đổi.

**Outputs; Interactions With Other Systems.** Người chơi nhận bằng chứng, tọa độ có độ tin cậy hoặc tri thức có thể kiểm tra. Tài liệu không cấp máy móc hoặc công nghệ chỉ nhờ mở màn hình đọc.

**Player Actions; NPC Actions.** Người chơi đọc, chép, đối chiếu và hỏi người có nguồn tin. NPC giữ góc nhìn riêng, có thể không biết câu trả lời; bản dịch cần người có kỹ năng hoặc công cụ phù hợp.

**Simulation Logic; Offline Behavior.** Node dùng điều kiện dữ liệu và các cách tiếp cận đã viết; việc đã khám phá lưu vĩnh viễn trong hồ sơ người chơi/nhóm theo chia sẻ. Ruin vẫn xuống cấp trong các ngày offline mô phỏng.

**Failure States; Emergent Outcomes.** Một vật chứng bị phá có thể đóng một nguồn hiểu biết. Các kết luận cốt lõi nên có hai nguồn độc lập do tác giả bố trí; không tái sinh tài liệu để bảo đảm hoàn tất.

**UI Presentation; Performance Considerations.** Nhật ký phân biệt trích dẫn, suy luận và điều đã xác minh. Nội dung viết sẵn theo khóa localization; điều kiện node chỉ xét khi tiếp cận hoặc fact thay đổi.

**Edge Cases; Future Expansion.** Đọc bản sao không nhân thưởng và phải giữ provenance. Mở rộng bằng cụm chuyện độc lập, không thêm tuyến nhân vật bất tử bắt buộc để mọi hệ thống tiếp tục chạy.

## 68 Apocalypse Mystery

Hệ thống con kế thừa toàn bộ 16 nhãn của **67. Authored Narrative**. ASSUMPTION: khoảng 300 năm trước, sụp đổ diễn ra theo chuỗi mất ổn định khí hậu, đứt hạ tầng và xung đột; không có một phản diện được bảo đảm là nguyên nhân duy nhất. Đây là khung hư cấu, không là mô hình dự báo thế giới thật.

Kho canon nội bộ phân biệt sự kiện đã chốt, giả thuyết chưa chốt và lời kể sai có chủ ý. Người chơi chỉ nhận vật chứng trong thế giới. Một biên bản cắt nước có ngày, cơ quan phát hành và vùng ảnh hưởng; nó chứng minh hành động cắt nước, không tự chứng minh toàn bộ nguyên nhân tận thế.

MVP kết thúc cụm manh mối bằng một câu hỏi mở cùng ích lợi thực tế: sơ đồ cho biết vị trí van cũ, cần tới kiểm tra tình trạng. Không gắn một lời giải bắt buộc với mở khóa công nghệ. Alpha mở rộng nguồn mâu thuẫn có chủ đích; nội dung procedural không được tự bịa sự thật canon mới.

## 69 Ruins

**Purpose; Player Experience.** Phế tích nối lịch sử với vật liệu, địa hình và khám phá. Sau lần ghé đầu, người chơi vẫn thấy dấu vết mình đã tháo, gia cố hoặc bảo tồn.

**Core Rules; Inputs.** Ruin có nguồn gốc, tuổi, thành phần công trình, inventory hữu hạn và nguy cơ tiếp cận. MVP có một ruin; không tạo dungeon nhiều tầng hoặc máy móc chiến đấu ngoài scope.

**Outputs; Interactions With Other Systems.** Khảo sát tạo tri thức và bản đồ, tháo dỡ chuyển vật liệu từ cấu kiện sang inventory có hao hụt. Tường mất có thể thay đường đi, nơi trú và độ phơi nhiễm nước.

**Player Actions; NPC Actions.** Người chơi khảo sát, tháo, gia cố hoặc đánh dấu nguy hiểm. NPC có thể lấy vật liệu nếu có quyền và nhu cầu, hoặc xin dùng nơi đó làm kho trú tạm.

**Simulation Logic; Offline Behavior.** Mỗi cấu kiện giữ condition và lịch sửa/tháo. Hư hại chạy theo ngày môi trường, cả offline trong cửa sổ mô phỏng; loot không được seed lại khi tải chunk.

**Failure States; Emergent Outcomes.** Tháo phần chịu lực có thể khóa khu vực vì sập, mất đường tới vật chứng; cảnh báo cần đọc được trước hành động. Bảo tồn phần mái tạo nơi trú cho đoàn bị kẹt.

**UI Presentation; Performance Considerations.** Vết tháo và gia cố tồn tại trực quan. Ruin dùng cấu kiện và hazard zones đơn giản, không mô phỏng từng mảnh vỡ; lưu delta trên layout seed cố định.

**Edge Cases; Future Expansion.** Vật phẩm có ID không được tồn tại đồng thời trong tủ và tay người. Alpha cho ruin từ làng bỏ hoang và public estate chuyển di sản; homestead vắng chủ không tự trở thành nguồn salvage.

## 70 POI Evolution

Hệ thống con kế thừa toàn bộ 16 nhãn của **69. Ruins** và lịch thực thi của **53. Simulation LOD**. Các nhãn POI là cách mô tả trạng thái: `Occupied`, `Vacant`, `Reclaimed`, `Repurposed`, có thể kết hợp với cấu kiện nguy hiểm. Chúng không phát sinh theo vòng reset nội dung.

Chuyển Vacant sang Occupied cần nhóm đến thật, tuyến khả thi, chỗ trú và hàng mang theo. Hàng mới trong cửa hàng cũ phải có `shipmentId`, sản xuất tại chỗ hoặc tài sản của người mới đến. Tổ động vật mới phải trừ lượng di cư khỏi quần thể nguồn; mọc cây phải theo state thực vật của ô.

MVP chỉ có thay đổi che phủ thực vật, condition và một mục đích trú/kho mới tại ruin nếu cư dân tới. Alpha thêm tái định cư và trạm thương mại. Khi không còn nguồn người, vật liệu hay sinh vật, địa điểm có thể tiếp tục trống; thiết kế chấp nhận điều đó. Map giữ thông tin “đã thấy lần cuối” và cập nhật khi có nguồn quan sát hợp lệ, không gửi sự thật toàn bản đồ tự động.

## 71 Knowledge System

**Purpose; Player Experience.** Tiến triển đến từ hiểu cách làm và tạo điều kiện thực hiện. Biết thiết kế một máy hữu ích dù chưa có vật liệu; sách đọc rồi vẫn có giá trị để dạy người khác.

**Core Rules; Inputs.** Knowledge entry lưu chủ đề, nguồn, độ tin cậy và phạm vi đã kiểm chứng. Phân biệt `knownProcedure`, `practicalSkill` và `availableCapability`; không thay ba thứ bằng một thanh XP.

**Outputs; Interactions With Other Systems.** Tri thức thêm phương án vào lập kế hoạch, dự báo và kiểm tra công thức. Chế tạo vẫn cần dụng cụ, station, vật liệu, năng lượng và thời gian đúng định nghĩa.

**Player Actions; NPC Actions.** Người chơi học, thử, ghi chép và chủ động chia sẻ. NPC dạy nếu có thời gian, hiểu biết và quan hệ/hợp đồng; người thầy mất khả năng làm việc có thể làm đào tạo gián đoạn.

**Simulation Logic; Offline Behavior.** `Unseen → Documented → Tested → Reproducible`; trạng thái đo loại bằng chứng, không cấp độ nhân vật. Offline không tự đọc hoặc thử; khóa đào tạo đã xếp lịch chỉ tiến khi đủ người và ngân sách việc.

**Failure States; Emergent Outcomes.** Bản vẽ thiếu dung sai tạo thử nghiệm không đạt, không sinh máy dùng được. Chia sẻ nhật ký có thể cứu tri thức khi một chuyên gia qua đời.

**UI Presentation; Performance Considerations.** Recipe hiện “biết cách / thiếu công cụ / chưa xác minh”, nêu đầu vào còn thiếu. Kiến thức là tập ID và evidence links nhỏ; nội dung giải thích dùng catalog chung.

**Edge Cases; Future Expansion.** Người chơi có thể tự khám phá quy trình bằng thử đúng điều kiện; sách không là khóa phép thuật. Tri thức của nhân vật mất không tự truyền toàn nhóm nếu chưa ghi/chia sẻ; quy tắc legacy cho phép giữ hồ sơ đã bảo tồn.

```text
canExecute(recipe, actor, site) = procedureAvailable(actor, site)
  AND toolsSatisfied AND stationSatisfied AND materialsReserved
  AND powerSatisfied AND environmentSafe AND timeBudgetAvailable
procedureAvailable = actor đã hiểu OR có chỉ dẫn đọc được tại station
  OR người hướng dẫn hiện diện và đã được đặt lịch.
```

## 72 Technology

Hệ thống con kế thừa toàn bộ 16 nhãn của **71. Knowledge System**. Công nghệ là mạng phụ thuộc khả năng sản xuất, không cây research điểm số. Cầu gỗ cần khả năng cắt, nối, vận chuyển vật liệu và khảo sát điểm đặt; một sách nâng cao không thay những điều kiện ấy.

MVP chỉ dùng công nghệ tương ứng khoảng 12 recipe và tám build definitions đã duyệt. UI có thể gợi ý hướng tiến tới cart, cầu và tưới nước bằng cách chỉ nút thắt hiện tại. Công nghệ mới phải có ít nhất một tác động lên sản xuất/logistics cùng một chi phí môi trường hoặc xã hội có thể đọc được.

Alpha mới mở năng lượng và sản xuất chuyên biệt theo gate kỹ thuật của toàn dự án. Không bảo đảm mọi công nghệ từng tồn tại trước tận thế đều chế tạo lại được trong vùng nhỏ. Dùng công cụ giản đơn thay thế phải giữ một con đường chơi khả thi nếu kim loại hiếm cạn; thay thế thường chậm hơn, cần nhiều lao động hoặc giới hạn kích thước công trình.

## 73 Lost Technology

Hệ thống con kế thừa toàn bộ 16 nhãn của **71. Knowledge System** và nguồn hiện vật của **69. Ruins**. Di vật có ba thông tin riêng: người chơi hiểu gì, thiết bị còn bộ phận nào, và có thể cấp năng lượng/vật tư gì. Khám phá không đồng nghĩa vận hành; vận hành một lần không đồng nghĩa đã có chuỗi sản xuất thay thế.

MVP có bản ghi và bộ phận khảo sát trong ruin, không có lò phản ứng hay dây chuyền công nghiệp có thể mở chỉ bằng chìa khóa. Alpha dùng trạng thái `Unknown → Identified → Diagnosed → Repaired → Operating`, mỗi bước có evidence và đầu vào; tháo rời có thể chuyển ngược sang PartsOnly.

Một bộ phận không thể tái tạo phải có trữ lượng và tuổi thọ rõ, cùng cách tiếp tục chơi khi hỏng. Không tạo “pin cổ vô hạn” để bỏ qua điện và tài nguyên. Thiết bị có thông tin sai/khuyết được ghi trong UI trước cam kết lớn; thất bại kiểm tra tạo kết quả chẩn đoán, không chỉ mất vật liệu vì random roll bí mật.

## 74 Research

**Purpose; Player Experience.** Nghiên cứu biến điều chưa chắc thành bằng chứng hữu ích. Người chơi kiểm tra một giả thuyết về thế giới rồi áp dụng kết quả vào công trình và cách sống.

**Core Rules; Inputs.** MVP dùng khảo sát đơn giản và thử nghiệm canh tác/nước với mẫu có giới hạn. Project cần câu hỏi, biến quan sát, phương pháp, mẫu, người phụ trách và điều kiện kết thúc; không dùng thanh điểm research chung.

**Outputs; Interactions With Other Systems.** Kết quả thêm evidence, khoảng bất định và khuyến nghị có điều kiện. Nó không nâng trực tiếp fertility hay mở máy; cải thiện chỉ xuất hiện sau hành động thực tế trên đất, công cụ hoặc vận hành.

**Player Actions; NPC Actions.** Người chơi lấy mẫu, ghi điều kiện, đối chiếu và thực hiện thử nhỏ. NPC có chuyên môn tham gia đo/giảng giải nếu được trả công và có lịch, có thể xin mẫu khác khi dữ liệu thiếu.

**Simulation Logic; Offline Behavior.** `Proposed → Prepared → Running → Evaluated → Archived/Iterating`. Work chỉ chạy khi đủ điều kiện. Mẫu môi trường tiếp tục biến đổi offline; mẫu homestead không tự được xử lý nếu đã hết tín dụng công việc.

**Failure States; Emergent Outcomes.** Lũ làm mất ô đối chứng khiến kết quả Inconclusive; mẫu đã tiêu dùng không hoàn lại. Nghiên cứu thất bại vẫn có thể chỉ ra ảnh hưởng của một đợt lũ hoặc lỗi phương pháp.

**UI Presentation; Performance Considerations.** Bảng thử nghiệm nêu “đã thấy / còn chưa rõ / điều kiện áp dụng”. Mô hình dùng thông số có sẵn của ecology và noise có seed lưu, không chạy mô phỏng khoa học thứ hai cho từng project.

**Edge Cases; Future Expansion.** Đo lại cùng mẫu không tạo bằng chứng độc lập. Alpha thêm thí nghiệm nhiều mùa và tổ chức học tập; phục hồi loài, gene và công nghệ lớn chỉ sau khi nguồn mẫu, chi phí và hậu quả sinh thái đã có thiết kế riêng.

Ví dụ nghiên cứu thực dụng: ghi độ ẩm hai ô ruộng cùng loại đất ở thời điểm mở/đóng van, theo dõi ba ngày, so chênh lệch và kiểm tra mưa. Nếu ba ngày đều mưa lớn, báo “chưa tách được tác động tưới”. Người chơi vẫn có thể dùng van; nghiên cứu giúp dự báo tốt hơn, không cấp quyền thao tác bằng phép mở khóa.
