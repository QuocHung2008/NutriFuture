"""E2E trình duyệt thật (Playwright, Chromium) — 65 kiểm tra: nút Tra cứu, cổng hồ sơ, tra cứu CSDL+AI, game, đổi thực đơn, chuyển động.
AI được giả lập bằng route (không tốn quota). Chạy:
    python3 -m http.server 8123 &      # tại thư mục gốc repo
    pip install playwright && playwright install chromium
    python3 tests/e2e/e2e.py
"""
import json, re, sys, time
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8123/index.html"
PROFILE = {"name":"Test","gender":"male","age":17,"height":170,"weight":60,"activity":1.375,"bmi":20.8,"bmr":1600,"tdee":2200,"waterMl":2000}
results = []
def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if (extra and not cond) else ""))

state = {"mode": "ok", "calls": [], "plan_bad_first": False, "plan_calls": 0}

def ai_text(prompt):
    if "số liệu CHUẨN" in prompt:
        if state["mode"] == "ai_fail": return None
        return json.dumps({"advice":"Cơm trắng nên ăn cùng rau và đạm.","fiber":1.2,"vitamins":["B1"],"minerals":["Magie"],
                           "calories": 999, "protein": 99, "fat": 99, "carb": 99})   # cố ghi đè số liệu
    if "Gợi ý thực đơn" in prompt:
        state["plan_calls"] += 1
        tag = state["plan_calls"]
        fruit = not (state["plan_bad_first"] and state["plan_calls"] == 1)
        meals = [
          {"type":"Bữa Sáng","name":f"Bánh mì trứng {tag}","calories":500,"protein":20,"fat":15,"carb":70,"hasVeg":False,"hasFruit":False,"description":"x"},
          {"type":"Bữa Trưa","name":f"Cơm gà rau muống {tag}","calories":750,"protein":35,"fat":20,"carb":100,"hasVeg":True,"hasFruit":False,"description":"x"},
          {"type":"Bữa Tối","name":f"Bún cá {tag}","calories":650,"protein":30,"fat":15,"carb":90,"hasVeg":False,"hasFruit":False,"description":"x"},
          {"type":"Bữa Phụ","name":f"Chuối {tag}" if fruit else f"Bánh quy {tag}","calories":300,"protein":3,"fat":5,"carb":60,"hasVeg":False,"hasFruit":fruit,"description":"x"},
        ]
        return json.dumps({"planName":"Thực đơn thử","meals":meals,"totalCalories":5,"advice":"ok"})
    if "câu hỏi trắc nghiệm" in prompt:
        if state["mode"] == "quiz_ai":
            qs=[{"q":f"Câu AI {i}?","options":[f"đúng{i}",f"sai{i}a",f"sai{i}b",f"sai{i}c"],"answer":0,"explain":"giải thích"} for i in range(5)]
            return json.dumps({"questions":qs})
        return None
    # searchFood
    return json.dumps({"name":"Bánh flan","serving":"1 hũ ~100g","calories":180,"protein":4,"fat":6,"carb":28,"fiber":0,
                       "vitamins":["A"],"minerals":["Canxi"],"foodGroup":"Tinh bột","hasVeg":False,"hasFruit":False,"advice":"Ăn vừa phải."})

def install_routes(ctx, key="TESTKEY_NOT_REAL_1234567890"):
    def handler(route):
        url = route.request.url
        if "generativelanguage.googleapis.com" in url:
            body = route.request.post_data or ""
            try: prompt = json.loads(body)["contents"][0]["parts"][0]["text"]
            except Exception: prompt = body
            state["calls"].append(prompt)
            txt = ai_text(prompt)
            if txt is None:
                return route.fulfill(status=503, content_type="application/json", body=json.dumps({"error":{"message":"overloaded","code":503}}))
            return route.fulfill(status=200, content_type="application/json",
                body=json.dumps({"candidates":[{"content":{"parts":[{"text":txt}]},"finishReason":"STOP"}]}))
        if url.startswith("http://127.0.0.1"):
            if url.endswith("/js/config.js"):
                return route.fulfill(status=200, content_type="application/javascript",
                    body="const GEMINI_CONFIG={apiKey:%s,apiUrl:'',model:'gemini-2.5-flash',maxTokens:2048};" % json.dumps(key))
            return route.continue_()
        return route.abort()
    ctx.route("**/*", handler)

def new_page(p, key="TESTKEY_NOT_REAL_1234567890", seed_profile=True, viewport=(420, 860), reduced=False, storage=None):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":viewport[0],"height":viewport[1]}, service_workers="block",
                        reduced_motion="reduce" if reduced else "no-preference")
    install_routes(ctx, key)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console:"+m.text) if m.type == "error" and "Failed to load resource" not in m.text and "ERR_FAILED" not in m.text and "net::" not in m.text else None)
    pg.goto(BASE)
    if seed_profile:
        pg.evaluate("(p)=>{localStorage.setItem('nf_profile_v2',JSON.stringify(p));localStorage.setItem('nf_onboarded','true');}", PROFILE)
    if storage:
        pg.evaluate("(s)=>{for(const [k,v] of Object.entries(s)) localStorage.setItem(k, v)}", storage)
    return b, ctx, pg, errs

def go(pg, h):
    pg.evaluate("(h)=>{location.hash=h}", h); pg.wait_for_timeout(350)

with sync_playwright() as p:
    # ───────── A. Nút Tra cứu ─────────
    b, ctx, pg, errs = new_page(p)
    go(pg, "#lookup"); pg.reload(); pg.wait_for_selector("#btn-submit-search"); pg.wait_for_timeout(700)
    btn = pg.locator("#btn-submit-search")
    r0 = btn.bounding_box(); btn.hover(); pg.wait_for_timeout(350); r1 = btn.bounding_box()
    pg.mouse.down(); pg.wait_for_timeout(250); r2 = btn.bounding_box(); pg.mouse.up()
    same = lambda a,b: all(abs(a[k]-b[k]) < 0.01 for k in ("x","y","width","height"))
    check("A1 nút Tra cứu không dịch chuyển/phóng to khi hover", same(r0, r1), f"{r0} -> {r1}")
    check("A2 nút Tra cứu không dịch chuyển/phóng to khi nhấn giữ", same(r0, r2), f"{r0} -> {r2}")
    inp = pg.locator("#input-food-query").bounding_box() if pg.locator("#input-food-query").count() else None
    cy_btn = r0["y"] + r0["height"]/2
    if inp: check("A3 nút vẫn nằm giữa ô nhập theo chiều dọc", abs(cy_btn - (inp["y"] + inp["height"]/2)) < 1.5, f"{cy_btn} vs {inp['y']+inp['height']/2}")
    b.close()

    # ───────── B. Cổng nhập hồ sơ ─────────
    b, ctx, pg, errs = new_page(p, seed_profile=False)
    pg.goto(BASE + "#diary"); pg.wait_for_timeout(700)
    check("B1 chưa có hồ sơ + gõ #diary → về Hồ sơ", "#profile" in pg.url, pg.url)
    modal_visible = pg.locator("#modal-overlay.modal--show").count() == 1
    check("B2 hiện thông báo (modal) bắt buộc nhập hồ sơ", modal_visible)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    check("B3 ESC không đóng được modal", pg.locator("#modal-overlay.modal--show").count() == 1)
    pg.mouse.click(5, 5); pg.wait_for_timeout(200)
    check("B4 bấm nền không đóng được modal", pg.locator("#modal-overlay.modal--show").count() == 1)
    pg.click("#gate-notice-ok"); pg.wait_for_timeout(300)
    check("B5 nút 'Nhập thông tin ngay' đóng modal", pg.locator("#modal-overlay.modal--show").count() == 0)
    for h in ["#home", "#history", "#camera", "#lookup", "#game"]:
        go(pg, h); pg.wait_for_timeout(200)
        check(f"B6 gõ tay {h} → về Hồ sơ", "#profile" in pg.url and pg.locator("#prof-age").count() == 1, pg.url)
    check("B7 lần chặn sau dùng toast, không bật lại modal", pg.locator("#modal-overlay.modal--show").count() == 0)
    pg.click('.nav-btn[data-target="#profile"]'); pg.wait_for_timeout(300)
    check("B8 bấm tab Hồ sơ khi chưa có dữ liệu vẫn thấy banner chào mừng", "Chào mừng" in pg.inner_text("#app-content"))
    # Form: tuổi 14 / 23 bị từ chối
    def fill(age="17", h="170", w="60", gender="male"):
        pg.select_option("#prof-gender", gender); pg.fill("#prof-age", age); pg.fill("#prof-height", h); pg.fill("#prof-weight", w)
    for bad in ["14", "23"]:
        fill(age=bad); pg.click("#btn-save-profile"); pg.wait_for_timeout(300)
        saved = pg.evaluate("()=>localStorage.getItem('nf_profile_v2')")
        check(f"B9 tuổi {bad} không lưu + viền đỏ", (saved is None) and pg.locator("#prof-age.is-invalid").count() == 1)
    fill(age="17"); pg.click("#btn-save-profile"); pg.wait_for_timeout(1500)
    check("B10 hồ sơ hợp lệ: lưu và tự về Trang chủ", "#home" in pg.url, pg.url)
    check("B10b game có huy hiệu Người mới", "rookie" in (pg.evaluate("()=>localStorage.getItem('nf_game')") or ""))
    # Backup có onboarded:true nhưng hồ sơ rỗng vẫn bị chặn
    pg.evaluate("()=>{localStorage.clear(); localStorage.setItem('nf_onboarded','true'); localStorage.setItem('nf_profile_v2', JSON.stringify({gender:'male',age:17,height:0,weight:0,tdee:0}));}")
    pg.goto(BASE + "#home"); pg.reload(); pg.wait_for_timeout(700)
    check("B11 cờ onboarded=true + hồ sơ rỗng vẫn bị chặn", "#profile" in pg.url, pg.url)
    check("B11b hồ sơ đã lưu nhưng không hợp lệ → thông báo 'cần cập nhật'", "cập nhật" in pg.inner_text("#modal-content") if pg.locator("#modal-content").count() else False)
    b.close()

    # ───────── C. Tra cứu CSDL + AI ─────────
    state["mode"] = "ok"; state["calls"].clear()
    b, ctx, pg, errs = new_page(p)
    go(pg, "#lookup"); pg.reload(); pg.wait_for_selector("#input-food-query")
    def search(q):
        pg.fill("#input-food-query", q); pg.click("#btn-submit-search")
    n0 = len(state["calls"])
    search("  CƠM   trắng ")
    pg.wait_for_selector(".result-card"); pg.wait_for_function("()=>document.querySelector('.result-card')?.innerText.includes('Lời khuyên')", timeout=8000)
    pg.wait_for_timeout(900)
    txt = pg.inner_text(".result-card")
    check("C1 món trong CSDL (khác hoa/thường, thừa khoảng trắng) → số liệu từ CSDL 345 kcal", "345" in txt and "999" not in txt, txt[:200])
    check("C2 số liệu CSDL không bị AI ghi đè (AI cố trả 999/99g)", not re.search(r"\b99(\.0)?g", txt) and "999" not in txt)
    check("C3 có nhận xét AI + nhãn 'Dữ liệu chuẩn + nhận xét AI'", "Dữ liệu chuẩn + nhận xét AI" in txt and "Lời khuyên" in txt)
    check("C4 nhận xét AI hiện chất xơ/vitamin", "1.2g" in txt and "B1" in txt)
    check("C5 CSDL không hiện ra ở đâu khác (trang tra cứu không liệt kê món của CSDL)", "Bún tươi" not in pg.inner_text("#app-content"))
    calls_after_first = len(state["calls"])
    check("C6 chỉ 1 lời gọi AI (nhận xét)", calls_after_first - n0 == 1, calls_after_first - n0)
    search("cơm trắng"); pg.wait_for_timeout(900)
    check("C7 tra lại món CSDL dùng cache nhận xét, không tốn thêm quota", len(state["calls"]) == calls_after_first)
    search("Phở bò tái"); pg.wait_for_function("()=>document.querySelector('.result-card')?.innerText.includes('Bánh flan')", timeout=8000)
    pg.wait_for_timeout(900)   # chờ hiệu ứng đếm số kcal chạy xong
    txt = pg.inner_text(".result-card")
    check("C8 món ngoài CSDL → hoàn toàn từ AI (nhãn 'Dữ liệu Gemini AI')", "Dữ liệu Gemini AI" in txt and "180" in txt)
    search("Phở bò"); pg.wait_for_timeout(1500)
    check("C9 'Phở bò' khớp CSDL (413 kcal) còn 'Phở bò tái' thì không", "413" in pg.inner_text(".result-card") and "Dữ liệu chuẩn" in pg.inner_text(".result-card"), pg.inner_text(".result-card")[:120])
    # Nút bấm liên tiếp chỉ 1 lời gọi
    state["calls"].clear()
    pg.fill("#input-food-query", "Sinh tố bơ"); pg.click("#btn-submit-search")
    disabled_during = pg.evaluate("()=>[document.getElementById('input-food-query').disabled, document.getElementById('btn-submit-search').disabled, document.getElementById('btn-submit-search').innerText]")
    pg.evaluate("()=>{const b=document.getElementById('btn-submit-search'); b.disabled=false; b.click(); b.click();}")
    pg.wait_for_timeout(1200)
    n_search = sum(1 for c in state["calls"] if "Sinh tố bơ" in c)
    check("C10 khóa ô nhập/nút khi đang tìm + chỉ sinh 1 lời gọi khi bấm liên tiếp", disabled_during[0] and n_search == 1, f"{disabled_during} {n_search}")
    check("C11 nút loading giữ chữ 'Đang tra…' (không xóa trắng)", "Đang tra" in disabled_during[2], disabled_during[2])
    b.close()

    # C12: AI lỗi + món trong CSDL
    state["mode"] = "ai_fail"; state["calls"].clear()
    b, ctx, pg, errs = new_page(p)
    go(pg, "#lookup"); pg.reload(); pg.wait_for_selector("#input-food-query")
    pg.fill("#input-food-query", "Bún tươi"); pg.click("#btn-submit-search")
    pg.wait_for_selector(".result-card"); pg.wait_for_timeout(9000)
    txt = pg.inner_text("#app-content")
    check("C12 AI lỗi/hết quota + món CSDL → vẫn hiện số liệu 165 kcal, không lỗi", "165" in txt and "Không thể tra cứu" not in txt and "Lời khuyên" not in txt and "AI đang viết" not in txt, txt[:300])
    check("C12b nhãn đổi thành 'Dữ liệu chuẩn' khi không có nhận xét", "Dữ liệu chuẩn" in txt and "nhận xét AI" not in txt)
    b.close()

    # C13: không có API key
    state["mode"] = "ok"
    b, ctx, pg, errs = new_page(p, key="")
    go(pg, "#lookup"); pg.reload(); pg.wait_for_selector("#input-food-query")
    pg.fill("#input-food-query", "Xôi"); pg.click("#btn-submit-search"); pg.wait_for_selector(".result-card")
    check("C13 không có API key: món CSDL vẫn hiện số liệu, không bật hộp nhập key", (pg.wait_for_timeout(900) or True) and "300" in pg.inner_text(".result-card") and pg.locator("#modal-overlay.modal--show").count() == 0)
    pg.fill("#input-food-query", "Món lạ"); pg.click("#btn-submit-search"); pg.wait_for_timeout(500)
    check("C14 không có key + món ngoài CSDL → mở hộp nhập key", pg.locator("#modal-overlay.modal--show").count() == 1)
    b.close()

    # ───────── D. Game ─────────
    state["mode"] = "ok"
    b, ctx, pg, errs = new_page(p)
    go(pg, "#home"); pg.reload(); pg.wait_for_timeout(600)
    check("D1 Trang chủ có thẻ 'Học mà chơi' + tóm tắt điểm", "Học mà chơi" in pg.inner_text("#app-content") and "điểm" in pg.inner_text("#app-content"))
    nav_n = pg.locator(".nav-btn").count()
    check("D2 thanh điều hướng không thêm nút mới", nav_n == 5, nav_n)
    pg.click("text=Học mà chơi"); pg.wait_for_timeout(800)
    check("D3 vào #game", "#game" in pg.url)
    pg.wait_for_selector(".quiz-option", timeout=8000)
    q1 = pg.inner_text(".quiz-question")
    pg.reload(); pg.wait_for_selector(".quiz-option", timeout=8000)
    check("D4 tải lại trang không đổi câu hỏi trong ngày", pg.inner_text(".quiz-question") == q1)
    def answer_current(correct=True):
        st = json.loads(pg.evaluate("()=>localStorage.getItem('nf_game')"))
        qz = st["quiz"]; idx = len(qz["answers"]); q = qz["questions"][idx]
        target = q["answer"] if correct else (q["answer"]+1) % 4
        pg.locator(".quiz-option").nth(target).click(); pg.wait_for_timeout(150)
    answer_current(True)
    check("D5 trả lời xong hiện đúng/sai + giải thích", pg.locator(".advice-box--success").count() >= 1 and pg.locator(".quiz-option--correct").count() == 1)
    pg.reload(); pg.wait_for_selector(".quiz-option", timeout=8000)
    st = json.loads(pg.evaluate("()=>localStorage.getItem('nf_game')"))
    check("D6 tải lại giữa chừng: câu đã trả lời không làm lại được", len(st["quiz"]["answers"]) == 1 and st["points"] == 10, st["points"])
    for i in range(4):
        answer_current(True)
        pg.click("#btn-quiz-next"); pg.wait_for_timeout(120)
    st = json.loads(pg.evaluate("()=>localStorage.getItem('nf_game')"))
    check("D7 đúng 5/5 → 50 điểm + huy hiệu Nhà thông thái", st["points"] >= 50 and "sage" in st["badges"], st)
    check("D8 hiện màn kết quả + nút 'Chơi thêm'", pg.locator("#btn-quiz-practice").count() == 1)
    pts = st["points"]
    pg.click("#btn-quiz-practice"); pg.wait_for_selector(".quiz-option")
    for i in range(5):
        pg.locator(".quiz-option").first.click(); pg.wait_for_timeout(100); pg.click("#btn-quiz-next"); pg.wait_for_timeout(100)
    st2 = json.loads(pg.evaluate("()=>localStorage.getItem('nf_game')"))
    check("D9 'Chơi thêm' không cộng điểm", st2["points"] == pts, (pts, st2["points"]))
    # tra cứu 6 lần → chỉ 5 được cộng
    pts_before = st2["points"]
    for i in range(6):
        pg.evaluate("(i)=>NF_Storage.addLookupHistory({name:'Món thử '+i,calories:1,protein:1,fat:1,carb:1,serving:'1'})", i)
    st3 = json.loads(pg.evaluate("()=>localStorage.getItem('nf_game')"))
    check("D10 tra cứu 6 lần: chỉ 5 lần được +2 điểm", st3["points"] - pts_before == 10, st3["points"] - pts_before)
    # ghi nhật ký hôm nay & ngày cũ
    today = pg.evaluate("()=>NF_Storage.getToday()")
    pts_before = st3["points"]
    for i in range(6):
        pg.evaluate("(t)=>NF_Storage.addDiaryEntry({name:'Món',calories:100,protein:1,fat:1,carb:1,mealType:'Bữa Trưa',tags:[]}, t)", today)
    pg.evaluate("()=>NF_Storage.addDiaryEntry({name:'Cũ',calories:100,protein:1,fat:1,carb:1,mealType:'Bữa Trưa',tags:[]}, '2026-01-05')")
    st4 = json.loads(pg.evaluate("()=>localStorage.getItem('nf_game')"))
    check("D11 nhật ký: +5 tối đa 4 lần/ngày, ghi bù ngày cũ không cộng", st4["points"] - pts_before == 20, st4["points"] - pts_before)
    # Xuất → xóa → nhập lại
    exported = pg.evaluate("()=>NF_Storage.exportAll()")
    check("D12 exportAll có trường game", exported.get("game") and exported["game"]["points"] == st4["points"])
    pg.evaluate("()=>{localStorage.removeItem('nf_game')}")
    res = pg.evaluate("(d)=>NF_Storage.importData(JSON.stringify(d))", exported)
    st5 = json.loads(pg.evaluate("()=>localStorage.getItem('nf_game')"))
    check("D13 nhập lại JSON: điểm, huy hiệu, streak còn nguyên", st5["points"] == st4["points"] and set(st5["badges"]) == set(st4["badges"]), (res, st5["points"]))
    dates = pg.evaluate("()=>NF_Storage.getAllDiaryDates()")
    check("D14 nhập backup dựng lại index nhật ký (Lịch sử thấy dữ liệu)", today in dates and "2026-01-05" in dates, dates)
    b.close()

    # D15: câu đố do AI sinh
    state["mode"] = "quiz_ai"
    b, ctx, pg, errs = new_page(p)
    go(pg, "#game"); pg.reload(); pg.wait_for_selector(".quiz-option", timeout=10000)
    st = json.loads(pg.evaluate("()=>localStorage.getItem('nf_game')"))
    check("D15 có API key: bộ câu đố do AI sinh (gắn nhãn 'AI tạo')", all(q["origin"] == "ai" for q in st["quiz"]["questions"]) and "AI tạo" in pg.inner_text("#game-quiz"))
    b.close()
    state["mode"] = "ok"
    b, ctx, pg, errs = new_page(p, key="")
    go(pg, "#game"); pg.reload(); pg.wait_for_selector(".quiz-option", timeout=10000)
    st = json.loads(pg.evaluate("()=>localStorage.getItem('nf_game')"))
    check("D16 không có key: câu đố vẫn chạy bằng ngân hàng", all(q["origin"] == "bank" for q in st["quiz"]["questions"]))
    check("D17 không có lỗi JS", not errs, errs)
    b.close()

    # ───────── E. Thực đơn: Đổi thực đơn khác ─────────
    state["mode"] = "ok"; state["plan_bad_first"] = False; state["plan_calls"] = 0; state["calls"].clear()
    b, ctx, pg, errs = new_page(p)
    go(pg, "#profile"); pg.reload(); pg.wait_for_selector("#btn-get-ai-meal-plan")
    pg.click("#btn-get-ai-meal-plan"); pg.wait_for_selector("#btn-swap-meal-plan", timeout=10000)
    check("E1 sau khi có thực đơn hiện nút 'Đổi thực đơn khác' (.btn--outline)", pg.locator("#btn-swap-meal-plan.btn--outline").count() == 1)
    first = pg.inner_text("#ai-meal-plan-output")
    check("E2 tổng kcal tự cộng (2200), không tin số AI báo", "2200 kcal" in first.replace("\n"," ") or "2.200" in first, first[:120])
    pg.click("#btn-swap-meal-plan"); pg.wait_for_function("()=>document.querySelector('#ai-meal-plan-output')?.innerText.includes('Bánh mì trứng 2')", timeout=10000)
    plan_prompts = [c for c in state["calls"] if "Gợi ý thực đơn" in c]
    check("E3 lần đổi gửi kèm danh sách món cần tránh", "KHÔNG dùng lại" in plan_prompts[-1] and "Bánh mì trứng 1" in plan_prompts[-1])
    pg.click("#btn-swap-meal-plan"); pg.wait_for_function("()=>document.querySelector('#ai-meal-plan-output')?.innerText.includes('Bánh mì trứng 3')", timeout=10000)
    check("E4 bấm liên tiếp 3 lần ra 3 thực đơn khác nhau, mỗi thực đơn có rau + trái cây", "Chuối 3" in pg.inner_text("#ai-meal-plan-output") and "rau muống" in pg.inner_text("#ai-meal-plan-output"))
    pg.locator(".btn-add-plan-meal").nth(3).click(); pg.wait_for_timeout(300)
    ent = pg.evaluate("()=>NF_Storage.getDiary(NF_Storage.getToday())")
    check("E5 'Thêm vào nhật ký hôm nay' vẫn hoạt động, lưu kèm nhóm (tags) cho game", len(ent) == 1 and ent[0]["tags"] == ["fruit"], ent)
    b.close()
    # thực đơn lần đầu thiếu trái cây → tự gọi lại đúng 1 lần
    state["plan_bad_first"] = True; state["plan_calls"] = 0; state["calls"].clear()
    b, ctx, pg, errs = new_page(p)
    go(pg, "#profile"); pg.reload(); pg.wait_for_selector("#btn-get-ai-meal-plan")
    pg.click("#btn-get-ai-meal-plan"); pg.wait_for_selector("#btn-swap-meal-plan", timeout=12000)
    check("E6 thực đơn thiếu trái cây → tự gọi lại đúng 1 lần và dùng bản đạt", state["plan_calls"] == 2 and "Chuối 2" in pg.inner_text("#ai-meal-plan-output"), state["plan_calls"])
    b.close()

    # ───────── F. Chuyển động card ─────────
    b, ctx, pg, errs = new_page(p)
    go(pg, "#home"); pg.reload(); pg.wait_for_timeout(200)
    n_in = pg.locator(".motion-in").count()
    check("F1 card có class motion-in khi vào trang", n_in >= 3, n_in)
    pg.wait_for_timeout(1500)
    qc = pg.locator(".quick-card").nth(1); y0 = qc.bounding_box()["y"]; qc.hover(); pg.wait_for_timeout(350); y1 = qc.bounding_box()["y"]
    check("F2 hover card nhấc lên mượt sau khi vào trang xong", y1 < y0 - 1.5, (y0, y1))
    b.close()
    b, ctx, pg, errs = new_page(p, reduced=True)
    go(pg, "#home"); pg.reload(); pg.wait_for_timeout(300)
    check("F3 'Reduce motion' → không có class chuyển động", pg.locator(".motion-in, .motion-pending").count() == 0)
    b.close()
    # Nhật ký dài: hiện khi cuộn tới
    long_diary = {}
    b, ctx, pg, errs = new_page(p)
    go(pg, "#history"); pg.evaluate("()=>{for(let i=1;i<=14;i++){const d='2026-09-'+String(i).padStart(2,'0'); NF_Storage.addDiaryEntry({name:'M'+i,calories:100,protein:1,fat:1,carb:1,mealType:'Bữa Trưa'}, d);}}")
    pg.reload(); pg.wait_for_timeout(600)
    pend = pg.locator(".motion-pending").count()
    check("F4 danh sách dài: card dưới màn hình chờ cuộn (motion-pending)", pend >= 1, pend)
    pg.evaluate("()=>window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(900)
    check("F5 cuộn tới thì hiện (hết pending)", pg.locator(".motion-pending").count() == 0)
    b.close()
    # ───────── G. Tổng hợp lỗi ─────────
    b, ctx, pg, errs = new_page(p)
    for h in ["#home", "#camera", "#lookup", "#profile", "#diary", "#history", "#game"]:
        go(pg, h); pg.wait_for_timeout(300)
    check("G1 duyệt mọi trang không có lỗi JS/CSP", not errs, errs)
    b.close()

fails = [n for n, ok in results if not ok]
print(f"\n{len(results)-len(fails)}/{len(results)} PASS")
sys.exit(1 if fails else 0)
