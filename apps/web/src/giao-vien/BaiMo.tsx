// Tab "Bài toán mở": tự ghép nguồn vật + cách lấy + biến cố (có thể ghép bằng và / hoặc / không) từ các khối có sẵn.
// Dùng chung bộ máy của bài toán tổng quát: xác suất chính xác, bảng kết quả, thí nghiệm và lời giải luôn khớp nhau.
import {
  khongGianMau,
  loiGiaiHocSinh,
  moTaBaiMo,
  taoVatTuNguon,
  xacSuatBaiToan,
  xayBaiMo,
  type BienCoBaiToan,
  type CauHinhBaiToan,
  type CauHinhVat,
  type DieuKienBaiToan,
  type FormMo,
  type LocSo,
  type NguonMo,
} from "@plab/core";
import { useMemo, useState } from "react";
import type { ThuVien } from "../App";
import { api, type DkMo, type DocDeMo } from "../api";
import { OSo } from "../phong-thi-nghiem/PhongThiNghiem";
import { PhongVat } from "../phong-thi-nghiem/PhongVat";
import { luuPhienGanDay, VAT } from "./TrangChu";

/** Điều kiện trên một số, kèm các tham số k, m, r, d (chỉ dùng tham số mà loại đó cần). */
interface DK {
  loai: DieuKienBaiToan["loai"];
  k: number;
  m: number;
  r: number;
  d: number;
}

const DK_MAC_DINH: DK = { loai: "chinh_phuong", k: 3, m: 3, r: 1, d: 1 };

const LOAI_DK: { id: DieuKienBaiToan["loai"]; ten: string }[] = [
  { id: "chan", ten: "là số chẵn" },
  { id: "le", ten: "là số lẻ" },
  { id: "nguyen_to", ten: "là số nguyên tố" },
  { id: "chinh_phuong", ten: "là số chính phương" },
  { id: "doi_xung", ten: "là số đối xứng (121, 44…)" },
  { id: "chu_so_khac_nhau", ten: "có các chữ số khác nhau" },
  { id: "co_chu_so", ten: "có chữ số d" },
  { id: "chia_het", ten: "chia hết cho k" },
  { id: "du", ten: "chia m dư r" },
  { id: "bang", ten: "bằng k" },
  { id: "lon_hon", ten: "lớn hơn k" },
  { id: "nho_hon", ten: "nhỏ hơn k" },
];

const DAI_LUONG: { id: Extract<BienCoBaiToan, { kieu: "so" }>["dai_luong"]; ten: string }[] = [
  { id: "tong", ten: "Tổng các số" },
  { id: "tich", ten: "Tích các số" },
  { id: "lon_nhat", ten: "Số lớn nhất" },
  { id: "nho_nhat", ten: "Số nhỏ nhất" },
  { id: "ghep", ten: "Số ghép theo thứ tự lấy" },
];

const MAU_LOAI: { id: Extract<BienCoBaiToan, { kieu: "mau" }>["loai"]; ten: string }[] = [
  { id: "it_nhat", ten: "Có ít nhất 1 vật màu …" },
  { id: "dung", ten: "Có đúng k vật màu …" },
  { id: "cung_mau", ten: "Các vật cùng màu" },
  { id: "khac_mau", ten: "Hai vật khác màu (lấy 2)" },
];

function dkTuForm(f: DK): DieuKienBaiToan {
  switch (f.loai) {
    case "chia_het":
    case "bang":
    case "lon_hon":
    case "nho_hon":
      return { loai: f.loai, k: f.k };
    case "du":
      return { loai: "du", m: f.m, r: f.r };
    case "co_chu_so":
      return { loai: "co_chu_so", d: f.d };
    default:
      return { loai: f.loai };
  }
}

/** Dựng lại các ô nhập từ một điều kiện đã gọn. */
const dkTuDieuKien = (dk: DieuKienBaiToan): DK => ({
  ...DK_MAC_DINH,
  loai: dk.loai,
  ...("k" in dk ? { k: dk.k } : {}),
  ...("m" in dk ? { m: dk.m, r: dk.r } : {}),
  ...("d" in dk ? { d: dk.d } : {}),
});

/** Ô chọn điều kiện trên một số và các ô tham số đi kèm. */
function ChonDieuKien({ id, gt, doi }: { id: string; gt: DK; doi: (v: DK) => void }) {
  const dat = <K extends keyof DK>(k: K, v: DK[K]) => doi({ ...gt, [k]: v });
  const coK = ["chia_het", "bang", "lon_hon", "nho_hon"].includes(gt.loai);
  return (
    <>
      <select aria-label="Điều kiện" value={gt.loai} onChange={(e) => dat("loai", e.target.value as DK["loai"])}>
        {LOAI_DK.map((d) => (
          <option key={d.id} value={d.id}>
            {d.ten}
          </option>
        ))}
      </select>
      {coK && <OSo id={`${id}-k`} nhan="k" gt={gt.k} min={gt.loai === "chia_het" ? 1 : 0} max={gt.loai === "chia_het" ? 99 : 999} onDoi={(v) => dat("k", v)} />}
      {gt.loai === "du" && (
        <>
          <OSo id={`${id}-m`} nhan="Số chia m" gt={gt.m} min={2} max={20} onDoi={(v) => dat("m", v)} />
          <OSo id={`${id}-r`} nhan="Số dư r" gt={gt.r} min={0} max={19} onDoi={(v) => dat("r", v)} />
        </>
      )}
      {gt.loai === "co_chu_so" && <OSo id={`${id}-d`} nhan="Chữ số d" gt={gt.d} min={0} max={9} onDoi={(v) => dat("d", v)} />}
    </>
  );
}

/** Một biến cố con trong danh sách (chưa ghép). */
interface La {
  kieu: "so" | "mau";
  dai_luong: Extract<BienCoBaiToan, { kieu: "so" }>["dai_luong"];
  dk: DK;
  mau_loai: Extract<BienCoBaiToan, { kieu: "mau" }>["loai"];
  mau: string;
  k_mau: number;
  khong: boolean;
}

const LA_MAC_DINH: La = { kieu: "so", dai_luong: "tong", dk: DK_MAC_DINH, mau_loai: "it_nhat", mau: "", k_mau: 1, khong: false };

function laThanhBienCo(l: La, mauDau: string): BienCoBaiToan {
  const khong = l.khong ? { khong: true } : {};
  if (l.kieu === "so") return { kieu: "so", dai_luong: l.dai_luong, dieu_kien: dkTuForm(l.dk), ...khong };
  return { kieu: "mau", loai: l.mau_loai, mau: l.mau || mauDau, ...(l.mau_loai === "dung" ? { k: l.k_mau } : {}), ...khong };
}

type KieuNguon = NguonMo["kieu"];

const TEN_NGUON: [KieuNguon, string][] = [
  ["day_so", "Dãy số có bộ lọc"],
  ["ds_so", "Tự nhập các số"],
  ["danh_so", "Đánh số 1, 2, 3 …"],
  ["theo_mau", "Theo màu / nhóm"],
  ["mau_va_so", "Có cả màu và số"],
];

const NGUON_MAC_DINH: Record<KieuNguon, NguonMo> = {
  day_so: { kieu: "day_so", tu: 10, den: 99, buoc: 1, loc: [{ dk: { loai: "le" } }] },
  ds_so: { kieu: "ds_so", text: "11 13 25 49 50" },
  danh_so: { kieu: "danh_so", n: 4 },
  theo_mau: { kieu: "theo_mau", nhom: "nam 3, nữ 4" },
  mau_va_so: { kieu: "mau_va_so", nhom: "đỏ: 1 2 3; xanh: 4 5" },
};

interface Mau {
  ten: string;
  nguon: NguonMo;
  ten_vat: string;
  so_lan: number;
  hoan_lai: boolean;
  la: La[];
  phep?: "va" | "hoac";
  phu_dinh?: boolean;
  de: string;
}

const MAU: Mau[] = [
  {
    ten: "Số lẻ 2 chữ số: chính phương",
    nguon: NGUON_MAC_DINH.day_so,
    ten_vat: "số",
    so_lan: 1,
    hoan_lai: false,
    la: [{ ...LA_MAC_DINH, dk: { ...DK_MAC_DINH, loai: "chinh_phuong" } }],
    de: "Viết một số tự nhiên lẻ có 2 chữ số bất kỳ. Tính xác suất của biến cố “Số tự nhiên viết ra là một số chính phương”.",
  },
  {
    ten: "Số 2 chữ số: chia hết cho 3 hoặc 5",
    nguon: { kieu: "day_so", tu: 10, den: 99, buoc: 1, loc: [] },
    ten_vat: "số",
    so_lan: 1,
    hoan_lai: false,
    la: [
      { ...LA_MAC_DINH, dk: { ...DK_MAC_DINH, loai: "chia_het", k: 3 } },
      { ...LA_MAC_DINH, dk: { ...DK_MAC_DINH, loai: "chia_het", k: 5 } },
    ],
    phep: "hoac",
    de: "Chọn ngẫu nhiên một số tự nhiên có 2 chữ số. Tính xác suất để số đó chia hết cho 3 hoặc chia hết cho 5.",
  },
  {
    ten: "Túi 4 bi: tổng là số lẻ",
    nguon: { kieu: "danh_so", n: 4 },
    ten_vat: "bi",
    so_lan: 2,
    hoan_lai: false,
    la: [{ ...LA_MAC_DINH, dk: { ...DK_MAC_DINH, loai: "le" } }],
    de: "Một túi đựng 4 viên bi đánh số 1; 2; 3; 4. Lấy ngẫu nhiên lần lượt 2 viên bi, viên bi lấy ra lần đầu không trả lại vào túi. Xác suất lấy được hai viên bi có tổng hai số là một số lẻ là:",
  },
  {
    ten: "Nhóm 3 nam 4 nữ: ít nhất một nữ",
    nguon: { kieu: "theo_mau", nhom: "nam 3, nữ 4" },
    ten_vat: "học sinh",
    so_lan: 2,
    hoan_lai: false,
    la: [{ ...LA_MAC_DINH, kieu: "mau", mau: "nữ" }],
    de: "Một nhóm học sinh gồm 3 học sinh nam, 4 học sinh nữ. Chọn ngẫu nhiên hai học sinh. Tính xác suất để có ít nhất một bạn nữ.",
  },
];

/** Giá trị của một phương án trong đề: "1/3", "0,25" hoặc "0.25". */
function giaTriPhuongAn(s: string): number | null {
  const t = s.trim().replace(/^[A-Da-d][.)]\s*/, "");
  const p = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (p) return Number(p[2]) === 0 ? null : Number(p[1]) / Number(p[2]);
  const x = Number(t.replace(",", "."));
  return t !== "" && Number.isFinite(x) ? x : null;
}

const CHU = ["A", "B", "C", "D", "E", "F"];

const dkTuAI = (x: DkMo): DK => ({ ...DK_MAC_DINH, loai: x.loai, k: x.k ?? 3, m: x.m ?? 3, r: x.r ?? 1, d: x.d ?? 1 });

/** Các bài đã lưu: mở phiên hoặc xóa. */
function BaiDaLuu({ thuVien, onDoi }: { thuVien: ThuVien; onDoi: () => void }) {
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLam, setDangLam] = useState<string | null>(null);
  const daLuu = thuVien.tinh_huong.tinh_huong.filter((t) => t.id.startsWith("tn_"));

  async function moPhien(id: string) {
    setDangLam(id);
    setLoi(null);
    try {
      const p = await api.taoPhien(id);
      luuPhienGanDay(p.id);
      window.location.hash = `#/phien/${p.id}`;
    } catch (e) {
      setLoi((e as Error).message);
      setDangLam(null);
    }
  }

  async function xoa(id: string, tieuDe: string) {
    if (!window.confirm(`Xóa bài “${tieuDe}”? Các phiên đã mở từ bài này vẫn giữ nguyên.`)) return;
    setDangLam(id);
    setLoi(null);
    try {
      await api.xoaBai(id);
      onDoi();
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangLam(null);
    }
  }

  return (
    <>
      <h2 style={{ marginTop: "1.5rem" }}>Bài đã lưu ({daLuu.length})</h2>
      {loi && <div className="thong-bao loi">{loi}</div>}
      {daLuu.length === 0 ? (
        <p className="muted">Chưa có bài nào. Bài bạn lưu sẽ hiện ở đây và trong danh sách bài có sẵn ở tab “Tiết học với AI”.</p>
      ) : (
        <div className="luoi-2">
          {[...daLuu].reverse().map((t) => {
            const bieuTuong = t.chinh === "bai_toan" ? "🧩" : (VAT.find((v) => v.id === t.chinh)?.bieuTuong ?? "");
            return (
              <div className="the" key={t.id}>
                <h3>
                  {bieuTuong} {t.tieu_de}
                </h3>
                <p>{t.noi_dung}</p>
                <div className="hang">
                  <button onClick={() => void moPhien(t.id)} disabled={dangLam !== null}>
                    {dangLam === t.id ? "Đang xử lý…" : "Mở phiên với bài này"}
                  </button>
                  <button className="phu" onClick={() => void xoa(t.id, t.tieu_de)} disabled={dangLam !== null}>
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function BaiMo({ thuVien, aiBat, onDaLuu }: { thuVien: ThuVien; aiBat: boolean; onDaLuu: () => void }) {
  const [nguon, setNguon] = useState<NguonMo>(MAU[0]!.nguon);
  const [tenVat, setTenVat] = useState(MAU[0]!.ten_vat);
  const [soLan, setSoLan] = useState(MAU[0]!.so_lan);
  const [hoanLai, setHoanLai] = useState(false);
  const [cacLa, setCacLa] = useState<La[]>(MAU[0]!.la);
  const [phep, setPhep] = useState<"va" | "hoac">("va");
  const [phuDinh, setPhuDinh] = useState(false);
  const [de, setDe] = useState(MAU[0]!.de);
  const [tieuDe, setTieuDe] = useState("");
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [daLuu, setDaLuu] = useState<string | null>(null);
  const [dangDoc, setDangDoc] = useState(false);
  const [ghiChuAI, setGhiChuAI] = useState<{ khop: boolean; ly_do: string } | null>(null);
  const [dapAn, setDapAn] = useState("");

  function apDungAI(d: DocDeMo) {
    const loc: LocSo[] = d.loc.map((l) => ({ dk: dkTuForm(dkTuAI(l)), ...(l.khong ? { khong: true } : {}) }));
    const nguonMoi: NguonMo =
      d.nguon_kieu === "day_so"
        ? { kieu: "day_so", tu: d.tu ?? 10, den: d.den ?? 99, buoc: d.buoc ?? 1, loc }
        : d.nguon_kieu === "ds_so"
          ? { kieu: "ds_so", text: d.text ?? "" }
          : d.nguon_kieu === "danh_so"
            ? { kieu: "danh_so", n: d.n ?? 4 }
            : { kieu: d.nguon_kieu, nhom: d.nhom ?? "" };
    setNguon(nguonMoi);
    setTenVat(d.ten_vat || "vật");
    setSoLan(Math.min(4, Math.max(1, d.so_lan)));
    setHoanLai(d.hoan_lai);
    if (d.bien_co.length) {
      setCacLa(
        d.bien_co.map((b) => ({
          ...LA_MAC_DINH,
          kieu: b.kieu,
          dai_luong: b.dai_luong ?? "tong",
          dk: b.dk ? dkTuAI(b.dk) : DK_MAC_DINH,
          mau_loai: b.mau_loai ?? "it_nhat",
          mau: b.mau ?? "",
          k_mau: b.k_mau ?? 1,
          khong: b.khong,
        })),
      );
    }
    setPhep(d.phep);
    setPhuDinh(d.phu_dinh);
    if (!tieuDe.trim() && d.tieu_de) setTieuDe(d.tieu_de);
    setDapAn(d.dap_an.join(", "));
  }

  async function docDe() {
    setDangDoc(true);
    setLoi(null);
    setGhiChuAI(null);
    setDaLuu(null);
    try {
      const d = await api.docDeMo(de);
      apDungAI(d);
      setGhiChuAI({ khop: d.khop, ly_do: d.ly_do });
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangDoc(false);
    }
  }

  function chonMau(m: Mau) {
    setNguon(m.nguon);
    setTenVat(m.ten_vat);
    setSoLan(m.so_lan);
    setHoanLai(m.hoan_lai);
    setCacLa(m.la);
    setPhep(m.phep ?? "va");
    setPhuDinh(m.phu_dinh ?? false);
    setDe(m.de);
    setDapAn("");
    setGhiChuAI(null);
    setDaLuu(null);
    setLoi(null);
  }

  const vat = useMemo(() => taoVatTuNguon(nguon), [nguon]);
  const coSo = "vat" in vat && vat.vat.some((v) => v.so !== undefined);
  const coMau = "vat" in vat && vat.vat.some((v) => v.mau !== undefined);
  const danhSachMau = "vat" in vat ? [...new Set(vat.vat.map((x) => x.mau).filter((m): m is string => !!m))] : [];

  const form: FormMo = useMemo(() => {
    const cac = cacLa.map((l) => laThanhBienCo(l, danhSachMau[0] ?? ""));
    const bien_co: BienCoBaiToan = cac.length === 1 ? cac[0]! : { kieu: "gop", phep, cac };
    return { nguon, ten_vat: tenVat, so_lan: soLan, hoan_lai: hoanLai, bien_co, phu_dinh: phuDinh };
  }, [nguon, tenVat, soLan, hoanLai, cacLa, phep, phuDinh]); // eslint-disable-line react-hooks/exhaustive-deps

  const ketQua = useMemo(() => (cacLa.length ? xayBaiMo(form) : { loi: "Cần ít nhất một điều kiện cho biến cố" }), [form, cacLa.length]);
  const cauHinh: CauHinhBaiToan | null = "cau_hinh" in ketQua ? { ...ketQua.cau_hinh, seed } : null;
  const tinh = useMemo(() => {
    if (!cauHinh) return null;
    return { p: xacSuatBaiToan(cauHinh), gs: khongGianMau(cauHinh, 120) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ketQua]);

  const loiGiai = useMemo(() => (cauHinh ? loiGiaiHocSinh(cauHinh) : null), [ketQua]); // eslint-disable-line react-hooks/exhaustive-deps

  const phuongAn = dapAn.split(/[;,]\s*|\s{2,}/).map((x) => x.trim()).filter(Boolean);
  const khopPA = useMemo(() => {
    if (!tinh) return -1;
    const x = tinh.p.soThuc();
    return phuongAn.findIndex((a) => {
      const v = giaTriPhuongAn(a);
      return v !== null && Math.abs(v - x) < 1e-9;
    });
  }, [tinh, dapAn]); // eslint-disable-line react-hooks/exhaustive-deps

  const datLa = (i: number, v: Partial<La>) => setCacLa((a) => a.map((l, j) => (j === i ? { ...l, ...v } : l)));
  const datLoc = (i: number, v: Partial<LocSo>) =>
    setNguon((n) => (n.kieu !== "day_so" ? n : { ...n, loc: n.loc.map((l, j) => (j === i ? { ...l, ...v } : l)) }));

  async function luu(moPhien: boolean) {
    if (!("cau_hinh" in ketQua)) return;
    setDangLuu(true);
    setLoi(null);
    try {
      const noiDung = de.trim().length >= 10 ? de.trim() : moTaBaiMo(form, ketQua.cau_hinh.vat.length);
      const kq = await api.luuBai({ tieu_de: tieuDe.trim() || undefined, noi_dung: noiDung, vat: "bai_toan", kieu: "tu_dong", mo_hinh: ketQua.cau_hinh });
      setDaLuu(kq.tinh_huong.tieu_de);
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

  const tv = tenVat.trim() || "vật";

  return (
    <div className="bai-toan-tq bai-mo">
      <div className="the">
        <h2>Bài toán mở</h2>
        <p className="muted">
          Tự ghép bài từ các khối: nguồn vật, cách lấy và biến cố (ghép được bằng “và / hoặc / không”). Máy đếm chính xác, nên lời giải, bảng kết quả và thí nghiệm luôn khớp nhau.
        </p>
        <div className="vien">
          {MAU.map((m) => (
            <button key={m.ten} type="button" className="phu" onClick={() => chonMau(m)}>
              {m.ten}
            </button>
          ))}
        </div>
        <div className="truong" style={{ marginTop: "0.6rem" }}>
          <label htmlFor="bm-de">Đề bài (để lưu cùng bài, không bắt buộc)</label>
          <textarea id="bm-de" rows={3} value={de} onChange={(e) => setDe(e.target.value)} placeholder="Dán đề rồi bấm “AI đọc đề và điền sẵn”, hoặc tự chọn các khối bên dưới." />
        </div>
        <div className="hang">
          <button type="button" onClick={() => void docDe()} disabled={!aiBat || dangDoc || de.trim().length < 10}>
            {dangDoc ? "AI đang đọc đề…" : "✨ AI đọc đề và điền sẵn"}
          </button>
          {!aiBat && <span className="muted">AI chưa bật, hãy chọn mẫu hoặc tự điền các khối.</span>}
        </div>
        {loi && <div className="thong-bao loi" style={{ marginTop: "0.6rem" }}>{loi}</div>}
        {ghiChuAI && (
          <div className={`thong-bao ${ghiChuAI.khop ? "tin" : "canh-bao"}`} style={{ marginTop: "0.6rem" }}>
            {ghiChuAI.khop ? "AI hiểu đề như sau: " : "Đề này có thể chưa khớp các khối hiện có. "}
            {ghiChuAI.ly_do} <strong>Hãy kiểm tra lại các ô bên dưới và đối chiếu với đề.</strong>
          </div>
        )}
      </div>

      <div className="the">
        <h2>1. Nguồn vật</h2>
        <div className="vien">
          {TEN_NGUON.map(([id, ten]) => (
            <button key={id} type="button" className={nguon.kieu === id ? "dang-chon" : ""} onClick={() => nguon.kieu !== id && setNguon(NGUON_MAC_DINH[id])}>
              {ten}
            </button>
          ))}
        </div>

        {nguon.kieu === "day_so" && (
          <div style={{ marginTop: "0.6rem" }}>
            <div className="hang" style={{ gap: "1rem", flexWrap: "wrap" }}>
              <OSo id="bm-tu" nhan="Từ" gt={nguon.tu} min={0} max={999} onDoi={(v) => setNguon({ ...nguon, tu: v })} />
              <OSo id="bm-den" nhan="Đến" gt={nguon.den} min={0} max={999} onDoi={(v) => setNguon({ ...nguon, den: v })} />
              <OSo id="bm-buoc" nhan="Bước" gt={nguon.buoc} min={1} max={99} onDoi={(v) => setNguon({ ...nguon, buoc: v })} />
            </div>
            <div className="nhan-muc" style={{ marginTop: "0.8rem" }}>
              Chỉ giữ lại các số thỏa (tất cả các điều kiện dưới đây):
            </div>
            {nguon.loc.map((l, i) => (
              <div key={i} className="hang" style={{ gap: "0.5rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                <label className="hang" style={{ gap: "0.3rem", margin: 0 }}>
                  <input type="checkbox" checked={l.khong ?? false} onChange={(e) => datLoc(i, { khong: e.target.checked })} /> không
                </label>
                <ChonDieuKien id={`bm-loc-${i}`} gt={dkTuDieuKien(l.dk)} doi={(v) => datLoc(i, { dk: dkTuForm(v) })} />
                <button type="button" className="phu" onClick={() => setNguon({ ...nguon, loc: nguon.loc.filter((_, j) => j !== i) })}>
                  Bỏ
                </button>
              </div>
            ))}
            <button type="button" className="phu" style={{ marginTop: "0.5rem" }} onClick={() => setNguon({ ...nguon, loc: [...nguon.loc, { dk: { loai: "chan" } }] })}>
              + Thêm bộ lọc
            </button>
          </div>
        )}
        {nguon.kieu === "ds_so" && (
          <div className="truong" style={{ marginTop: "0.6rem" }}>
            <label htmlFor="bm-ds">Các số (từ 0 đến 999, có thể viết khoảng 1-5)</label>
            <input id="bm-ds" value={nguon.text} onChange={(e) => setNguon({ ...nguon, text: e.target.value })} placeholder="11 13 25 49 50" />
          </div>
        )}
        {nguon.kieu === "danh_so" && <OSo id="bm-n" nhan="Số vật (đánh số từ 1)" gt={nguon.n} min={2} max={1000} onDoi={(v) => setNguon({ ...nguon, n: v })} />}
        {(nguon.kieu === "theo_mau" || nguon.kieu === "mau_va_so") && (
          <div className="truong" style={{ marginTop: "0.6rem" }}>
            <label htmlFor="bm-nhom">{nguon.kieu === "theo_mau" ? "Các nhóm (tên và số lượng)" : "Các nhóm và số ghi trên vật"}</label>
            <input
              id="bm-nhom"
              value={nguon.nhom}
              onChange={(e) => setNguon({ ...nguon, nhom: e.target.value })}
              placeholder={nguon.kieu === "theo_mau" ? "đỏ 3, xanh 2   hoặc   nam 3, nữ 4" : "đỏ: 1 2 3; xanh: 4 5   (có thể viết 1-3)"}
            />
          </div>
        )}
        <div className="truong" style={{ marginTop: "0.6rem" }}>
          <label htmlFor="bm-ten-vat">Gọi vật là</label>
          <input id="bm-ten-vat" style={{ maxWidth: 200 }} value={tenVat} onChange={(e) => setTenVat(e.target.value)} maxLength={12} placeholder="bi, thẻ, số, học sinh …" />
        </div>
        {"loi" in vat ? (
          <div className="thong-bao canh-bao" style={{ marginTop: "0.6rem" }}>
            {vat.loi}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: "0.6rem" }}>
            Có {vat.vat.length} {tv}.
          </p>
        )}
      </div>

      <div className="the">
        <h2>2. Cách lấy</h2>
        <OSo id="bm-so-lan" nhan={`Số ${tv} lấy`} gt={soLan} min={1} max={4} onDoi={setSoLan} />
        <label className="hang" style={{ margin: "0.6rem 0 0", gap: "0.4rem", fontWeight: 600 }}>
          <input type="checkbox" style={{ width: "1.1rem", height: "1.1rem" }} checked={hoanLai} onChange={(e) => setHoanLai(e.target.checked)} />
          Có hoàn lại (lấy xong bỏ lại, lần sau có thể lấy lại vật đó)
        </label>
        <div className="muted" style={{ marginTop: "0.3rem" }}>
          “Lấy lần lượt, không trả lại” và “lấy cùng lúc” đều là không hoàn lại. Lấy 1 vật thì xét trực tiếp số của vật đó.
        </div>
      </div>

      <div className="the">
        <h2>3. Biến cố cần tính xác suất</h2>
        {cacLa.map((l, i) => (
          <div key={i} style={{ borderTop: i ? "1px dashed #555" : undefined, paddingTop: i ? "0.6rem" : 0, marginTop: i ? "0.6rem" : 0 }}>
            {i > 0 && (
              <div className="vien" style={{ marginBottom: "0.5rem" }}>
                <button type="button" className={phep === "va" ? "dang-chon" : ""} onClick={() => setPhep("va")}>
                  VÀ (đồng thời)
                </button>
                <button type="button" className={phep === "hoac" ? "dang-chon" : ""} onClick={() => setPhep("hoac")}>
                  HOẶC (ít nhất một)
                </button>
              </div>
            )}
            <div className="hang" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
              <label className="hang" style={{ gap: "0.3rem", margin: 0 }}>
                <input type="checkbox" checked={l.khong} onChange={(e) => datLa(i, { khong: e.target.checked })} /> không
              </label>
              {coSo && coMau && (
                <select aria-label="Xét theo" value={l.kieu} onChange={(e) => datLa(i, { kieu: e.target.value as La["kieu"] })}>
                  <option value="so">Xét theo các số</option>
                  <option value="mau">Xét theo màu / nhóm</option>
                </select>
              )}
              {(l.kieu === "so" && coSo) || !coMau ? (
                <>
                  {soLan > 1 && (
                    <select aria-label="Đại lượng" value={l.dai_luong} onChange={(e) => datLa(i, { dai_luong: e.target.value as La["dai_luong"] })}>
                      {DAI_LUONG.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.ten}
                        </option>
                      ))}
                    </select>
                  )}
                  <ChonDieuKien id={`bm-bc-${i}`} gt={l.dk} doi={(v) => datLa(i, { dk: v })} />
                </>
              ) : (
                <>
                  <select aria-label="Biến cố theo màu" value={l.mau_loai} onChange={(e) => datLa(i, { mau_loai: e.target.value as La["mau_loai"] })}>
                    {MAU_LOAI.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.ten}
                      </option>
                    ))}
                  </select>
                  {(l.mau_loai === "it_nhat" || l.mau_loai === "dung") && (
                    <select aria-label="Màu cần xét" value={danhSachMau.includes(l.mau) ? l.mau : (danhSachMau[0] ?? "")} onChange={(e) => datLa(i, { mau: e.target.value })}>
                      {danhSachMau.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  )}
                  {l.mau_loai === "dung" && <OSo id={`bm-kmau-${i}`} nhan="Số vật màu đó (k)" gt={l.k_mau} min={0} max={4} onDoi={(v) => datLa(i, { k_mau: v })} />}
                </>
              )}
              {cacLa.length > 1 && (
                <button type="button" className="phu" onClick={() => setCacLa((a) => a.filter((_, j) => j !== i))}>
                  Bỏ
                </button>
              )}
            </div>
          </div>
        ))}
        {cacLa.length < 6 && (
          <button
            type="button"
            className="phu"
            style={{ marginTop: "0.6rem" }}
            onClick={() => setCacLa((a) => [...a, { ...LA_MAC_DINH, kieu: coSo ? "so" : "mau", dk: { ...DK_MAC_DINH, loai: "chan" } }])}
          >
            + Thêm điều kiện (ghép bằng và / hoặc)
          </button>
        )}
        <label className="hang" style={{ margin: "0.8rem 0 0", gap: "0.4rem", fontWeight: 600 }}>
          <input type="checkbox" style={{ width: "1.1rem", height: "1.1rem" }} checked={phuDinh} onChange={(e) => setPhuDinh(e.target.checked)} />
          Đề hỏi biến cố NGƯỢC LẠI (xác suất để cả biến cố trên KHÔNG xảy ra)
        </label>
      </div>

      <div className="the ket-qua-bt">
        <h2>4. Máy hiểu và tính ra</h2>
        {"loi" in ketQua ? (
          <div className="thong-bao loi">{ketQua.loi}</div>
        ) : tinh && cauHinh ? (
          <>
            <div className="thong-bao tin">
              <strong>Máy hiểu đề như sau (hãy đối chiếu với đề):</strong> {moTaBaiMo(form, cauHinh.vat.length)}
            </div>
            <div className="ct-ket-qua" style={{ marginTop: "0.6rem" }}>
              P = {tinh.p.toString()} ≈ {(tinh.p.soThuc() * 100).toFixed(2).replace(".", ",")}% ({tinh.gs.thoa} kết quả thuận lợi trên {tinh.gs.tong} kết quả có thể)
            </div>
            <div className="truong" style={{ marginTop: "0.8rem" }}>
              <label htmlFor="bm-dap-an">Các phương án trong đề (nếu có, cách nhau bằng dấu phẩy)</label>
              <input id="bm-dap-an" style={{ maxWidth: 360 }} value={dapAn} onChange={(e) => setDapAn(e.target.value)} placeholder="1/2, 1/3, 1/6, 1/4" />
            </div>
            {phuongAn.length > 0 && (
              <div className={`thong-bao ${khopPA >= 0 ? "tin" : "canh-bao"}`}>
                {khopPA >= 0 ? `✓ Khớp phương án ${CHU[khopPA]} (${phuongAn[khopPA]}).` : "Kết quả không trùng phương án nào trong đề: hãy kiểm tra lại cách hiểu đề (nguồn vật, số lần lấy, có hoàn lại không, biến cố)."}
              </div>
            )}
            {tinh.gs.ds && (
              <div style={{ marginTop: "0.8rem" }}>
                <div className="nhan-muc">Tất cả {tinh.gs.tong} kết quả (✓ = thuận lợi biến cố)</div>
                <div className="khong-gian-mau">
                  {tinh.gs.ds.map((k, i) => (
                    <span key={i} className={k.thoa ? "thoa" : ""}>
                      {k.nhan}
                      {k.gia_tri !== undefined && soLan > 1 ? ` → ${k.gia_tri}` : ""} {k.thoa ? "✓" : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {loiGiai && (
        <div className="the loi-giai-hs">
          <h2>5. Lời giải cho học sinh</h2>
          <p className="muted">Các bước tính do máy đếm chính xác; cách viết dành cho học sinh lớp 9.</p>
          {loiGiai.buoc.map((b) => (
            <div key={b.tieu_de} className="buoc-hs">
              <h3>{b.tieu_de}</h3>
              {b.dong.map((d, i) => (
                <p key={i}>{d}</p>
              ))}
            </div>
          ))}
          <div className="ct-ket-qua">{loiGiai.ket_luan}</div>
          {loiGiai.luu_y.length > 0 && (
            <div className="thong-bao tin" style={{ marginTop: "0.6rem" }}>
              <strong>Lưu ý:</strong>
              <ul style={{ margin: "0.3rem 0 0 1.2rem" }}>
                {loiGiai.luu_y.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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
        {daLuu && <div className="thong-bao tin">Đã lưu “{daLuu}”. Bài hiện ở tab “Tiết học với AI”.</div>}
        <div className="truong">
          <label htmlFor="bm-tieu-de">Tên bài (không bắt buộc)</label>
          <input id="bm-tieu-de" value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} maxLength={80} />
        </div>
        <div className="hang">
          <button type="button" onClick={() => void luu(false)} disabled={dangLuu || !cauHinh}>
            {dangLuu ? "Đang lưu…" : "Lưu bài"}
          </button>
          <button type="button" className="phu" onClick={() => void luu(true)} disabled={dangLuu || !cauHinh}>
            Lưu và mở phiên ngay
          </button>
        </div>
      </div>
      <BaiDaLuu thuVien={thuVien} onDoi={onDaLuu} />
    </div>
  );
}
