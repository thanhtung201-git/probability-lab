import { taoSeed, TinhHuongSchema } from "@plab/core";
import express, { type NextFunction, type Request, type Response } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CONFIG } from "./config";
import { chay, lay } from "./db";
import { DeBaiSchema, LoiDeBai, taoDeBai } from "./de-bai";
import { chamRubric, chanDoanLan1, LoiNghiepVu, tongQuanPhien, trangThaiLuot, xuatCsv } from "./dich-vu";
import { giaiThichBai, taoGiaiThich } from "./giai-thich";
import { docAnhDeBangLLM, docDeBangLLM, docDeMoBangLLM, llmDangBat, loiGroqCuoi } from "./llm/groq";
import { THU_VIEN_NGO_NHAN, thuVienTinhHuong, TIEN_TO_BAI_TU_NHAP, timTinhHuong } from "./thu-vien";

const app = express();
// Ảnh đề đã thu nhỏ ở trình duyệt nhưng vẫn lớn hơn JSON thường (Vercel giới hạn body 4,5MB).
app.use("/api/doc-anh-de", express.json({ limit: "3mb" }));
app.use(express.json({ limit: "300kb" }));

// Chạy sau proxy của nền tảng triển khai (Fly, Render, Railway…): lấy địa chỉ IP thật từ X-Forwarded-For.
app.set("trust proxy", 1);
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Mật khẩu chung (tùy chọn): đặt PLAB_BASIC_AUTH="ten:matkhau" thì trình duyệt hỏi mật khẩu trước khi vào giao diện và API.
if (CONFIG.basicAuth) {
  const mong = Buffer.from(CONFIG.basicAuth);
  app.use((req, res, next) => {
    const gui = Buffer.from((req.headers.authorization ?? "").replace(/^Basic\s+/i, ""), "base64").toString();
    const a = Buffer.from(gui);
    if (a.length === mong.length && timingSafeEqual(a, mong)) return next();
    res.set("WWW-Authenticate", 'Basic realm="Probability Lab AI"').status(401).send("Cần nhập tên và mật khẩu");
  });
}

// Giới hạn số lần dùng các chức năng gọi AI theo IP (mỗi phút), tránh bị lạm dụng khóa Groq.
const lanGoiAI = new Map<string, number[]>();
setInterval(() => lanGoiAI.clear(), 10 * 60_000).unref();
const gioiHanAI = (req: Request, res: Response, next: NextFunction) => {
  const bay_gio = Date.now();
  const ip = req.ip ?? "?";
  const gan = (lanGoiAI.get(ip) ?? []).filter((t) => bay_gio - t < 60_000);
  if (gan.length >= CONFIG.gioiHanAIMoiPhut) {
    res.status(429).json({ loi: "Bạn thao tác quá nhanh, hãy đợi một lát rồi thử lại." });
    return;
  }
  gan.push(bay_gio);
  lanGoiAI.set(ip, gan);
  next();
};
app.use(["/api/doc-de", "/api/doc-de-mo", "/api/doc-anh-de", "/api/giai-thich-bai"], gioiHanAI);
app.use("/api/luot", (req, res, next) => (req.method === "POST" && /\/(giai-thich|tra-loi)$/.test(req.path) ? gioiHanAI(req, res, next) : next()));

type XuLy = (req: Request, res: Response) => unknown;
const bocLoi = (fn: XuLy) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res)).catch(next);

const laySoPhien = async (id: string) => {
  const phien = await lay(`SELECT * FROM phien WHERE id = ?`, id.toUpperCase());
  if (!phien) throw new LoiNghiepVu("Không tìm thấy phiên. Kiểm tra lại mã phiên.", 404);
  // Phiên có đề tự nhập lưu nguyên tình huống trong cột de_bai; phiên thường tra trong thư viện.
  const th = phien.de_bai ? TinhHuongSchema.parse(JSON.parse(String(phien.de_bai))) : await timTinhHuong(String(phien.tinh_huong_id));
  if (!th) throw new LoiNghiepVu("Tình huống của phiên không còn trong thư viện", 500);
  return { phien, th };
};

/** Mã phiên 6 ký tự, bỏ các ký tự dễ nhầm (0/O, 1/I). */
async function taoMaPhien(): Promise<string> {
  const kyTu = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    const ma = Array.from({ length: 6 }, () => kyTu[Math.floor(Math.random() * kyTu.length)]).join("");
    if (!await lay(`SELECT 1 FROM phien WHERE id = ?`, ma)) return ma;
  }
}

// Khi chưa build giao diện (chạy thử khi phát triển), máy chủ chỉ phục vụ API; ai mở nhầm cổng này thì chỉ sang giao diện.
const coGiaoDien = existsSync(path.join(CONFIG.thuMucGiaoDien, "index.html"));
if (!coGiaoDien) app.get("/", (_req, res) => {
  res
    .type("html")
    .send(
      `<!doctype html><meta charset="utf-8"><title>Probability Lab AI – API</title>` +
        `<body style="font-family:system-ui;padding:2rem;font-size:18px">` +
        `<p>Đây là máy chủ API của Probability Lab AI.</p>` +
        `<p>Giao diện giáo viên ở <a href="http://localhost:5173">http://localhost:5173</a>.</p></body>`,
    );
});

app.get("/api/trang-thai", (_req, res) => {
  res.json({ llm_bat: llmDangBat(), mo_hinh: llmDangBat() ? CONFIG.groqModel : null });
});

app.get(
  "/api/thu-vien",
  bocLoi(async (_req, res) => {
    res.json({ ngo_nhan: THU_VIEN_NGO_NHAN, tinh_huong: await thuVienTinhHuong() });
  }),
);

// Bài toán giáo viên soạn và lưu lại: dựng cùng cách với đề tự nhập, rồi lưu để dùng cho nhiều phiên.
app.post(
  "/api/bai-tu-nhap",
  bocLoi(async (req, res) => {
    const deBai = DeBaiSchema.parse(req.body);
    const kq = await taoDeBai(deBai).catch((e) => {
      if (e instanceof LoiDeBai) throw new LoiNghiepVu(e.message);
      throw e;
    });
    const id = `${TIEN_TO_BAI_TU_NHAP}${randomUUID().slice(0, 8)}`;
    const tinhHuong = { ...kq.tinh_huong, id };
    await chay(`INSERT INTO bai_tu_nhap (id, tinh_huong) VALUES (?, ?)`, id, JSON.stringify(tinhHuong));
    res.status(201).json({ id, tinh_huong: tinhHuong, nguon: kq.nguon, ly_do: kq.ly_do, canh_bao: kq.canh_bao });
  }),
);

app.delete(
  "/api/bai-tu-nhap/:id",
  bocLoi(async (req, res) => {
    const id = String(req.params.id);
    if (!await lay(`SELECT 1 FROM bai_tu_nhap WHERE id = ?`, id)) throw new LoiNghiepVu("Không tìm thấy bài đã lưu", 404);
    await chay(`DELETE FROM bai_tu_nhap WHERE id = ?`, id);
    res.json({ ok: true });
  }),
);

app.post(
  "/api/phien",
  bocLoi(async (req, res) => {
    // Hai cách mở phiên: chọn tình huống có sẵn, hoặc tự nhập đề bài.
    if (req.body && typeof req.body === "object" && "noi_dung" in req.body) {
      const deBai = DeBaiSchema.parse(req.body);
      const kq = await taoDeBai(deBai).catch((e) => {
        if (e instanceof LoiDeBai) throw new LoiNghiepVu(e.message);
        throw e;
      });
      const id = await taoMaPhien();
      await chay(`INSERT INTO phien (id, tinh_huong_id, de_bai) VALUES (?, ?, ?)`, id, "tu_nhap", JSON.stringify(kq.tinh_huong));
      return res.status(201).json({ id, tinh_huong_id: "tu_nhap", tinh_huong: kq.tinh_huong, nguon: kq.nguon, ly_do: kq.ly_do, canh_bao: kq.canh_bao });
    }
    const { tinh_huong_id } = z.object({ tinh_huong_id: z.string() }).parse(req.body);
    const th = await timTinhHuong(tinh_huong_id);
    if (!th) throw new LoiNghiepVu("Tình huống không tồn tại");
    const id = await taoMaPhien();
    // Bài giáo viên đã lưu thì chép nguyên đề vào phiên, để xóa bài sau này không làm hỏng phiên đã mở.
    if (tinh_huong_id.startsWith(TIEN_TO_BAI_TU_NHAP)) {
      await chay(`INSERT INTO phien (id, tinh_huong_id, de_bai) VALUES (?, ?, ?)`, id, tinh_huong_id, JSON.stringify(th));
    } else {
      await chay(`INSERT INTO phien (id, tinh_huong_id) VALUES (?, ?)`, id, tinh_huong_id);
    }
    res.status(201).json({ id, tinh_huong_id });
  }),
);

app.get(
  "/api/phien/:id",
  bocLoi(async (req, res) => {
    const { phien, th } = await laySoPhien(String(req.params.id));
    res.json({ phien, tinh_huong: th });
  }),
);

app.get(
  "/api/phien/:id/tong-quan",
  bocLoi(async (req, res) => {
    const { phien } = await laySoPhien(String(req.params.id));
    res.json(await tongQuanPhien(String(phien.id)));
  }),
);

app.get(
  "/api/phien/:id/xuat-csv",
  bocLoi(async (req, res) => {
    const { phien, th } = await laySoPhien(String(req.params.id));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="nhat-ky-hoc-tap-${phien.id}.csv"`);
    res.send(await xuatCsv(String(phien.id), th.tieu_de));
  }),
);

app.post(
  "/api/luot",
  bocLoi(async (req, res) => {
    const body = z
      .object({ phien_id: z.string(), ma_nhom: z.string().trim().min(1).max(20).regex(/^[\p{L}\p{N} _-]+$/u) })
      .parse(req.body);
    const { phien } = await laySoPhien(body.phien_id);
    const daCo = await lay(`SELECT id FROM luot_lam WHERE phien_id = ? AND ma_nhom = ?`, String(phien.id), body.ma_nhom);
    const id = daCo ? String(daCo.id) : randomUUID();
    if (!daCo) await chay(`INSERT INTO luot_lam (id, phien_id, ma_nhom, seed) VALUES (?, ?, ?, ?)`, id, String(phien.id), body.ma_nhom, taoSeed());
    res.status(daCo ? 200 : 201).json(await trangThaiLuot(id));
  }),
);

app.get(
  "/api/luot/:id",
  bocLoi(async (req, res) => res.json(await trangThaiLuot(String(req.params.id)))),
);

app.post(
  "/api/luot/:id/tra-loi",
  bocLoi(async (req, res) => {
    const body = z.object({ lan: z.union([z.literal(1), z.literal(2), z.literal(3)]), noi_dung: z.string().trim().min(3).max(1000) }).parse(req.body);
    const tt = await trangThaiLuot(String(req.params.id));
    const { th } = await laySoPhien(String(tt.luot.phien_id));
    const daTraLoi = new Set(tt.tra_loi.map((t) => Number(t.lan)));
    if (daTraLoi.has(body.lan)) throw new LoiNghiepVu(`Nhóm đã gửi câu trả lời lần ${body.lan}`, 409);
    if (body.lan > 1 && !daTraLoi.has(body.lan - 1)) throw new LoiNghiepVu(`Cần gửi lần ${body.lan - 1} trước`, 409);

    const cham = await chamRubric(th, body.noi_dung);
    await chay(
      `INSERT INTO tra_loi (luot_id, lan, noi_dung, muc_rubric, nhan_xet, nguon_cham) VALUES (?, ?, ?, ?, ?, ?)`,
      String(tt.luot.id),
      body.lan,
      body.noi_dung,
      cham.muc,
      cham.nhan_xet,
      cham.nguon,
    );
    const kq = body.lan === 1 ? await chanDoanLan1(tt.luot, th, body.noi_dung) : {};
    res.status(201).json({ danh_gia: cham, ...kq });
  }),
);

app.post(
  "/api/doc-de",
  bocLoi(async (req, res) => {
    const { noi_dung } = z.object({ noi_dung: z.string().trim().min(10, "Đề bài quá ngắn").max(1500) }).parse(req.body);
    const kq = await docDeBangLLM(noi_dung);
    if (!kq) throw new LoiNghiepVu(`AI chưa đọc được đề: ${loiGroqCuoi()}`, 502);
    res.json(kq);
  }),
);

app.post(
  "/api/doc-anh-de",
  bocLoi(async (req, res) => {
    const { anh } = z.object({ anh: z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Ảnh không hợp lệ").max(2_800_000) }).parse(req.body);
    const noi_dung = await docAnhDeBangLLM(anh);
    if (!noi_dung) throw new LoiNghiepVu(`AI chưa đọc được ảnh: ${loiGroqCuoi()}`, 502);
    res.json({ noi_dung });
  }),
);

app.post(
  "/api/doc-de-mo",
  bocLoi(async (req, res) => {
    const { noi_dung } = z.object({ noi_dung: z.string().trim().min(10, "Đề bài quá ngắn").max(1500) }).parse(req.body);
    const kq = await docDeMoBangLLM(noi_dung);
    if (!kq) throw new LoiNghiepVu(`AI chưa đọc được đề: ${loiGroqCuoi()}`, 502);
    res.json(kq);
  }),
);

app.post(
  "/api/giai-thich-bai",
  bocLoi(async (req, res) => {
    const body = z.object({ cau_hinh: z.unknown(), khoa: z.string().max(40) }).parse(req.body);
    res.json(await giaiThichBai(body.cau_hinh, body.khoa));
  }),
);

app.post(
  "/api/luot/:id/giai-thich",
  bocLoi(async (req, res) => {
    res.json(await taoGiaiThich(String(req.params.id), req.query.lai === "1"));
  }),
);

app.post(
  "/api/luot/:id/ket-qua",
  bocLoi(async (req, res) => {
    const { tom_tat } = z.object({ tom_tat: z.record(z.string(), z.unknown()) }).parse(req.body);
    const json = JSON.stringify(tom_tat);
    // Từ chối thay vì cắt bớt: cắt chuỗi JSON sẽ làm hỏng dữ liệu khi đọc lại.
    if (json.length > 200_000) throw new LoiNghiepVu("Số liệu thí nghiệm quá lớn", 413);
    const r = await chay(`UPDATE thi_nghiem SET tom_tat = ? WHERE luot_id = ?`, json, String(req.params.id));
    if (r.changes === 0) throw new LoiNghiepVu("Lượt làm chưa có thí nghiệm", 404);
    res.json({ ok: true });
  }),
);

app.post(
  "/api/chan-doan/:id/danh-gia",
  bocLoi(async (req, res) => {
    const body = z
      .object({
        ket_luan: z.enum(["dung", "chua_phu_hop", "sai"]),
        ma_sua: z.enum(["M0", "M1", "M2", "M3", "M4", "M5", "M6", "KXD"]).nullable().optional(),
        ghi_chu: z.string().max(500).optional(),
      })
      .parse(req.body);
    const id = String(req.params.id);
    if (!await lay(`SELECT 1 FROM chan_doan WHERE id = ?`, id)) throw new LoiNghiepVu("Không tìm thấy chẩn đoán", 404);
    await chay(
      `INSERT INTO danh_gia_gv (chan_doan_id, ket_luan, ma_sua, ghi_chu) VALUES (?, ?, ?, ?)
       ON CONFLICT (chan_doan_id) DO UPDATE SET ket_luan = excluded.ket_luan, ma_sua = excluded.ma_sua,
         ghi_chu = excluded.ghi_chu, tao_luc = datetime('now')`,
      id,
      body.ket_luan,
      body.ket_luan === "dung" ? null : (body.ma_sua ?? null),
      body.ghi_chu ?? null,
    );
    res.json({ ok: true });
  }),
);

// Bản triển khai: máy chủ phục vụ luôn giao diện đã build; mọi đường dẫn không phải /api đều trả về trang chính.
if (coGiaoDien) {
  app.use(express.static(CONFIG.thuMucGiaoDien));
  app.use((req, res, next) => (req.method === "GET" && !req.path.startsWith("/api") ? res.sendFile(path.join(CONFIG.thuMucGiaoDien, "index.html")) : next()));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json({ loi: "Dữ liệu gửi lên không hợp lệ", chi_tiet: err.issues });
  if (err instanceof LoiNghiepVu) return res.status(err.status).json({ loi: err.message });
  console.error(err);
  res.status(500).json({ loi: "Lỗi máy chủ" });
});

// Trên Vercel không tự mở cổng: nền tảng gọi thẳng vào app đã xuất ra ở cuối tệp.
if (!process.env.VERCEL) app.listen(CONFIG.port, () => {
  console.log(`Probability Lab AI – máy chủ chạy tại http://localhost:${CONFIG.port}`);
  console.log(
    coGiaoDien
      ? "Giao diện đã build được phục vụ cùng máy chủ này."
      : "Giao diện giáo viên: http://localhost:5173 (cần chạy thêm `npm run dev:web`, hoặc dùng `npm run dev` để chạy cả hai)",
  );
  if (CONFIG.basicAuth) console.log("Đang bật mật khẩu chung (PLAB_BASIC_AUTH).");
  console.log(llmDangBat() ? `AI: Groq, mô hình ${CONFIG.groqModel}` : "AI: CHƯA BẬT (chưa có GROQ_API_KEY) – dùng bộ luật dự phòng");
});

export default app;
