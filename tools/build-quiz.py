#!/usr/bin/env python3
"""Sinh js/data/quiz.js. Mỗi mục: (câu hỏi, đáp án ĐÚNG, [3 đáp án sai], giải thích).
Đáp án đúng luôn đặt đầu danh sách trong dữ liệu; app tự xáo thứ tự khi ra đề."""
import json
Q = [
("Chất dinh dưỡng nào cung cấp nhiều năng lượng nhất trên mỗi gram?", "Chất béo (khoảng 9 kcal/g)", ["Tinh bột (khoảng 9 kcal/g)", "Chất đạm (khoảng 9 kcal/g)", "Vitamin (khoảng 9 kcal/g)"], "1 g chất béo cho khoảng 9 kcal, trong khi 1 g tinh bột hoặc chất đạm chỉ khoảng 4 kcal; vitamin không cung cấp năng lượng."),
("1 gam chất đạm (protein) cung cấp khoảng bao nhiêu kcal?", "4 kcal", ["2 kcal", "7 kcal", "9 kcal"], "Chất đạm và tinh bột đều cho khoảng 4 kcal/g, chất béo khoảng 9 kcal/g."),
("Theo ngưỡng BMI dành cho người châu Á, khoảng BMI nào được xem là bình thường?", "Từ 18,5 đến 22,9", ["Từ 16 đến 18,4", "Từ 25 đến 29,9", "Từ 30 đến 34,9"], "Ngưỡng WHO khu vực Tây Thái Bình Dương: 18,5–22,9 là bình thường; từ 23 trở lên bắt đầu thừa cân (nguy cơ)."),
("BMI được tính bằng công thức nào?", "Cân nặng (kg) chia cho bình phương chiều cao (m)", ["Cân nặng (kg) chia cho chiều cao (m)", "Chiều cao (cm) chia cho cân nặng (kg)", "Cân nặng (kg) nhân với chiều cao (m)"], "BMI = kg / m². Ví dụ 60 kg, cao 1,70 m → 60 / 2,89 ≈ 20,8."),
("TDEE là gì?", "Tổng năng lượng cơ thể tiêu hao trong một ngày", ["Lượng nước cần uống mỗi ngày", "Chỉ số khối cơ thể", "Lượng đạm tối thiểu mỗi ngày"], "TDEE = BMR nhân hệ số vận động; đây là căn cứ để ước tính lượng calo nên ăn mỗi ngày."),
("BMR (chuyển hóa cơ bản) là gì?", "Năng lượng cơ thể cần khi nghỉ ngơi hoàn toàn để duy trì sự sống", ["Năng lượng tiêu hao khi chạy bộ", "Lượng calo trong bữa sáng", "Lượng nước mất qua mồ hôi"], "BMR là năng lượng cho hô hấp, tuần hoàn, duy trì thân nhiệt... khi nghỉ ngơi."),
("Người ít vận động đến vận động vừa phải nên uống khoảng bao nhiêu nước mỗi ngày (theo cân nặng)?", "Khoảng 30–35 ml cho mỗi kg cân nặng", ["Khoảng 5–10 ml cho mỗi kg", "Khoảng 60–70 ml cho mỗi kg", "Chỉ cần uống khi khát nhiều"], "Ước tính thường dùng là 30–35 ml/kg/ngày; vận động nhiều hoặc trời nóng cần uống thêm."),
("Đồ uống nào tốt nhất để bù nước hằng ngày?", "Nước lọc", ["Nước ngọt có ga", "Trà sữa trân châu", "Nước tăng lực"], "Nước lọc bù nước hiệu quả mà không thêm đường hay caffeine."),
("Dấu hiệu nào cho thấy cơ thể có thể đang thiếu nước?", "Nước tiểu có màu vàng sậm", ["Nước tiểu trong, gần như không màu", "Đi tiểu nhiều lần trong ngày", "Da ẩm mát"], "Nước tiểu vàng sậm, khát, mệt, đau đầu nhẹ là dấu hiệu gợi ý thiếu nước."),
("Khi vận động mạnh và ra nhiều mồ hôi, nên làm gì?", "Uống nước từng ngụm nhỏ, đều đặn", ["Nhịn nước để khỏi buồn đi tiểu", "Uống một lần thật nhiều nước đá lạnh", "Chỉ uống nước ngọt có ga"], "Uống chia nhỏ nhiều lần giúp bù nước ổn định và dễ chịu hơn."),
("Thực phẩm nào là nguồn vitamin C tốt?", "Ổi", ["Dầu ăn", "Đường cát", "Muối ăn"], "Ổi, cam, bưởi, ớt chuông là những nguồn vitamin C dồi dào."),
("Thiếu vitamin C kéo dài có thể gây bệnh nào?", "Scorbut (chảy máu nướu, chậm lành vết thương)", ["Quáng gà", "Còi xương", "Bướu cổ"], "Scorbut do thiếu vitamin C; quáng gà do thiếu vitamin A; còi xương do thiếu vitamin D/canxi; bướu cổ do thiếu iốt."),
("Vitamin nào giúp hấp thu canxi tốt hơn và cơ thể có thể tự tổng hợp nhờ ánh nắng?", "Vitamin D", ["Vitamin A", "Vitamin B1", "Vitamin C"], "Da tiếp xúc ánh nắng sẽ tổng hợp vitamin D, giúp hấp thu canxi để xương chắc khỏe."),
("Thiếu iốt kéo dài có thể dẫn đến bệnh nào?", "Bướu cổ", ["Còi xương", "Thiếu máu", "Quáng gà"], "Iốt cần cho tuyến giáp; dùng muối iốt và hải sản giúp phòng bướu cổ."),
("Thiếu sắt lâu ngày dễ dẫn đến tình trạng nào?", "Thiếu máu (da xanh, mệt mỏi)", ["Bướu cổ", "Quáng gà", "Còi xương"], "Sắt cần để tạo hồng cầu; thiếu sắt gây thiếu máu, dễ mệt và khó tập trung."),
("Thực phẩm nào giàu sắt?", "Thịt bò nạc", ["Nước ngọt", "Kẹo dẻo", "Đường cát"], "Thịt đỏ, gan, huyết, đậu là nguồn sắt tốt; sắt trong thịt dễ hấp thu hơn sắt trong thực vật."),
("Ăn kèm thứ gì giúp cơ thể hấp thu sắt từ thực vật tốt hơn?", "Thực phẩm giàu vitamin C (cam, ổi...)", ["Trà đặc uống ngay sau bữa ăn", "Nước ngọt có ga", "Rượu bia"], "Vitamin C làm tăng hấp thu sắt; trà đặc thì làm giảm hấp thu sắt."),
("Thực phẩm nào là nguồn canxi tốt?", "Sữa chua", ["Nước ngọt có ga", "Xúc xích chiên", "Kẹo dẻo"], "Sữa và chế phẩm từ sữa, cá nhỏ ăn cả xương, đậu phụ là các nguồn canxi tốt."),
("Nhóm chất nào là 'nguyên liệu xây dựng' chính của cơ bắp?", "Chất đạm (protein)", ["Chất béo", "Đường", "Muối khoáng"], "Protein tham gia xây dựng và sửa chữa cơ, da, enzyme và nhiều mô khác."),
("Thành phần dinh dưỡng chính của lòng trắng trứng là gì?", "Chất đạm (protein)", ["Chất béo", "Tinh bột", "Chất xơ"], "Lòng trắng trứng gồm chủ yếu là nước và protein, rất ít chất béo."),
("Nguồn chất đạm thực vật nào sau đây đúng?", "Đậu phụ", ["Dầu ăn", "Đường", "Muối"], "Đậu nành, đậu phụ, đậu lăng, các loại hạt là nguồn đạm thực vật."),
("Cơm, bún, phở, bánh mì thuộc nhóm thực phẩm nào?", "Nhóm chất bột đường (tinh bột)", ["Nhóm chất béo", "Nhóm vitamin", "Nhóm khoáng chất"], "Đây là nhóm cung cấp năng lượng chính, chiếm khoảng 50–55% năng lượng khẩu phần."),
("Chất xơ có nhiều nhất trong nhóm thực phẩm nào?", "Rau xanh, trái cây, ngũ cốc nguyên hạt", ["Đường, kẹo, bánh ngọt", "Dầu và mỡ", "Nước ngọt"], "Chất xơ có trong thực vật; đường, dầu mỡ và nước ngọt gần như không có chất xơ."),
("Lợi ích chính của chất xơ là gì?", "Hỗ trợ tiêu hóa và tạo cảm giác no lâu", ["Cung cấp nhiều năng lượng nhất", "Giúp cơ thể tổng hợp vitamin D", "Làm tăng cholesterol xấu"], "Chất xơ giúp nhu động ruột tốt, no lâu và góp phần ổn định đường huyết."),
("WHO khuyến nghị ăn tối thiểu khoảng bao nhiêu rau và trái cây mỗi ngày?", "Khoảng 400 g", ["Khoảng 50 g", "Khoảng 100 g", "Không cần ăn hằng ngày"], "Ít nhất 400 g rau và trái cây mỗi ngày (khoảng 5 phần) giúp phòng nhiều bệnh mạn tính."),
("So với uống nước ép, ăn nguyên trái cây thường tốt hơn vì sao?", "Giữ được chất xơ nên no lâu và hấp thu đường chậm hơn", ["Vì nguyên trái cây không có vitamin", "Vì nước ép luôn có nhiều chất xơ hơn", "Vì nguyên trái cây không có nước"], "Khi ép, phần lớn chất xơ bị bỏ đi; đường tự do trong nước ép dễ hấp thu nhanh hơn."),
("Rau củ màu cam như cà rốt giàu chất nào mà cơ thể chuyển thành vitamin A?", "Beta-carotene", ["Canxi", "Natri", "Đường"], "Beta-carotene là tiền vitamin A, có nhiều trong cà rốt, bí đỏ, xoài chín."),
("Thiếu vitamin A có thể gây ra bệnh nào ở mắt?", "Quáng gà", ["Cận thị do di truyền", "Đục thủy tinh thể ngay lập tức", "Không ảnh hưởng đến mắt"], "Vitamin A cần cho thị giác, đặc biệt khi nhìn trong điều kiện thiếu sáng."),
("Chất béo chuyển hóa (trans fat) trong đồ chiên rán công nghiệp nên hạn chế vì sao?", "Làm tăng nguy cơ bệnh tim mạch", ["Giúp tăng chiều cao nhanh hơn", "Cung cấp nhiều vitamin", "Giúp giảm cholesterol xấu"], "Chất béo chuyển hóa làm tăng cholesterol xấu và nguy cơ tim mạch; nên hạn chế đồ chiên đi chiên lại."),
("DHA (omega-3) tốt cho não bộ có nhiều trong loại thực phẩm nào?", "Cá béo như cá hồi, cá thu", ["Nước ngọt", "Kẹo bánh", "Mì ăn liền"], "Cá béo là nguồn omega-3 (DHA, EPA) tốt; nên ăn cá vài lần mỗi tuần."),
("Vì sao uống trà sữa hằng ngày dễ gây thừa cân?", "Chứa nhiều đường và năng lượng nhưng ít chất dinh dưỡng khác", ["Vì chứa nhiều chất xơ", "Vì không chứa calo", "Vì chỉ toàn nước"], "Một ly trà sữa trân châu có thể lên tới vài trăm kcal, phần lớn từ đường và chất béo."),
("Một lon nước ngọt có ga 330 ml chứa khoảng 35 g đường. Con số đó tương đương bao nhiêu thìa cà phê đường (khoảng 4–5 g/thìa)?", "Khoảng 8 thìa", ["Khoảng 2 thìa", "Khoảng 4 thìa", "Khoảng 15 thìa"], "35 g chia cho khoảng 4,5 g/thìa ≈ 8 thìa cà phê đường chỉ trong một lon."),
("WHO khuyến nghị đường tự do nên chiếm dưới bao nhiêu phần trăm tổng năng lượng ăn vào?", "Dưới 10%", ["Dưới 30%", "Dưới 40%", "Dưới 50%"], "Giảm xuống dưới 5% còn có lợi hơn nữa cho sức khỏe răng miệng và cân nặng."),
("WHO khuyến nghị người trưởng thành ăn dưới khoảng bao nhiêu muối mỗi ngày?", "Dưới 5 g (khoảng 1 thìa cà phê)", ["Khoảng 15 g", "Khoảng 25 g", "Khoảng 30 g"], "5 g muối tương đương khoảng 2 g natri; ăn mặn kéo dài làm tăng nguy cơ tăng huyết áp."),
("Thực phẩm nào thường chứa nhiều natri (muối)?", "Mì ăn liền (kể cả gói gia vị)", ["Táo", "Cà rốt", "Sữa tươi không đường"], "Mì gói, đồ muối, nước chấm, đồ chế biến sẵn thường có rất nhiều muối."),
("Món ăn vặt nào lành mạnh hơn?", "Trái cây tươi", ["Xúc xích chiên", "Khoai tây chiên", "Kẹo dẻo"], "Trái cây cung cấp vitamin và chất xơ; các món chiên, kẹo ngọt nhiều năng lượng nhưng ít dưỡng chất."),
("Bữa sáng nào phù hợp nhất để học tập tỉnh táo?", "Bữa cân đối có tinh bột, chất đạm và rau/trái cây", ["Chỉ uống nước ngọt", "Bỏ bữa để giảm cân", "Chỉ ăn kẹo và bánh ngọt"], "Bữa sáng đủ nhóm chất giúp duy trì năng lượng và sự tập trung suốt buổi học."),
("Trước và trong kỳ thi, cách ăn uống nào hợp lý?", "Ăn đủ bữa, cân đối, uống đủ nước", ["Bỏ bữa để có thêm thời gian học", "Uống nước tăng lực thay bữa ăn", "Ăn thật nhiều đồ ngọt"], "Ăn đủ và đều giúp đường huyết ổn định, trí nhớ và sự tập trung tốt hơn."),
("Nước tăng lực chứa nhiều caffeine. Với học sinh nên làm gì?", "Hạn chế hoặc tránh dùng", ["Uống thay bữa ăn", "Uống trước giờ đi ngủ để học bài", "Uống thay nước lọc"], "Caffeine dễ gây mất ngủ, tim đập nhanh; thanh thiếu niên nên hạn chế."),
("Thiếu ngủ thường ảnh hưởng đến ăn uống như thế nào?", "Dễ thèm đồ ngọt và đồ béo hơn", ["Làm giảm cảm giác thèm ăn hoàn toàn", "Làm tăng chiều cao", "Không ảnh hưởng gì"], "Thiếu ngủ làm rối loạn hormone đói–no, khiến dễ ăn nhiều và thèm đồ ngọt béo."),
("Ăn chậm, nhai kỹ có lợi ích gì?", "Giúp nhận biết cảm giác no và tránh ăn quá nhiều", ["Làm nhanh đói hơn", "Làm giảm hấp thu tất cả dưỡng chất", "Làm tăng đường huyết ngay lập tức"], "Não cần một khoảng thời gian để nhận tín hiệu no; ăn chậm giúp không ăn quá mức."),
("Thức ăn đã nấu chín để ở nhiệt độ phòng quá bao lâu thì nên bỏ?", "Khoảng 2 giờ", ["Khoảng 12 giờ", "Khoảng 24 giờ", "Khoảng 3 ngày"], "Vi khuẩn phát triển nhanh ở nhiệt độ 5–60°C; trời nóng thời gian an toàn còn ngắn hơn."),
("Biện pháp đơn giản nhất giúp phòng các bệnh đường tiêu hóa là gì?", "Rửa tay bằng xà phòng trước khi ăn", ["Ăn thật nhanh", "Uống nước ngọt sau bữa ăn", "Nhịn ăn"], "Rửa tay đúng cách làm giảm rõ rệt nguy cơ tiêu chảy và các bệnh truyền qua đường ăn uống."),
("Trên nhãn thực phẩm, danh sách thành phần thường được sắp xếp thế nào?", "Từ nhiều đến ít theo khối lượng", ["Từ ít đến nhiều", "Ngẫu nhiên", "Theo thứ tự bảng chữ cái"], "Thành phần đứng đầu danh sách là thành phần có khối lượng nhiều nhất."),
("So với gạo trắng, gạo lứt có đặc điểm nào?", "Nhiều chất xơ và vitamin nhóm B hơn", ["Không chứa tinh bột", "Ít chất xơ hơn", "Không có vitamin nào"], "Gạo lứt còn lớp cám nên giữ lại nhiều chất xơ, vitamin B và khoáng chất."),
]
assert len(Q) >= 40, len(Q)
ids = set()
out = ["/**",
 " * NutriFuture — Ngân hàng câu đố dinh dưỡng học đường (đã kiểm duyệt, dùng khi không có AI/mất mạng).",
 " * Sinh bằng tools/build-quiz.py — sửa nội dung ở đó rồi chạy lại. Ứng dụng tự xáo thứ tự đáp án khi ra đề.",
 " */", "const NF_QUIZ_BANK = ["]
for i, (q, ok, wrong, ex) in enumerate(Q, 1):
    qid = f"q{i:02d}"; assert qid not in ids; ids.add(qid)
    assert len(wrong) == 3 and len({ok, *wrong}) == 4
    out.append("  " + json.dumps({"id": qid, "q": q, "options": [ok, *wrong], "answer": 0, "explain": ex}, ensure_ascii=False) + ",")
out.append("];")
print("\n".join(out))
print(len(Q), "câu", file=__import__('sys').stderr)
