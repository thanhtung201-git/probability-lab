// Soạn bài toán dạng "lấy vật rồi xét biến cố" (bi đánh số, nhóm nam/nữ, thẻ số, lập số …): giáo viên điền biểu mẫu
// (hoặc nhờ AI đọc đề điền sẵn), máy tính xác suất ngay, đối chiếu với đáp án trong đề, thử bằng phòng thí nghiệm rồi lưu.
import {
  FORM_BAI_TOAN_MAC_DINH,
  docVatTongQuat,
  khongGianMau,
  xacSuatBaiToan,
  xayBaiToan,
  type CauHinhBaiToan,
  type CauHinhVat,
  type FormBaiToan,
} from "@plab/core";
import { useMemo, useState } from "react";
import { api, type DocDe } from "../api";
import { OSo } from "../phong-thi-nghiem/PhongThiNghiem";
import { PhongVat } from "../phong-thi-nghiem/PhongVat";
import { luuPhienGanDay } from "./TrangChu";

interface Mau {
  id: string;
  ten: string;
  noiDung: string;
  tieuDe: string;
  form: Partial<FormBaiToan>;
  dapAn: string;
  dapAnDung: string;
}

const MAU: Mau[] = [
  {
    id: "du_1",
    ten: "Túi 4 bi đánh số: tổng chia 3 dư 1",
    tieuDe: "Tổng hai bi chia 3 dư 1",
    noiDung:
      "Một túi đựng 4 viên bi có cùng khối lượng và kích thước, được đánh số 1; 2; 3; 4. Lấy ngẫu nhiên lần lượt 2 viên bi từ túi đó, viên bi lấy ra lần đầu không trả lại vào túi. Xác suất để lấy được hai viên bi mà tổng hai số trên hai viên bi đó chia 3 dư 1 là:",
    form: { che_do_vat: "danh_so", n: 4, ten_vat: "bi", so_lan: 2, hoan_lai: false, loai_bien_co: "so", dai_luong: "tong", dieu_kien: "du", m: 3, r: 1 },
    dapAn: "1/2, 1/3, 1/6, 1/4",
    dapAnDung: "",
  },
  {
    id: "le",
    ten: "Túi 4 bi đánh số: tổng là số lẻ",
    tieuDe: "Tổng hai bi là số lẻ",
    noiDung:
      "Một túi đựng 4 viên bi có cùng khối lượng và kích thước, được đánh số 1; 2; 3; 4. Lấy ngẫu nhiên lần lượt 2 viên bi từ túi đó, viên bi lấy ra lần đầu không trả lại vào túi. Xác suất lấy được hai viên bi mà tổng hai số trên hai viên bi đó là một số lẻ là:",
    form: { che_do_vat: "danh_so", n: 4, ten_vat: "bi", so_lan: 2, hoan_lai: false, loai_bien_co: "so", dai_luong: "tong", dieu_kien: "le" },
    dapAn: "2/3, 3/4, 1/2, 1/3",
    dapAnDung: "",
  },
  {
    id: "nu",
    ten: "Nhóm 3 nam 4 nữ: ít nhất một bạn nữ",
    tieuDe: "Ít nhất một bạn nữ",
    noiDung:
      "Một nhóm học sinh gồm 3 học sinh nam, 4 học sinh nữ. Chọn ngẫu nhiên ra hai học sinh. Xác suất của biến cố “Hai bạn được chọn có ít nhất một bạn là nữ” bằng:",
    form: { che_do_vat: "theo_mau", nhom: "nam 3, nữ 4", ten_vat: "học sinh", so_lan: 2, hoan_lai: false, loai_bien_co: "mau", mau_loai: "it_nhat", mau: "nữ" },
    dapAn: "4/7, 3/7, 6/7, 2/7",
    dapAnDung: "",
  },
  {
    id: "ghep",
    ten: "Lập số 2 chữ số từ 5 thẻ: số chẵn",
    tieuDe: "Lập số chẵn từ hai thẻ",
    noiDung: "Có 5 tấm thẻ ghi các số 1, 2, 3, 4, 5. Rút lần lượt hai thẻ (không trả lại) rồi xếp theo thứ tự rút để được một số có hai chữ số. Tính xác suất để số đó là số chẵn.",
    form: { che_do_vat: "danh_so", n: 5, ten_vat: "thẻ", so_lan: 2, hoan_lai: false, loai_bien_co: "so", dai_luong: "ghep", dieu_kien: "chan" },
    dapAn: "",
    dapAnDung: "",
  },
];

const DAI_LUONG: { id: FormBaiToan["dai_luong"]; ten: string }[] = [
  { id: "tong", ten: "Tổng các số" },
  { id: "tich", ten: "Tích các số" },
  { id: "lon_nhat", ten: "Số lớn nhất" },
  { id: "nho_nhat", ten: "Số nhỏ nhất" },
  { id: "ghep", ten: "Số ghép theo thứ tự lấy" },
];

const DIEU_KIEN: { id: FormBaiToan["dieu_kien"]; ten: string }[] = [
  { id: "chan", ten: "là số chẵn" },
  { id: "le", ten: "là số lẻ" },
  { id: "nguyen_to", ten: "là số nguyên tố" },
  { id: "chia_het", ten: "chia hết cho k" },
  { id: "du", ten: "chia m dư r" },
  { id: "bang", ten: "bằng k" },
  { id: "lon_hon", ten: "lớn hơn k" },
  { id: "nho_hon", ten: "nhỏ hơn k" },
];

const MAU_LOAI: { id: FormBaiToan["mau_loai"]; ten: string }[] = [
  { id: "it_nhat", ten: "Có ít nhất 1 vật màu …" },
  { id: "dung", ten: "Có đúng k vật màu …" },
  { id: "cung_mau", ten: "Các vật cùng màu" },
  { id: "khac_mau", ten: "Hai vật khác màu (lấy 2)" },
];

/** Giá trị của một phương án trong đề: "1/3", "0,25" hoặc "0.25". */
function giaTriPhuongAn(s: string): number | null {
  const t = s.trim().replace(/^[A-Da-d][.)]\s*/, "");
  const p = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (p) return Number(p[2]) === 0 ? null : Number(p[1]) / Number(p[2]);
  const x = Number(t.replace(",", "."));
  return t !== "" && Number.isFinite(x) ? x : null;
}

const chu = ["A", "B", "C", "D", "E", "F"];

export function BaiToanTongQuat({ aiBat, onDaLuu }: { aiBat: boolean; onDaLuu: () => void }) {
  const [noiDung, setNoiDung] = useState("");
  const [tieuDe, setTieuDe] = useState("");
  const [form, setForm] = useState<FormBaiToan>(FORM_BAI_TOAN_MAC_DINH);
  const [dapAn, setDapAn] = useState("");
  const [dapAnDung, setDapAnDung] = useState("");
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));
  const [dangDoc, setDangDoc] = useState(false);
  const [ghiChuAI, setGhiChuAI] = useState<{ khop: boolean; ly_do: string } | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [daLuu, setDaLuu] = useState<{ id: string; ten: string } | null>(null);

  const dat = <K extends keyof FormBaiToan>(k: K, v: FormBaiToan[K]) => setForm((f) => ({ ...f, [k]: v }));

  function chonMau(m: Mau) {
    setNoiDung(m.noiDung);
    setTieuDe(m.tieuDe);
    setForm({ ...FORM_BAI_TOAN_MAC_DINH, ...m.form });
    setDapAn(m.dapAn);
    setDapAnDung(m.dapAnDung);
    setGhiChuAI(null);
    setDaLuu(null);
    setLoi(null);
  }

  async function docDe() {
    setDangDoc(true);
    setLoi(null);
    setGhiChuAI(null);
    try {
      const d: DocDe = await api.docDe(noiDung);
      setForm((f) => ({
        ...f,
        che_do_vat: d.che_do_vat,
        n: d.n ?? f.n,
        nhom: d.nhom ?? "",
        ten_vat: d.ten_vat || "vật",
        so_lan: Math.min(4, Math.max(1, d.so_lan)),
        hoan_lai: d.hoan_lai,
        loai_bien_co: d.loai_bien_co,
        dai_luong: d.dai_luong ?? f.dai_luong,
        dieu_kien: d.dieu_kien ?? f.dieu_kien,
        k: d.k ?? f.k,
        m: d.m ?? f.m,
        r: d.r ?? f.r,
        mau_loai: d.mau_loai ?? f.mau_loai,
        mau: d.mau ?? "",
        k_mau: d.k_mau ?? f.k_mau,
        phu_dinh: d.phu_dinh,
      }));
      if (!tieuDe.trim() && d.tieu_de) setTieuDe(d.tieu_de);
      if (d.dap_an.length) setDapAn(d.dap_an.join(", "));
      setGhiChuAI({ khop: d.khop, ly_do: d.ly_do });
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangDoc(false);
    }
  }

  const ketQua = useMemo(() => xayBaiToan(form), [form]);
  const cauHinh: CauHinhBaiToan | null = "cau_hinh" in ketQua ? { ...ketQua.cau_hinh, seed } : null;
  const tinh = useMemo(() => {
    if (!cauHinh) return null;
    const p = xacSuatBaiToan(cauHinh);
    return { p, gs: khongGianMau(cauHinh, 60) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ketQua]);

  const danhSachMau = useMemo(() => {
    const v = docVatTongQuat(form);
    return "vat" in v ? [...new Set(v.vat.map((x) => x.mau).filter((m): m is string => !!m))] : [];
  }, [form.che_do_vat, form.n, form.nhom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Đối chiếu với các phương án trong đề.
  const phuongAn = dapAn.split(/[;,]\s*|\s{2,}/).map((s) => s.trim()).filter(Boolean);
  const doiChieu = useMemo(() => {
    if (!tinh || phuongAn.length === 0) return null;
    const x = tinh.p.soThuc();
    const khop = phuongAn.findIndex((s) => {
      const v = giaTriPhuongAn(s);
      return v !== null && Math.abs(v - x) < 1e-9;
    });
    const dung = dapAnDung ? chu.indexOf(dapAnDung) : -1;
    return { khop, dung };
  }, [tinh, dapAn, dapAnDung]); // eslint-disable-line react-hooks/exhaustive-deps

  async function luu(moPhien: boolean) {
    if (!("cau_hinh" in ketQua)) return;
    setDangLuu(true);
    setLoi(null);
    try {
      const kq = await api.luuBai({ tieu_de: tieuDe.trim() || undefined, noi_dung: noiDung, vat: "bai_toan", kieu: "tu_dong", mo_hinh: ketQua.cau_hinh });
      setDaLuu({ id: kq.id, ten: kq.tinh_huong.tieu_de });
      onDaLuu();
      if (moPhien) {
        const p = await api.taoPhien(kq.id);
        luuPhienGanDay(p.id);
        window.location.hash = `#/phien/${p.id}`;
      }
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  }

  const coK = ["chia_het", "bang", "lon_hon", "nho_hon"].includes(form.dieu_kien);
  const tv = form.ten_vat.trim() || "vật";

  return (
    <div className="bai-toan-tq">
      <div className="the">
        <h2>1. Đề bài</h2>
        <p className="muted">Dán đề rồi bấm “AI đọc đề” để điền sẵn phần bên dưới, hoặc tự điền. Bạn luôn có thể sửa lại.</p>
        <div className="vien" style={{ marginBottom: "0.6rem" }}>
          {MAU.map((m) => (
            <button key={m.id} type="button" className="phu" onClick={() => chonMau(m)}>
              {m.ten}
            </button>
          ))}
        </div>
        <div className="truong">
          <label htmlFor="btq-de">Đề bài</label>
          <textarea id="btq-de" rows={4} value={noiDung} onChange={(e) => setNoiDung(e.target.value)} placeholder="Ví dụ: Một túi đựng 4 viên bi được đánh số 1; 2; 3; 4. Lấy ngẫu nhiên lần lượt 2 viên bi, không trả lại. Tính xác suất để tổng hai số là số lẻ." />
        </div>
        <div className="truong">
          <label htmlFor="btq-tieu-de">Tên bài (không bắt buộc)</label>
          <input id="btq-tieu-de" value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} maxLength={80} />
        </div>
        <div className="hang">
          <button type="button" onClick={docDe} disabled={!aiBat || dangDoc || noiDung.trim().length < 10}>
            {dangDoc ? "AI đang đọc đề…" : "✨ AI đọc đề và điền sẵn"}
          </button>
          {!aiBat && <span className="muted">AI chưa bật, hãy điền tay.</span>}
        </div>
        {ghiChuAI && (
          <div className={`thong-bao ${ghiChuAI.khop ? "tin" : "canh-bao"}`} style={{ marginTop: "0.6rem" }}>
            {ghiChuAI.khop ? "AI hiểu đề như sau: " : "Đề này có thể chưa khớp mô hình. "}
            {ghiChuAI.ly_do} <strong>Hãy kiểm tra lại các ô bên dưới và đối chiếu đáp án.</strong>
          </div>
        )}
      </div>

      <div className="the">
        <h2>2. Các vật</h2>
        <div className="vien">
          {(
            [
              ["danh_so", "Đánh số 1, 2, 3 …"],
              ["theo_mau", "Theo màu / nhóm"],
              ["mau_va_so", "Có cả màu và số"],
            ] as const
          ).map(([id, ten]) => (
            <button key={id} type="button" className={form.che_do_vat === id ? "dang-chon" : ""} onClick={() => dat("che_do_vat", id)}>
              {ten}
            </button>
          ))}
        </div>
        {form.che_do_vat === "danh_so" && <OSo id="btq-n" nhan="Số vật (đánh số từ 1)" gt={form.n} min={2} max={1000} onDoi={(v) => dat("n", v)} />}
        {form.che_do_vat === "theo_mau" && (
          <div className="truong" style={{ marginTop: "0.6rem" }}>
            <label htmlFor="btq-nhom">Các nhóm (tên và số lượng)</label>
            <input id="btq-nhom" value={form.nhom} onChange={(e) => dat("nhom", e.target.value)} placeholder="đỏ 3, xanh 2   hoặc   nam 3, nữ 4" />
          </div>
        )}
        {form.che_do_vat === "mau_va_so" && (
          <div className="truong" style={{ marginTop: "0.6rem" }}>
            <label htmlFor="btq-nhom">Các nhóm và số ghi trên vật</label>
            <input id="btq-nhom" value={form.nhom} onChange={(e) => dat("nhom", e.target.value)} placeholder="đỏ: 1 2 3; xanh: 4 5   (có thể viết 1-3)" />
          </div>
        )}
        <div className="truong" style={{ marginTop: "0.6rem" }}>
          <label htmlFor="btq-ten-vat">Gọi vật là</label>
          <input id="btq-ten-vat" style={{ maxWidth: 200 }} value={form.ten_vat} onChange={(e) => dat("ten_vat", e.target.value)} maxLength={12} placeholder="bi, thẻ, học sinh …" />
        </div>
      </div>

      <div className="the">
        <h2>3. Cách lấy</h2>
        <OSo id="btq-so-lan" nhan={`Số ${tv} lấy`} gt={form.so_lan} min={1} max={4} onDoi={(v) => dat("so_lan", v)} />
        <label className="hang" style={{ margin: "0.6rem 0 0", gap: "0.4rem", fontWeight: 600 }}>
          <input type="checkbox" style={{ width: "1.1rem", height: "1.1rem" }} checked={form.hoan_lai} onChange={(e) => dat("hoan_lai", e.target.checked)} />
          Có hoàn lại (lấy xong bỏ lại, lần sau có thể lấy lại vật đó)
        </label>
        <div className="muted" style={{ marginTop: "0.3rem" }}>“Lấy lần lượt, không trả lại” và “lấy cùng lúc” đều là không hoàn lại.</div>
      </div>

      <div className="the">
        <h2>4. Biến cố cần tính xác suất</h2>
        <div className="vien">
          <button type="button" className={form.loai_bien_co === "so" ? "dang-chon" : ""} onClick={() => dat("loai_bien_co", "so")}>
            Xét theo các số
          </button>
          <button type="button" className={form.loai_bien_co === "mau" ? "dang-chon" : ""} onClick={() => dat("loai_bien_co", "mau")}>
            Xét theo màu / nhóm
          </button>
        </div>

        {form.loai_bien_co === "so" ? (
          <div style={{ marginTop: "0.6rem" }}>
            <div className="hang" style={{ gap: "0.5rem" }}>
              <select aria-label="Đại lượng" value={form.dai_luong} onChange={(e) => dat("dai_luong", e.target.value as FormBaiToan["dai_luong"])}>
                {DAI_LUONG.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.ten}
                  </option>
                ))}
              </select>
              <select aria-label="Điều kiện" value={form.dieu_kien} onChange={(e) => dat("dieu_kien", e.target.value as FormBaiToan["dieu_kien"])}>
                {DIEU_KIEN.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.ten}
                  </option>
                ))}
              </select>
            </div>
            {coK && <OSo id="btq-k" nhan="k" gt={form.k} min={form.dieu_kien === "chia_het" ? 1 : 0} max={form.dieu_kien === "chia_het" ? 99 : 999} onDoi={(v) => dat("k", v)} />}
            {form.dieu_kien === "du" && (
              <>
                <OSo id="btq-m" nhan="Số chia m" gt={form.m} min={2} max={20} onDoi={(v) => dat("m", v)} />
                <OSo id="btq-r" nhan="Số dư r" gt={form.r} min={0} max={19} onDoi={(v) => dat("r", v)} />
              </>
            )}
          </div>
        ) : (
          <div style={{ marginTop: "0.6rem" }}>
            <div className="hang" style={{ gap: "0.5rem" }}>
              <select aria-label="Biến cố theo màu" value={form.mau_loai} onChange={(e) => dat("mau_loai", e.target.value as FormBaiToan["mau_loai"])}>
                {MAU_LOAI.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.ten}
                  </option>
                ))}
              </select>
              {(form.mau_loai === "it_nhat" || form.mau_loai === "dung") && (
                <select aria-label="Màu cần xét" value={danhSachMau.includes(form.mau) ? form.mau : (danhSachMau[0] ?? "")} onChange={(e) => dat("mau", e.target.value)}>
                  {danhSachMau.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {form.mau_loai === "dung" && <OSo id="btq-k-mau" nhan="Số vật màu đó (k)" gt={form.k_mau} min={0} max={4} onDoi={(v) => dat("k_mau", v)} />}
          </div>
        )}

        <label className="hang" style={{ margin: "0.8rem 0 0", gap: "0.4rem", fontWeight: 600 }}>
          <input type="checkbox" style={{ width: "1.1rem", height: "1.1rem" }} checked={form.phu_dinh} onChange={(e) => dat("phu_dinh", e.target.checked)} />
          Đề hỏi biến cố NGƯỢC LẠI (xác suất để điều trên KHÔNG xảy ra)
        </label>
      </div>

      <div className="the ket-qua-bt">
        <h2>5. Máy tính ra</h2>
        {"loi" in ketQua ? (
          <div className="thong-bao loi">{ketQua.loi}</div>
        ) : tinh ? (
          <>
            <div className="ct-ket-qua" style={{ marginTop: 0 }}>
              P = {tinh.p.toString()} ≈ {(tinh.p.soThuc() * 100).toFixed(2).replace(".", ",")}% ({tinh.gs.thoa} kết quả thuận lợi trên {tinh.gs.tong} kết quả có thể)
            </div>

            <div className="truong" style={{ marginTop: "0.8rem" }}>
              <label htmlFor="btq-dap-an">Các phương án trong đề (nếu có, cách nhau bằng dấu phẩy)</label>
              <div className="hang" style={{ gap: "0.5rem" }}>
                <input id="btq-dap-an" style={{ maxWidth: 360 }} value={dapAn} onChange={(e) => setDapAn(e.target.value)} placeholder="1/2, 1/3, 1/6, 1/4" />
                <select aria-label="Đáp án đúng theo đề" value={dapAnDung} onChange={(e) => setDapAnDung(e.target.value)}>
                  <option value="">Đáp án đúng của đề: chưa chọn</option>
                  {phuongAn.map((_, i) => (
                    <option key={i} value={chu[i]}>
                      Đáp án đúng của đề: {chu[i]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {doiChieu && (
              <div className={`thong-bao ${doiChieu.khop >= 0 && (doiChieu.dung < 0 || doiChieu.dung === doiChieu.khop) ? "tin" : "canh-bao"}`} style={{ marginTop: "0.6rem" }}>
                {doiChieu.khop < 0
                  ? "Kết quả không trùng phương án nào trong đề: hãy kiểm tra lại cách hiểu đề (số vật, có hoàn lại không, biến cố)."
                  : doiChieu.dung >= 0 && doiChieu.dung !== doiChieu.khop
                    ? `Kết quả trùng phương án ${chu[doiChieu.khop]} (${phuongAn[doiChieu.khop]}) nhưng đề ghi đáp án đúng là ${chu[doiChieu.dung]}. Hãy kiểm tra lại cách hiểu đề hoặc đáp án của đề.`
                    : `✓ Khớp phương án ${chu[doiChieu.khop]} (${phuongAn[doiChieu.khop]}).`}
              </div>
            )}

            {tinh.gs.ds && (
              <div style={{ marginTop: "0.8rem" }}>
                <div className="nhan-muc">Tất cả {tinh.gs.tong} kết quả (✓ = thuận lợi biến cố)</div>
                <div className="khong-gian-mau">
                  {tinh.gs.ds.map((k, i) => (
                    <span key={i} className={k.thoa ? "thoa" : ""}>
                      {k.nhan}
                      {k.gia_tri !== undefined ? ` → ${k.gia_tri}` : ""} {k.thoa ? "✓" : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {cauHinh && (
        <div className="the">
          <h2>6. Thử bằng thí nghiệm</h2>
          <p className="muted">Gieo nhiều lượt để thấy tần suất tiến gần xác suất vừa tính; phía dưới có lời giải từng bước.</p>
          <PhongVat key={JSON.stringify(ketQua)} cauHinh={cauHinh as CauHinhVat} />
        </div>
      )}

      <div className="the">
        <h2>7. Lưu bài</h2>
        {loi && <div className="thong-bao loi">{loi}</div>}
        {daLuu && <div className="thong-bao tin">Đã lưu “{daLuu.ten}”. Bài hiện trong danh sách bên dưới và ở tab “Tiết học với AI”.</div>}
        <div className="hang">
          <button type="button" onClick={() => void luu(false)} disabled={dangLuu || !cauHinh || noiDung.trim().length < 10}>
            {dangLuu ? "Đang lưu…" : "Lưu bài"}
          </button>
          <button type="button" className="phu" onClick={() => void luu(true)} disabled={dangLuu || !cauHinh || noiDung.trim().length < 10}>
            Lưu và mở phiên ngay
          </button>
        </div>
        {noiDung.trim().length < 10 && <p className="muted">Cần nhập đề bài (ít nhất vài từ) để lưu.</p>}
      </div>
    </div>
  );
}
