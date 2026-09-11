# World and Ecology

## 28 Procedural World Generation

**Purpose.** Tạo địa hình có quan hệ nhân quả với tài nguyên và lịch sử. **Player Experience.** Người chơi hiểu vì sao làng ở cạnh sông, mỏ ở sườn đá và đường cũ dẫn tới phế tích.

**Core Rules.** MVP dùng một region 512 × 512 m; seed và generatorVersion bất biến trong save. **Inputs.** Seed, bảng khí hậu, ràng buộc địa hình, ngân sách nội dung và lịch sử tiền kỳ 300 năm.

**Outputs.** Heightfield, watershed graph, lớp đất, trữ lượng, quần thể, hai làng và một phế tích có ID. **Interactions With Other Systems.** Lịch sử đặt dấu vết; sinh thái kiểm tra khả năng sinh tồn của trạng thái đầu.

**Player Actions.** Chọn seed hoặc dùng seed đề xuất; xem mức khó trước khi lập world. **NPC Actions.** Chọn nơi định cư theo nước, đất và đường trong bước tiền kỳ, chưa chạy AI từng cá thể.

**Simulation Logic.** Pipeline: địa hình → thoát nước → khí hậu → sinh cảnh → tài nguyên → tiền sử → kiểm định. **Offline Behavior.** Generation chỉ chạy lúc tạo world; reconnect không tạo lại địa hình hoặc loot.

**Failure States.** Seed thiếu lối đi, nước hay chỗ đặt homestead bị loại. **Emergent Outcomes.** Một đường thương mại bỏ hoang có thể trở nên hữu ích khi người chơi sửa cầu, dù không có quest định sẵn.

**UI Presentation.** Preview chỉ hiện đặc điểm khởi đầu, không tiết lộ mỏ ẩn. **Performance Considerations.** Giới hạn 20 lần sinh; thất bại chuyển sang seed mẫu đã kiểm định, báo rõ lựa chọn.

**Edge Cases.** Không sửa lặng lẽ seed đang chơi khi generator đổi phiên bản. **Future Expansion.** Alpha mở tổng cộng ba region; tối đa chín region cho Beta/1.0 nếu đạt ngân sách hiệu năng.

Acceptance: mỗi làng có đường đi bộ tới nguồn nước trong 150 m; một homestead 32 × 32 m nằm ngoài lòng sông, hành lang đường và vùng ngập thiết kế. Tài nguyên đầu đủ thực hiện chuỗi cầu–nước–lương thực ít nhất hai lần. Kiểm định không bảo đảm dân làng luôn sống sót sau quyết định của người chơi.

## 29 Region System

**Purpose.** Chia simulation thành miền có chi phí hữu hạn và biên trao đổi rõ. **Player Experience.** Di chuyển thay đổi cảnh quan, hàng hóa và thông tin, không gặp thế giới reset ở ranh giới.

**Core Rules.** MVP: 262.144 m²; 16.384 ô sinh thái 4 × 4 m; 256 chunk 32 × 32 m. **Inputs.** Địa hình, đồ thị liên kết và trạng thái region liền kề.

**Outputs.** Snapshot, tồn kho sinh thái, thông lượng qua biên và báo cáo địa phương. **Interactions With Other Systems.** Logistics, nước và di cư trao đổi bằng transfer ID chung thay vì tự tăng giảm ở hai đầu.

**Player Actions.** Khám phá, xây hành lang và đọc báo cáo có timestamp. **NPC Actions.** Dùng cổng đường, sông hoặc hành lang sinh cảnh đã xác định; không dịch chuyển xuyên một biên bị chặn.

**Simulation Logic.** Bốn tiểu lưu vực bằng nhau, mỗi lưu vực 65.536 m², kết nối bốn river node theo đồ thị không chu trình. **Offline Behavior.** Region cùng world chia sẻ một đồng hồ và giới hạn nền 72 giờ thực.

**Failure States.** Mất cầu hoặc dòng chảy có thể cô lập một phần region. **Emergent Outcomes.** Một điểm qua sông nhỏ trở thành nút thương mại quan trọng vì nó nối hai nguồn cung khác nhau.

**UI Presentation.** Ranh giới quản lý không vẽ thành tường; bản đồ dùng địa danh tự nhiên. **Performance Considerations.** Chỉ gửi chunk thuộc vùng quan sát; trạng thái xa vẫn được tính theo lịch macro.

**Edge Cases.** Thực thể trên biên có đúng một owner region và một transfer đang xử lý. **Future Expansion.** Liên kết nhiều region dùng tổng chuyển đi bằng tổng nhận; không mô phỏng chín thế giới riêng rẽ.

## 30 Climate Simulation

**Purpose.** Tạo xu hướng dài hạn để người chơi lập kế hoạch. **Player Experience.** Vùng đất khô dần có dấu hiệu nhiều ngày trước khi cây trồng thất bát; một cơn mưa không xóa hạn hán.

**Core Rules.** Đây là mô hình phục vụ game, không dự báo khí hậu thực. **Inputs.** Mùa, cao độ, độ phủ cây, độ ẩm đất, xu hướng mưa và tham số seed.

**Outputs.** Nhiệt độ mục tiêu °C, mưa kỳ vọng mm/ngày game, khả năng bốc hơi mm/ngày và chỉ số khô hạn [0,1]. **Interactions With Other Systems.** Weather lấy đường nền; Water và Vegetation tạo phản hồi chậm.

**Player Actions.** Trồng và giữ rừng, chọn lịch gieo, xây hệ thống dự trữ. **NPC Actions.** Điều chỉnh lịch canh tác từ thông tin họ biết; không đọc được dự báo tương lai hoàn hảo.

**Simulation Logic.** Trung bình trượt 30 ngày; tác động mất cây giới hạn ±2°C và ±15% mưa nền. **Offline Behavior.** Cập nhật mỗi ngày game trong cùng vòng catch-up, tối đa 144 ngày khi world vắng người.

**Failure States.** Phản hồi tự khuếch đại gây sa mạc hóa ngay lập tức bị chặn bởi giới hạn tốc độ. **Emergent Outcomes.** Phá rừng có lợi ngắn hạn nhưng làm kho nước ít ổn định trong mùa khô kế tiếp.

**UI Presentation.** Ba xu hướng: ổn định, khô hơn, ẩm hơn; panel nâng cao hiện nguồn đóng góp. **Performance Considerations.** Tính trên bốn lưu vực, không giải khí quyển từng ô.

**Edge Cases.** Thiếu mẫu lịch sử dùng baseline seed, đánh dấu độ tin cậy thấp. **Future Expansion.** Alpha bổ sung khác biệt khí hậu giữa region; không thêm áp suất và gió 3D nếu không tạo quyết định mới.

## 31 Weather

**Purpose.** Tạo biến động quan sát được trên đường nền khí hậu. **Player Experience.** Mưa giúp nước và cây nhưng làm đường chậm, tầm nhìn thấp; thời tiết có ích lẫn bất tiện.

**Core Rules.** Mỗi giờ game bằng 75 giây thực; chuyển trạng thái có quán tính. **Inputs.** Khí hậu, mùa, trạng thái mây trước đó và PRNG đã lưu.

**Outputs.** Nhiệt độ, mưa mm/giờ, bốc hơi và hệ số tầm nhìn. **Interactions With Other Systems.** Gửi cùng một mẫu mưa cho Water, Crop, giao thông và âm thanh; không random riêng từng hệ thống.

**Player Actions.** Đọc dự báo 24 giờ game, che hàng và hoãn chuyến xe. **NPC Actions.** Thay tuyến hoặc trú khi vận chuyển trở nên quá nguy hiểm, vẫn tiêu thụ lương thực.

**Simulation Logic.** Markov ba trạng thái quang–âm u–mưa; mỗi trạng thái giữ tối thiểu hai giờ game. **Offline Behavior.** Catch-up tái tạo đúng chuỗi 24 mẫu/ngày từ PRNG, không thay bằng lượng mưa trung bình.

**Failure States.** Chuỗi cực đoan vượt envelope thiết kế bị giới hạn; không dùng thiên tai ngẫu nhiên để trừng phạt tiến độ. **Emergent Outcomes.** Một cơn mưa kéo dài vừa cứu vụ mùa vừa khiến xe chở hàng mắc phía bên kia sông.

**UI Presentation.** Mây và âm thanh báo trước; dự báo dùng khoảng xác suất. **Performance Considerations.** Client nội suy hiệu ứng, server chỉ gửi trạng thái và thời điểm chuyển.

**Edge Cases.** Mưa không chấm dứt khi host reconnect; hiệu ứng client không quyết định lượng nước. **Future Expansion.** Gió, sương mù và tuyết chỉ bổ sung khi hệ thống chịu tác động tương ứng đã tồn tại.

## 32 Seasons

**Purpose.** Tạo chu kỳ dự trữ, gieo trồng và sửa chữa có thể học. **Player Experience.** Người chơi chuẩn bị cho mùa tiếp theo thay vì hoàn thành chuỗi việc lặp lại mỗi buổi đăng nhập.

**Core Rules.** Một năm 120 ngày game; bốn mùa, mỗi mùa 30 ngày = 15 giờ thực được mô phỏng. **Inputs.** Ngày tuyệt đối và bảng mùa của region.

**Outputs.** Đường nền nhiệt, mưa, bốc hơi và cửa sổ sinh sản. **Interactions With Other Systems.** Kế thừa hợp đồng Climate Simulation; mùa điều chỉnh đầu vào, không trực tiếp sửa kho nước hoặc số động vật.

**Player Actions.** Dự trữ trước mùa khô, ưu tiên bảo trì đường trước mùa mưa. **NPC Actions.** Lập nhu cầu mua hạt và khẩu phần từ dự báo mùa, không được tạo hàng miễn phí.

**Simulation Logic.** Nội suy đường nền trong năm ngày quanh ranh mùa. **Offline Behavior.** Mùa chạy theo tuổi world; sau hibernation không nhảy lịch theo toàn bộ thời gian đồng hồ ngoài đời.

**Failure States.** Người vào giữa mùa khô vẫn có nguồn sinh tồn tối thiểu ở điểm xuất phát đã chọn. **Emergent Outcomes.** Kho dư mùa trước trở thành lợi thế thương mại khi mưa đến muộn.

**UI Presentation.** Hiện “mùa khô, ngày 11/30”, kèm thời gian game tới chuyển mùa. **Performance Considerations.** Tra bảng theo ngày, không tính riêng cho mọi thực thể.

**Edge Cases.** 100 giờ world hoạt động = 200 ngày = khoảng 1,67 năm; không gọi đó là nhiều thế hệ. **Future Expansion.** Region khác có bảng mùa riêng nhưng dùng cùng lịch tuyệt đối.

| Mùa thử nghiệm | Nhiệt nền | Mưa kỳ vọng | Bốc hơi tiềm năng |
|---|---:|---:|---:|
| Hồi xanh | 19°C | 4 mm/ngày | 2 mm/ngày |
| Khô | 27°C | 1 mm/ngày | 4 mm/ngày |
| Mưa | 22°C | 7 mm/ngày | 2 mm/ngày |
| Lạnh | 12°C | 3 mm/ngày | 1 mm/ngày |

Các số là giả thuyết cân bằng; mưa thực lấy từ Weather, không cộng thêm lượng “kỳ vọng” vào nước.

## 33 Natural Disasters

**Purpose.** Biến áp lực tích lũy thành khủng hoảng có thể giải thích và ứng phó. **Player Experience.** Thấy cảnh báo, chọn bảo vệ, sửa hạ tầng, chia khẩu phần hoặc sơ tán.

**Core Rules.** MVP chỉ hạn và lũ, cùng mưa thông thường. **Inputs.** Độ ẩm đất, dung tích sông, dòng vào, sức chịu công trình và mức phơi nhiễm.

**Outputs.** Hazard footprint, tổn thất định lượng, nhu cầu cứu trợ và lịch sử có nguyên nhân. **Interactions With Other Systems.** Thiệt hại phát sinh từ Water và Durability; Disaster không trừ kho hoặc dân lần thứ hai.

**Player Actions.** Mở cống, giữ hành lang thoát nước, sửa cầu, vận chuyển thức ăn. **NPC Actions.** Tránh vùng nguy hiểm, giữ vật tư và chuyển chỗ ở theo năng lực logistics.

**Simulation Logic.** Hạn vào trạng thái cảnh báo khi ẩm đất <0,25 trong năm ngày; thoát khi >0,35 trong ba ngày. **Offline Behavior.** Macro áp dụng cùng ngưỡng; homestead bảo vệ lõi, utility có thể ngắt và sản xuất dừng an toàn.

**Failure States.** Không cảnh báo lặp mỗi tick; hazard đang hoạt động phải đạt ngưỡng phục hồi mới đóng. **Emergent Outcomes.** Cứu làng bằng mở cống có thể làm ngập con đường người chơi đang phụ thuộc.

**UI Presentation.** Báo địa điểm, thời gian tích lũy, đối tượng bị đe dọa và phương án khả thi. **Performance Considerations.** Một incident ID cho cùng đợt; gộp các ô liền nhau để hiển thị.

**Edge Cases.** Lũ là nước tràn thật, không tự sinh từ dice roll; vùng claim không đẩy nước sang làng khác. **Future Expansion.** Cháy rừng cần nhiên liệu, độ khô và nguồn bắt lửa; chưa có động đất, bão phóng xạ ở MVP.

## 34 Water Simulation

**Purpose.** Tạo tài nguyên nước hữu hạn theo thời điểm và quan hệ thượng–hạ lưu. **Player Experience.** Đóng cống giữ nước gần nhà nhưng hạ lưu ít cá và đất khô; dòng chảy thể hiện trực tiếp kết quả.

**Core Rules.** Mỗi lưu vực có kho đất S, nước ngầm G, kênh C và ngập F, đơn vị m³. **Inputs.** Mưa, bốc hơi tiềm năng, độ phủ cây, cửa cống, địa hình và giao dịch khai thác.

**Outputs.** Thể tích từng kho, độ sâu ngập, lưu lượng chuyển m³/giờ game, độ ẩm đất S/Smax. **Interactions With Other Systems.** Tưới chuyển nước sang đất; bơm sang bồn trừ sông/ngầm; cá dùng lưu lượng và chất lượng.

**Player Actions.** Đặt cống nhỏ, giới hạn lượng lấy, đào rãnh và tưới đúng nơi. **NPC Actions.** Rút nước cho nhu cầu đã đặt và giảm sản xuất khi nguồn thiếu, không lấy vượt kho.

**Simulation Logic.** Chạy 24 bước/ngày, Δt = 1/24 ngày game; mọi flux lấy min(nhu cầu, lượng khả dụng, dung tích nhận). **Offline Behavior.** Giữ cùng bước giờ khi catch-up; công trình nhà hết credit hoặc nguy hiểm ngừng bơm và không tiêu thụ đầu vào.

**Failure States.** Sông đầy đẩy phần dư sang F; F tràn theo spill edge, không bị clamp mất nước. **Emergent Outcomes.** Giữ nước quá lâu cứu ruộng thượng lưu nhưng tạo thiếu hàng cá ở chợ hạ lưu.

**UI Presentation.** Hiện đầy/cạn, mũi tên dòng và “đang lấy 12 m³/ngày”; panel kỹ thuật có ledger. **Performance Considerations.** Chỉ bốn node và bốn lưu vực MVP; flood footprint dùng bảng cao độ sắp sẵn.

**Edge Cases.** Khi nước bằng không, nồng độ chất ô nhiễm không chia cho zero; chất còn lại thành cặn. **Future Expansion.** Alpha thêm hồ và kênh có vòng; phải đổi solver trước khi cho phép đập lớn.

| Kho mỗi lưu vực | Trạng thái đầu | Sức chứa/giới hạn |
|---|---:|---:|
| S, nước đất | 7.208,96 m³ | 13.107,2 m³ = diện tích × 0,20 m |
| G, nước ngầm | 9.830,4 m³ | 19.660,8 m³ = diện tích × 0,30 m |
| C, kênh | 900 m³ | bankfull 1.500 m³; vượt mức chuyển F |
| F, nước ngập | 0 m³ | giới hạn theo terrain spill; vượt biên là export |

Mưa P = lượng mm × 65.536/1.000. Mưa 10 mm đưa vào 655,36 m³/lưu vực. Tỷ lệ thấm `a = clamp(0,35 + 0,45 × treeCover, 0,35, 0,80)`; phần không thấm vào C. Nước S dư cũng vào C. Thấm sâu S→G tối đa 0,01×S/ngày; baseflow G→C tối đa 0,005×G/ngày. Diện tích bốc hơi chia thành đất và mặt nước theo footprint hiện tại, tổng không vượt 65.536 m²; lấy từ S và C/F tương ứng. Các hệ số ngày nhân Δt trước khi dùng; kho cạn giới hạn flux về lượng còn lại.

Cửa ra truyền `min(C, gateFraction × 1.200 × Δt)` m³/bước; giá trị 1.200 có đơn vị m³/ngày game. Giữ tối thiểu 20% độ mở trong MVP để tránh khóa hoàn toàn sông; không hứa đủ nước khi trời hạn. Các node đề xuất dòng bằng snapshot đầu bước rồi commit đồng thời; overflow theo spill graph được xử lý trong cùng bước. G đầy trả phần thấm sâu bị từ chối về S. Không dùng clamp để xóa phần dư.

Ledger toàn world: `Δ(S+G+C+F+bồn+nước đang chở) = mưa + import − evaporation − export − consumed`. Một ngày minh họa: đầu 80.000 m³; mưa 2.621,44; bốc hơi 600; ra biên 1.000; tiêu dùng 40; cuối 80.981,44 m³. Chuyển nội bộ 500 m³ để tưới không đổi tổng. Mỗi giao dịch có ID; cùng ID không được ghi hai lần. Sai số cho phép 10⁻⁶ m³ cho một giao dịch và 0,01 m³/ngày toàn world; vượt ngưỡng dừng commit, ghi diagnostic.

Lũ mở incident khi C bankfull và F>50 m³ trong hai bước liên tiếp; đóng khi F<10 m³ trong sáu bước. Depth tính từ thể tích F và diện tích thực bị phủ, không lấy toàn region làm mặt nước. Nhu cầu uống thử nghiệm 0,003 m³/NPC/ngày; 24 NPC dùng 0,072 m³/ngày, độc lập khẩu phần 0,5 kg/ngày. Nước nông nghiệp và dòng môi trường mới là nhu cầu lớn; không phóng đại uống nước để tạo hạn.

## 35 Ecosystem Simulation

**Purpose.** Biến biome thành kết quả của trạng thái đất và sinh vật. **Player Experience.** Thấy rừng thưa, đất trống, dấu thú giảm; có thể phục hồi từng khu dù cảnh quan region thay đổi chậm.

**Core Rules.** Mỗi ô giữ độ ẩm, độ phì, ô nhiễm và độ che phủ [0,1], cùng biomass có đơn vị kg. **Inputs.** Nước, khí hậu, khai thác, sinh trưởng và công trình.

**Outputs.** Habitat quality, năng lực nuôi sống và nhãn cảnh quan. **Interactions With Other Systems.** Vegetation cung cấp thức ăn; Resources lấy biomass; Pollution hạ chất lượng; Economy phản ánh sản lượng bị mất.

**Player Actions.** Giữ dải cây ven sông, hạn chế chặt và phục hồi đất. **NPC Actions.** Chọn khu khai thác có đường tới, trữ lượng thật và quyền tiếp cận.

**Simulation Logic.** Ngày mới xử lý nước → độc chất → cây → thức ăn → quần thể → báo cáo; ledger khóa thứ tự. **Offline Behavior.** Cùng hàm cập nhật ngày, không nhân một lần tốc độ sinh trưởng với 144 ngày.

**Failure States.** Cập nhật vòng phản hồi ngay nhiều lần trong một ngày gây bùng nổ; mọi hệ số liên hệ dùng snapshot quy định. **Emergent Outcomes.** Một vùng chuyển thành đồng cỏ khiến săn dễ hơn nhưng đường bùn xấu hơn.

**UI Presentation.** Cảnh vật thể hiện trạng thái; khảo sát cho biết xu hướng và nguyên nhân chính. **Performance Considerations.** Mảng liên tục 16.384 ô; chỉ đánh dấu chunk thay đổi đáng kể để gửi client.

**Edge Cases.** Không đặt lại trạng thái khi nhãn biome đổi. **Future Expansion.** Đa dạng loài Alpha; chỉ số biodiversity MVP là proxy về cân bằng các nhóm chức năng, không tuyên bố đo đa dạng sinh học thật.

Đổi nhãn ô sang rừng khi treeCover>0,65 trong 60 ngày; rời rừng khi <0,45 trong 30 ngày. Nhãn region dùng trung bình 120 ngày và cần 60% diện tích đồng thuận. Độ phì phục hồi tối đa 0,002/ngày khi có thảm thực vật, mất tối đa 0,01/ngày do xói mòn và hoạt động; clamp [0,1] áp dụng chỉ số, không áp dụng kho vật chất.

## 36 Vegetation

**Purpose.** Cung cấp vật liệu, thức ăn và giữ nước bằng cùng một nguồn sống. **Player Experience.** Chặt cây làm đường nhanh hơn nhưng giảm nguồn gỗ tương lai và tăng nước chảy tràn.

**Core Rules.** MVP có hai nhóm cây: cỏ và cây gỗ; một crop tách theo lô gieo. **Inputs.** Biomass, độ ẩm, nhiệt, đất, hạt khả dụng và lượng bị ăn/chặt.

**Outputs.** Sinh trưởng kg khô/ngày, hạt, độ che phủ và sản phẩm khai thác. **Interactions With Other Systems.** Cỏ cấp thức ăn cho grazer; cây giữ nước; crop chuyển đầu vào thành khẩu phần qua recipe.

**Player Actions.** Thu hoạch, để lại cây giống và trồng phục hồi. **NPC Actions.** Canh tác theo nước và lao động; không trồng nếu thiếu hạt hoặc đất chưa được cấp quyền.

**Simulation Logic.** `growth = r × B × (1−B/K) × waterSuitability × temperatureSuitability`; mọi suitability thuộc [0,1]. **Offline Behavior.** Cây tự nhiên sinh trưởng trong 72 giờ nền; cây trồng nhà chỉ được chăm sóc nếu có credit, vật tư và lao động.

**Failure States.** B=0 không tự hồi theo logistic; cần hạt từ ô lân cận hoặc người trồng. **Emergent Outcomes.** Dải cây để giống trở thành nơi phục hồi sau khi các khu khai thác khác trống hẳn.

**UI Presentation.** Hiện non–ổn định–suy kiệt; cảnh báo “không còn nguồn hạt gần đây”. **Performance Considerations.** Biomass theo ô, mesh cây chỉ là biểu diễn; không chạy AI cho từng lá hoặc cây trang trí.

**Edge Cases.** Chặt mesh phải trừ cùng biomass authoritative; reload không tạo lại gỗ. **Future Expansion.** Loài xâm lấn sau phát hành dùng cùng cạnh tranh diện tích, cần nguồn hạt và đường vận chuyển, không phát sinh ngẫu nhiên.

Thông số đầu: cỏ K=4 kg khô/ô, B=2 kg trên ô cỏ; r=0,012/ngày. Cây gỗ K=320 kg/ô, B=120 kg trên ô rừng; r=0,0008/ngày. `treeCover=min(1,B/160 kg)` nên ô rừng đầu có độ phủ 0,75; biomass tiếp tục tăng sau khi tán kín. Khởi tạo 45% ô cỏ, 35% ô rừng, 20% nước/đất trống/công trình; phần lẻ làm tròn theo seed. Thu 10 kg biomass gỗ tạo 8 kg vật liệu và 2 kg cặn. Phát tán cần nguồn khỏe, tối đa một ô nhận/nguồn/ngày; biomass hạt chuyển khỏi nguồn. Crop không cấp cả biomass lẫn khẩu phần từ cùng lần thu hoạch.

### Cây trồng và nguồn thức ăn khởi đầu

**ASSUMPTION về cân bằng MVP:** Toàn world có 24 lô cây lương thực, mỗi lô 4 × 4 m: làng thượng lưu có 18 lô (288 m²), làng hạ lưu có 6 lô (96 m²). Chênh lệch này tạo nhu cầu trao đổi thực phẩm qua cầu. Đây là nhịp tăng trưởng rút ngắn cho game. Lô giữ `cropId`, lượng hạt đã gieo, tiến độ [0,12], biomass và tình trạng thu hoạch. Mỗi ngày đủ nước, nhiệt và lao động làm tiến độ tăng `min(waterSuitability, temperatureSuitability, careFraction)`, tối đa một điểm. Đạt 12 điểm mới chín; thiếu điều kiện làm chậm, không sinh vụ mới theo lịch cứng.

Ở điều kiện đầy đủ, mỗi lô tạo tổng 10 kg sinh khối thu hoạch, gồm 7 kg hạt ăn được và 3 kg phụ phẩm hữu cơ. Sinh khối này tích lũy theo tiến độ, ghi là primary production có giới hạn thay vì vật tư chế tạo tự nhân. Gieo lại tiêu 0,5 kg hạt từ kho; thu hoạch chuyển biomass khỏi lô sang hạt/phụ phẩm đúng một lần rồi trả lô về đất chưa gieo. Không đồng thời cho hạt và khẩu phần; bếp phải thực hiện công thức 2 kg hạt → 4 khẩu phần ở mục 19.

World khởi tạo các lô lệch pha trong chu kỳ 12 ngày, kèm biomass tương ứng đã có trong seed. Làng thượng lưu thu một hoặc hai lô/ngày xen kẽ; làng hạ lưu thu một lô mỗi hai ngày, bắt đầu ở ngày đầu. Kho hạt dành cho gieo có 9 kg ở thượng lưu và 3 kg ở hạ lưu, tổng 12 kg. Mỗi làng có hai nông dân cùng một người làm bếp trong tổng 12 NPC. Người còn lại đảm nhận việc khác; không cộng thêm ba NPC. Một người làm tối đa 600 giây công việc mỗi ngày game 1.800 giây, phần còn lại dành cho đi lại, ăn và nghỉ. Chăm mỗi lô cần 15 giây/ngày, thu hoạch 60 giây và gieo 30 giây/lô; vận chuyển và nấu vẫn cần thời gian thật. Seed phải bố trí ruộng, bếp và kho để lịch này có thể thực hiện trong ngân sách.

Mỗi lô cần bổ sung tối đa 16 L/ngày, tương đương 1 mm trên 16 m² khi đất thiếu ẩm. Mưa đã vào đất được tính trước; tưới chỉ bù phần thiếu và trừ nguồn nước qua ledger. Mười tám lô thượng lưu cần tối đa 0,288 m³/ngày; sáu lô hạ lưu cần tối đa 0,096 m³/ngày. Nhu cầu uống và nấu được tính riêng. Thông số này không đại diện cho nông học thực tế.

Khi đạt đủ điều kiện, 24 lô tạo trung bình 14 kg hạt/ngày toàn world, giữ 1 kg để gieo lại, còn 13 kg tương đương 26 khẩu phần cho 24 NPC. Thượng lưu tạo trung bình 19,5 khẩu phần/ngày, hạ lưu 6,5; tuyến cầu cần giao khoảng 6 khẩu phần/ngày xuống hạ lưu. Bếp chỉ nấu lô nguyên: 2 kg hạt thành 4 khẩu phần, giữ phần hạt dư sang ngày sau, không làm tròn thành hàng miễn phí. Dư địa toàn vùng khoảng 8,3% trước hao hụt, chưa bảo đảm đủ nuôi thêm người chơi hoặc dân nhập cư.

Seed validation dùng bản sao đối chứng có cầu hoạt động, chạy lịch nông trại và vận chuyển ít nhất 12 ngày không có player. Với thời tiết khởi đầu phù hợp, không ngày nào thiếu định mức 12 khẩu phần/làng, lô chín đầu tiên tới kho trong hai ngày và kho không xuống dưới hai ngày dự trữ. Hai kho thực phẩm có tổng 72 khẩu phần/làng ở mục 63 đủ đệm sáu ngày nếu không có sản xuất. Bản chơi mở đầu có thể bắt đầu với cầu hỏng: hạ lưu thiếu dòng tiếp tế và dùng dần lượng đệm, tạo yêu cầu sửa từ facts thật; không áp dụng tiêu chí đối chứng như lời hứa rằng làng đó luôn tự đủ ăn. Seed không đạt đối chứng phải đổi vị trí/lịch và kiểm lại, không bù đồ sau mỗi ngày. Hạn, lũ, mất lao động hoặc tranh nước có thể làm sản lượng giảm thêm.

## 37 Wildlife

**Purpose.** Cho săn bắt và bảo tồn ảnh hưởng quần thể thật. **Player Experience.** Thú có thể vắng sau khai thác quá mức; đi xa rồi quay lại không hồi sinh chúng.

**Core Rules.** MVP ba loài: grazer, predator, fish; từng con có ID và trạng thái sống. **Inputs.** Thức ăn, habitat, nước, tuổi, sinh–tử và săn bắt đã xác nhận.

**Outputs.** Quần thể, thiếu ăn, xác và cá thể sơ sinh. **Interactions With Other Systems.** Food Chain trừ thức ăn thật; Logistics chuyên chở sản phẩm; History ghi suy giảm lớn sau khi xác minh.

**Player Actions.** Săn, đặt giới hạn, mở hành lang và khảo sát dấu vết. **NPC Actions.** Thợ săn chọn mục tiêu khả dụng; tránh con đang thuộc một giao dịch săn khác.

**Simulation Logic.** `Nnext=N+births−deaths+immigrants−emigrants`; không có spawn cap tự bổ sung. **Offline Behavior.** Cá thể xa dùng lịch và chuyển trạng thái ngày; sinh–tử dùng cùng ledger với động vật gần.

**Failure States.** Hạ quần thể dưới khả năng sinh sản có thể gây extirpation. **Emergent Outcomes.** Cứu nguồn nước cho cá tạo nguồn lương thực giúp làng giảm áp lực săn thú trên cạn.

**UI Presentation.** Hiện dấu vết ít/vừa/nhiều và độ tin cậy khảo sát; số chính xác dành cho debug. **Performance Considerations.** Tổng NPC và động vật full AI không vượt 128 trên toàn world/AOI kết hợp.

**Edge Cases.** Cá thể đang được người chơi tương tác không bị macro xóa đột ngột; giao dịch tử vong dùng revision check. **Future Expansion.** Alpha cho cohort quần thể lớn, nhưng giữ ID cá thể đã đặt tên và toàn bộ reservation.

| Loài | N đầu world | N tối đa theo habitat ban đầu | Sinh tối đa mỗi cá thể/ngày | Chết tự nhiên mỗi ngày | Nhu cầu ăn |
|---|---:|---:|---:|---:|---|
| Grazer | 48 | 80 | 0,004 | 0,001 | 1,5 kg cỏ khô/con/ngày |
| Predator | 6 | 10 | 0,002 | 0,001 | 0,4 kg thịt/con/ngày |
| Fish | 240 | 400 | 0,020 | 0,005 | ngân sách thức ăn thủy vực |

K hiệu dụng bằng K ban đầu × habitatQuality. Sinh chỉ khi đủ ăn≥0,9, habitat≥0,4 và có cá thể trưởng thành; tích lũy credit=`rate×eligibleAdults` mỗi ngày hợp lệ. Births=min(floor(credit),max(0,floor(K)−N)); trừ credit đã dùng, xóa phần bị chặn bởi K. Điều kiện sinh sai bảy ngày xóa credit còn lại. N>K không xóa cá thể; ngừng sinh và xét di cư/thiếu ăn. Chết tự nhiên cũng tích lũy phần lẻ theo ngày; chọn ID chưa reserve tử vong. Đây là mô hình game, không mô tả sinh học loài thật.

Materialization là đổi đại diện, không đổi N: `alive = abstract + reserved + materialized`. Đặt reservation nguyên tử `(animalId, ownerAOI, revision)` trước khi tạo mesh; thành công chuyển reserved→materialized. Timeout trả về abstract. Hai người tiếp cận cùng vùng nhận cùng ID. Kill chuyển đúng một alive→dead và tạo một corpse ID trong cùng commit. Dematerialization trả về abstract; không đưa con đã chết trở lại. Không tick đói/sinh sản hai lần cho cùng ID ở hai LOD. Cá có thể hiện thành đàn đại diện nhiều ID, thao tác bắt vẫn reserve từng ID; không cần full AI cho mọi con cá.

Thức ăn thủy vực mỗi node bắt đầu 200 kg khô, K=400 kg, r=0,025/ngày, tăng logistic theo chất lượng nước. Cá cần 0,02 kg/con/ngày; 240 con dùng 4,8 kg/ngày toàn world. Primary production là nguồn sinh khối được ghi rõ, bị giới hạn bởi nước/ánh sáng và K; không phải item loot. Khi C thấp, habitatQuality giảm tuyến tính từ 1 ở 900 m³ về 0 ở 100 m³; nồng độ ô nhiễm còn làm giảm tiếp theo đường cong data.

## 38 Food Chain

**Purpose.** Nối quần thể với nguồn thức ăn và nhu cầu làng. **Player Experience.** Bớt predator có thể tăng grazer một thời gian, rồi tăng áp lực lên cỏ và ruộng.

**Core Rules.** MVP chỉ có cỏ→grazer→predator và thủy sinh→fish; con người khai thác cả hai nhánh. **Inputs.** Biomass khả dụng, nhu cầu, đường tiếp cận và reservation săn/ăn.

**Outputs.** Phân bổ khẩu phần, thiếu ăn, xác và thay đổi reproduction. **Interactions With Other Systems.** Kế thừa giao dịch Wildlife; không vừa trừ “predation rate” macro vừa giết cùng con bằng AI.

**Player Actions.** Chọn nguồn thức ăn, giữ vùng tránh săn và cất trữ mùa dư. **NPC Actions.** Ưu tiên thức ăn tiếp cận được, không sử dụng biomass ở bên kia cầu đã gãy.

**Simulation Logic.** Chia thức ăn theo nhu cầu và đường tới; đói tích lũy ba ngày mới tăng tử vong. **Offline Behavior.** Macro giữ cùng ngân sách thức ăn; LOD thay lịch hành động, không tăng hiệu quả ăn.

**Failure States.** Thiếu thức ăn không khiến predator nhân đôi vì “độ khó”; sinh sản giảm trước. **Emergent Outcomes.** Săn gần làng quá mức khiến thợ săn phải đi xa, giá thức ăn tăng vì vận chuyển.

**UI Presentation.** Quan sát ruộng bị gặm, xác và dấu săn; báo cáo chỉ ra quan hệ đã có bằng chứng. **Performance Considerations.** Ghép nhu cầu theo habitat patch, không tính mọi cặp predator–prey.

**Edge Cases.** Một xác có lượng thịt còn lại; predator, NPC và player cùng lấy phải serialize. **Future Expansion.** Loài ăn tạp và phân hủy bổ sung cạnh mới, không thêm tất cả quan hệ tiềm năng.

Sau ba ngày nhận dưới 50% nhu cầu, chết do đói giới hạn tối đa 2% quần thể/ngày; phục hồi khi đủ 90% trong ba ngày. Một grazer chết cung cấp giả định 12 kg thịt, không phải toàn bộ trọng lượng cơ thể; phần còn lại vào ledger xác/cặn. Với sáu predator, nhu cầu 2,4 kg/ngày có thể ăn xác đó năm ngày trước spoilage; không buộc giết một con mỗi predator/ngày.

## 39 Migration

**Purpose.** Cho sinh vật phản ứng với áp lực bằng di chuyển trước khi chết. **Player Experience.** Hành lang rừng và cống có đường cá đi qua trở thành công trình hữu ích.

**Core Rules.** MVP động vật chỉ chuyển giữa các habitat patch trong một region. **Inputs.** Chênh lệch habitat, thức ăn, áp lực săn, rào cản và số chỗ còn lại ở điểm đến.

**Outputs.** Transfer có nguồn, đích, ETA và danh sách ID. **Interactions With Other Systems.** Wildlife dùng reservation; Water cung cấp điều kiện passage; đường và công trình thay chi phí di chuyển.

**Player Actions.** Giữ lối qua, mở cống và giảm săn ở tuyến hành lang. **NPC Actions.** Tác động gián tiếp qua khai thác; di cư dân cư tuân theo Population Simulation và Trade, không dùng thuật toán thú.

**Simulation Logic.** Habitat nguồn<0,35 trong ba ngày, đích cao hơn≥0,20; mỗi ngày chuyển tối đa 10% N nguồn. **Offline Behavior.** Cùng transfer ledger; catch-up hoàn tất ETA theo lịch game.

**Failure States.** Đích mất chỗ hoặc đường bị chặn khiến con vật chờ, đổi đích hoặc quay lại. **Emergent Outcomes.** Phá cầu giảm người săn qua sông nhưng cũng cản cá nếu đống đổ chặn lòng dẫn.

**UI Presentation.** Dấu vết dịch chuyển và báo cáo “đàn thú rời bờ đông”, không tự tiết lộ tọa độ từng con. **Performance Considerations.** Path theo patch graph; chỉ materialize đoạn gần người.

**Edge Cases.** In-transit vẫn nằm trong tổng alive và vẫn ăn; không cộng cả nguồn lẫn đích. **Future Expansion.** Alpha mở transfer liên region; ra ngoài world là export ghi rõ, không dùng để giấu spawn mới.

Cooldown trở lại nguồn năm ngày; chỉ đảo tuyến sớm khi hazard chặn đường sống. Cá đi qua cống khi độ mở≥0,40 và nước đạt độ sâu 0,15 m; đóng passage khi độ mở<0,30 hoặc sâu<0,10 m để tránh bật/tắt liên tục.

## 40 Extinction

**Purpose.** Tạo hậu quả dài hạn cho mất sinh cảnh mà vẫn cho người chơi cơ hội can thiệp. **Player Experience.** Nhận cảnh báo suy giảm có căn cứ; không mất cả loài vì một lần bỏ đăng nhập.

**Core Rules.** Phân biệt mất ở patch, region và toàn world; MVP có thể mất quần thể địa phương. **Inputs.** Alive, in-transit, cá thể nuôi giữ, nguồn sinh sản và kết quả khảo sát.

**Outputs.** Trạng thái nguy cấp, mất địa phương, hoặc tuyệt chủng xác minh. **Interactions With Other Systems.** Kế thừa Wildlife ledger; History chỉ ghi sự kiện đã kiểm tra toàn bộ nguồn tồn tại.

**Player Actions.** Dừng săn, phục hồi nước, bảo vệ cá thể cuối và tái thả khi có nguồn thật. **NPC Actions.** Đề nghị bảo tồn hoặc đổi sinh kế theo khả năng và giá trị cộng đồng.

**Simulation Logic.** Cảnh báo khi N<20% K ban đầu trong năm ngày; gỡ khi >30% trong mười ngày. **Offline Behavior.** Vẫn suy giảm theo nguyên nhân, nhưng cửa sổ 72 giờ giới hạn mức diễn biến vắng người.

**Failure States.** N=0 không respawn; phục hồi môi trường không tự tạo cá thể. **Emergent Outcomes.** Làng mất cá chuyển sang nông nghiệp, khiến nhu cầu tưới tăng và tranh luận về cống kéo dài.

**UI Presentation.** “Không còn dấu vết” khác “đã xác nhận mất quần thể”; luôn ghi ngày kiểm tra. **Performance Considerations.** Kiểm tra registry khi có event death/transfer, không quét toàn bản đồ mỗi frame.

**Edge Cases.** Một cá thể đang reserve hoặc đi đường ngăn tuyên bố tuyệt chủng sai. **Future Expansion.** Tái thả Alpha cần mua/vận chuyển cá thể từ nguồn ngoài có quota; phục hồi DNA chỉ là ý tưởng sau phát hành.

Server xác nhận extinction khi alive toàn world=0, không trứng/cohort/transfer còn sống và hết mọi giao dịch đang chờ. Kho mẫu DNA, nếu về sau tồn tại, là khả năng phục hồi chứ không làm quần thể được tính “đang sống”. Không cam kết mỗi loài đều luôn cứu được.

## 41 Evolution / Mutation

**Purpose.** Cho thế giới lâu năm có thích nghi có giới hạn, không sinh quái vật ngẫu nhiên. **Player Experience.** Quan sát khác biệt nhỏ giữa quần thể qua khảo sát và lịch sử.

**Core Rules.** Không triển khai mutation trong MVP hoặc phạm vi 1.0; sau phát hành chỉ thử một trait chịu khô trước khi mở rộng. **Inputs.** Thế hệ sinh sản, trait cha mẹ, khí hậu nhiều năm và PRNG phiên bản.

**Outputs.** Phân bố trait và báo cáo thay đổi đủ lớn. **Interactions With Other Systems.** Kế thừa sinh sản Wildlife/Vegetation; trait chỉ sửa suitability, không tạo biomass hay cá thể.

**Player Actions.** Bảo vệ đa dạng nguồn giống, thử nuôi chọn lọc khi có công cụ. **NPC Actions.** Nông dân có thể giữ giống sống tốt, phải dùng hạt thật từ vụ trước.

**Simulation Logic.** Trait chuẩn hóa [-0,10;0,10], mỗi thế hệ đổi tối đa 0,005; chịu khô tốt đổi lấy sinh trưởng thấp. **Offline Behavior.** Chỉ đổi qua births được ghi; 72 giờ vắng không được quy đổi thành hàng thế kỷ.

**Failure States.** Một trait tăng mọi chỉ số không có tradeoff bị loại khỏi data review. **Emergent Outcomes.** Giống sống tốt nơi khô có năng suất thấp khi nước dồi dào, tạo lựa chọn gieo trồng.

**UI Presentation.** So sánh quan sát nhiều đời và độ tin cậy, không dùng nhãn rarity. **Performance Considerations.** Một vài tham số cohort; không genome simulation hay giải tiến hóa hình dạng.

**Edge Cases.** Bức xạ chưa có MVP; thêm chất độc không mặc nhiên tăng mutation có lợi. **Future Expansion.** Ngoại hình thích nghi chỉ làm sau khi phân bố trait tạo gameplay kiểm chứng được.

## 42 Resources

**Purpose.** Buộc khai thác, tái chế và vận chuyển có giá trị lâu dài. **Player Experience.** Mỏ cạn là thay đổi kinh tế có thật; tri thức và tái chế giúp sống tiếp với nguồn hạn chế.

**Core Rules.** Gỗ/nước tái tạo có điều kiện; khoáng, phế liệu và nhiên liệu là trữ lượng hữu hạn. **Inputs.** Deposit ID, khối lượng còn lại, công cụ, recipe và quyền khai thác.

**Outputs.** Vật liệu, cặn, hao mòn công cụ và hố khai thác. **Interactions With Other Systems.** Logistics giới hạn thông lượng; Pollution nhận phần chất thải; giá tăng khi chi phí tìm nguồn mới tăng.

**Player Actions.** Khảo sát, khai thác, tái sử dụng và chọn vật liệu thay thế. **NPC Actions.** Chỉ lập đơn bán từ kho hoặc năng lực sản xuất đã đặt; không bán ore vô hạn.

**Simulation Logic.** Giao dịch trừ deposit đồng thời tạo output và waste theo tỷ lệ recipe. **Offline Behavior.** Máy nhà tuân thủ credit tối đa tám giờ thực cùng nguồn, điện, nhân lực và chỗ chứa.

**Failure States.** Deposit=0 đóng job và trả phần reservation chưa tiêu thụ. **Emergent Outcomes.** Cầu gỗ có thể tiếp tục dùng khi thép hiếm, nhưng cần bảo trì và diện tích rừng lớn hơn.

**UI Presentation.** Khảo sát hiển thị khoảng trữ lượng và độ tin cậy; lượng đã khai thác chắc chắn. **Performance Considerations.** Một record/deposit và giao dịch theo lô, không voxel khoáng toàn bản đồ.

**Edge Cases.** Recycling không phục hồi đủ nguyên liệu ban đầu; phá rồi xây lại phải hao hụt. **Future Expansion.** Alpha có nhập khẩu hữu hạn theo quota và giá, khai thác sâu mở kho có sẵn; không gọi đó là địa chất tái sinh.

MVP khởi tạo giả định: 12.000 kg đá khai thác, 2.000 kg quặng nghèo và 800 kg phế liệu ở các deposit đã đặt; 24 item definition chỉ phân loại hàng, không tăng trữ lượng. Một recipe thử: 10 kg quặng → 3 kg kim loại + 7 kg tailings, cộng nhiên liệu riêng. Thu hồi đồ kim loại tối đa 70% kim loại chứa trong đồ; phần còn lại là cặn. Server dài hạn không được hứa “không bao giờ hết tài nguyên”; nếu không có nhập khẩu, người chơi còn phương án gỗ, đá thu hồi, sửa chữa và thu nhỏ quy mô.

## 43 Pollution

**Purpose.** Cho sản xuất tạo ngoại tác có nguồn gốc và đường xử lý. **Player Experience.** Nước đổi màu, cá ít và việc lấy nước phải chuyển xa; lọc nước tạo cặn cần vận chuyển.

**Core Rules.** MVP một chất ô nhiễm hòa tan, một kho tailings rắn; không gộp thành điểm karma. **Inputs.** Khối lượng phát thải kg, thể tích nước m³, dòng chảy và hiệu suất lọc.

**Outputs.** Khối lượng chất trong node, cặn, chỉ số chất lượng và phơi nhiễm. **Interactions With Other Systems.** Water mang chất đi theo phần thể tích chuyển; Wildlife dùng chất lượng; Economy tính chi phí xử lý.

**Player Actions.** Đặt bãi chứa có che, thu gom, lọc và kiểm tra hạ lưu. **NPC Actions.** Đổi nguồn nước, yêu cầu sửa nguồn thải hoặc thuê vận chuyển cặn.

**Simulation Logic.** `concentration = pollutantKg / waterM3`; chỉ tính khi nước>epsilon. **Offline Behavior.** Chất vẫn dịch chuyển trong horizon; máy nhà dừng phát thải khi sản xuất dừng, cặn cũ vẫn có thể bị mưa rửa.

**Failure States.** Pha loãng làm giảm nồng độ nhưng không xóa khối lượng; nước cạn để lại cặn. **Emergent Outcomes.** Xả nước cứu cá tại chỗ có thể chuyển chất ô nhiễm xuống làng dưới.

**UI Presentation.** Mức sạch–cảnh báo–ô nhiễm, nguồn đóng góp đã khảo sát; panel nâng cao hiện kg/m³. **Performance Considerations.** Advection trên bốn node; không mô phỏng hóa học phản ứng đa chất.

**Edge Cases.** Chất lọc ra cộng vào thùng cặn; thùng đầy làm job dừng trước giao dịch. **Future Expansion.** Không khí, bệnh và bức xạ cần đường phơi nhiễm riêng, không dùng cùng một chỉ số chung.

Giả định game: cảnh báo ở 0,005 kg/m³ trong hai giờ, gỡ dưới 0,003 trong sáu giờ; đây không phải ngưỡng an toàn ngoài đời. Node 1.000 m³ chứa 10 kg có nồng độ 0,01 kg/m³. Chuyển 100 m³ mang theo 1 kg nếu trộn đều. Bộ lọc chạy tay thử nghiệm xử lý lô 10 m³, lấy 80% chất trong lô vào cặn, tiêu thụ vật liệu lọc và lao động theo recipe; không làm sạch toàn node. Bản chạy điện chỉ xuất hiện ở giai đoạn đã có Electricity. Nguyên mẫu kỹ thuật có thể dùng cùng bàn thao tác; không thêm một hệ điện vào MVP vì bộ lọc. MVP không có decay tự nhiên cho chất bền này. Ledger: stock cuối = stock đầu + thải mới + import − export − chất chuyển sang kho cặn.

## 44 Environmental Consequences

**Purpose.** Kết nối lợi ích sản xuất với tác động sinh thái, xã hội và lịch sử. **Player Experience.** Hiểu cái giá của lựa chọn và có phương án giảm hại, không nhận điểm thiện/ác.

**Core Rules.** Mọi hoạt động khai thác/sản xuất khai báo đầu vào, đầu ra, footprint và phát thải. **Inputs.** Transaction nguồn, diện tích tác động, các biến môi trường và bằng chứng người chứng kiến.

**Outputs.** Thay đổi habitat, độ phì, ô nhiễm, thông tin NPC và candidate Chronicle. **Interactions With Other Systems.** NPC phản ứng từ tác hại quan sát được và quan hệ, không đọc ý định player.

**Player Actions.** Xem dự toán, chọn quy mô, trả chi phí bảo trì, phục hồi hoặc thương lượng. **NPC Actions.** Điều chỉnh việc làm, giá, nhu cầu cứu trợ và thái độ tùy người hưởng lợi hay chịu thiệt.

**Simulation Logic.** Chỉ một owner system áp dụng mỗi delta; consequence graph đọc kết quả và ghi causal parent IDs. **Offline Behavior.** Hậu quả công cộng tiếp diễn trong 72 giờ; nhà bảo vệ không chặn dòng hoặc tự làm sạch môi trường.

**Failure States.** Gán mọi tai họa cho hành động gần nhất tạo nhân quả giả; UI phải phân biệt góp phần và nguyên nhân trực tiếp. **Emergent Outcomes.** Phá rừng cứu mùa đói được làng biết ơn nhưng thợ săn mất sinh kế.

**UI Presentation.** Trước xây: diện tích mất cây, nhu cầu vật liệu và rủi ro hạ lưu; sau xây: số đo thực cùng timestamp. **Performance Considerations.** Gộp event nhỏ theo ngày, giữ giao dịch gốc để kiểm chứng.

**Edge Cases.** Người vào sau không tự bị quy trách nhiệm cho công trình cũ; ownership đổi không viết lại lịch sử. **Future Expansion.** Alpha thêm đền bù, quy hoạch và quyền sử dụng nước sau khi mô hình NPC hỗ trợ tranh chấp.

Ví dụ dự toán: đường dài 40 m, rộng 4 m chiếm 160 m², tương đương mười ô sinh thái; lượng gỗ mất tính từ biomass thật trên footprint, không cố định mười cây. Đất bị nén giảm infiltration factor tại đó từ 0,60 xuống 0,35. Mưa 10 mm trên footprint là 1,6 m³, làm runoff tăng 0,4 m³ nếu các điều kiện khác giữ nguyên; không được nói một đoạn đường tự tạo lũ toàn region. Phục hồi cần tháo mặt đường, lao động và hạt; sau đó độ phì hồi theo giới hạn 0,002/ngày và cây theo tốc độ thật. Giá vật liệu phục hồi, vận chuyển cặn và sản lượng bỏ lỡ đều là chi phí gameplay.
