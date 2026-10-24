// Trang phòng thí nghiệm tự do: giáo viên chọn vật và kiểu thí nghiệm để khám phá trước khi dạy.
import type { BienCoThe, CauHinhVat, CheDoBi, CheDoDongXuTT, CheDoThe, CheDoXucXac, NhomBi } from "@plab/core";
import { cacSoThuanLoi, docTapSo, GIOI_HAN } from "@plab/core";
import { useMemo, useState } from "react";
import { PhongVat } from "./PhongVat";

type Vat = "xuc_xac" | "dong_xu" | "bi" | "the";

// Omit<> trên kiểu hợp sẽ làm mất các trường riêng của từng chế độ, nên ghép kiểu trực tiếp.
type XucXacChuaSeed = { loai: "xuc_xac"; so_lan_goi_y: number } & CheDoXucXac;
type DongXuChuaSeed = { loai: "dong_xu"; so_lan_goi_y: number } & CheDoDongXuTT;
type BiChuaSeed = { loai: "bi"; hop: NhomBi[]; so_lan_goi_y: number } & CheDoBi;
type TheChuaSeed = { loai: "the"; so_the: number; so_lan_goi_y: number } & CheDoThe;
type ChuaSeed = XucXacChuaSeed | DongXuChuaSeed | BiChuaSeed | TheChuaSeed;
interface KieuThiNghiem {
  id: string;
  ten: string;
  cauHinh: ChuaSeed;
}

const VAT: { id: Vat; ten: string; bieuTuong: string }[] = [
  { id: "xuc_xac", ten: "Xúc xắc", bieuTuong: "🎲" },
  { id: "dong_xu", ten: "Đồng xu", bieuTuong: "🪙" },
  { id: "bi", ten: "Hộp bi", bieuTuong: "🔴" },
  { id: "the", ten: "Thẻ số", bieuTuong: "🔢" },
];

interface ThamSoXucXac {
  soCon: number;
  soLanTruoc: number;
  mat: number;
  dayA: number[];
  dayB: number[];
}
interface ThamSoDongXu {
  soDong: number;
  soLanTruoc: number;
  mat: "N" | "S";
  dayA: string;
  dayB: string;
}

const THAM_SO_XUC_XAC: ThamSoXucXac = { soCon: 1, soLanTruoc: 5, mat: 6, dayA: [6, 6, 6], dayB: [2, 5, 3] };
const THAM_SO_DONG_XU: ThamSoDongXu = { soDong: 1, soLanTruoc: 5, mat: "N", dayA: "NNNNNN", dayB: "NSNSSN" };

const kieuXucXac = (p: ThamSoXucXac): KieuThiNghiem[] => [
  { id: "so_con", ten: p.soCon === 1 ? "1 con" : `${p.soCon} con – tính tổng`, cauHinh: { loai: "xuc_xac", che_do: "phan_phoi", so_xuc_xac: p.soCon, theo_doi: [p.soCon === 1 ? 6 : Math.round(p.soCon * 3.5)], so_lan_goi_y: 1000 } },
  { id: "dieu_kien", ten: `Sau ${p.soLanTruoc} lần không ra ${p.mat}`, cauHinh: { loai: "xuc_xac", che_do: "dieu_kien", so_lan_truoc: p.soLanTruoc, mat: p.mat, theo_doi: ["ra"], so_lan_goi_y: 3000 } },
  { id: "day", ten: `Dãy ${p.dayA.join("-")} và ${p.dayB.join("-")}`, cauHinh: { loai: "xuc_xac", che_do: "day", day_a: p.dayA, day_b: p.dayB, theo_doi: ["a", "b"], so_lan_goi_y: Math.min(100_000, 6 ** p.dayA.length * 100) } },
];

const kieuDongXu = (p: ThamSoDongXu): KieuThiNghiem[] => [
  { id: "so_dong", ten: p.soDong === 1 ? "1 đồng xu" : `${p.soDong} đồng – đếm mặt ngửa`, cauHinh: { loai: "dong_xu", che_do: "phan_phoi", so_dong_xu: p.soDong, theo_doi: [p.soDong === 1 ? "N" : String(Math.round(p.soDong / 2))], so_lan_goi_y: 1000 } },
  { id: "dieu_kien", ten: `Sau ${p.soLanTruoc} lần cùng ${p.mat === "N" ? "ngửa" : "sấp"}`, cauHinh: { loai: "dong_xu", che_do: "dieu_kien", so_lan_truoc: p.soLanTruoc, mat: p.mat, theo_doi: [p.mat === "N" ? "S" : "N"], so_lan_goi_y: 3000 } },
  { id: "day", ten: `Dãy ${p.dayA} và ${p.dayB}`, cauHinh: { loai: "dong_xu", che_do: "day", day_a: p.dayA, day_b: p.dayB, theo_doi: ["a", "b"], so_lan_goi_y: Math.min(100_000, 2 ** p.dayA.length * 1000) } },
];

const kep = (x: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(x) || min));

/** Đọc dãy mặt xúc xắc giáo viên gõ: "666", "6-6-6" hay "6 6 6" đều được. */
function docDayXucXac(text: string): number[] | null {
  const so = text.match(/[1-6]/g);
  return so && !/[^1-6\s,.;-]/.test(text) ? so.map(Number) : null;
}

/** Một ô nhập số có nhãn, giá trị luôn được giữ trong [min, max]. */
export function OSo({ id, nhan, gt, min, max, onDoi }: { id: string; nhan: string; gt: number; min: number; max: number; onDoi: (v: number) => void }) {
  return (
    <div className="hang" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
      <label htmlFor={id} style={{ margin: 0 }}>{nhan}</label>
      <div className="buoc-so">
        <button type="button" aria-label={`Giảm ${nhan}`} disabled={gt <= min} onClick={() => onDoi(kep(gt - 1, min, max))}>
          −
        </button>
        <input id={id} type="number" min={min} max={max} value={gt} onChange={(e) => onDoi(kep(Number(e.target.value), min, max))} />
        <button type="button" aria-label={`Tăng ${nhan}`} disabled={gt >= max} onClick={() => onDoi(kep(gt + 1, min, max))}>
          +
        </button>
      </div>
      <span className="muted">{max >= 100_000 ? `(từ ${min})` : `(${min}–${max})`}</span>
    </div>
  );
}

/** Hộp bi mặc định: nhỏ, dễ thấy cả hai màu. */
const HOP_MAC_DINH = "đỏ 3, xanh 2";

/** Đọc cách mô tả hộp bi của giáo viên, ví dụ "đỏ 3, xanh 5, vàng 2". */
function docHopBi(text: string): { hop: NhomBi[] } | { loi: string } {
  const phan = text
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const hop: NhomBi[] = [];
  for (const p of phan) {
    // Chấp nhận cả "đỏ 3" lẫn "3 đỏ".
    const m = p.match(/^(.+?)\s+(\d+)$/);
    const n = m ? null : p.match(/^(\d+)\s+(.+)$/);
    if (!m && !n) return { loi: `Không hiểu “${p}”. Viết dạng: đỏ 3, xanh 5` };
    hop.push(m ? { ten: m[1]!.trim(), so: Number(m[2]) } : { ten: n![2]!.trim(), so: Number(n![1]) });
  }
  if (hop.length < 2 || hop.length > 6) return { loi: "Hộp cần từ 2 đến 6 màu" };
  if (new Set(hop.map((g) => g.ten.toLowerCase())).size !== hop.length) return { loi: "Tên các màu không được trùng nhau" };
  if (hop.some((g) => g.so < 1 || g.so > 20 || g.ten.length > 12)) return { loi: "Mỗi màu có 1 đến 20 viên, tên tối đa 12 ký tự" };
  if (hop.reduce((s, g) => s + g.so, 0) > 30) return { loi: "Hộp chứa tối đa 30 viên bi" };
  return { hop };
}

interface ThamSoBi {
  soLay: 2 | 3;
  hoanLai: boolean;
  /** Màu cần xét (nếu không còn trong hộp thì lấy màu đầu tiên). */
  mau: string;
  suKien: "it_nhat" | "cung_mau" | "khac_mau";
}
const THAM_SO_BI: ThamSoBi = { soLay: 2, hoanLai: false, mau: "", suKien: "it_nhat" };

const SU_KIEN_BI: { id: ThamSoBi["suKien"]; ten: string }[] = [
  { id: "it_nhat", ten: "Có ít nhất 1 bi màu …" },
  { id: "cung_mau", ten: "Hai bi cùng màu" },
  { id: "khac_mau", ten: "Hai bi khác màu" },
];

const kieuBi = (hop: NhomBi[], p: ThamSoBi): KieuThiNghiem[] => {
  const mauX = hop.some((g) => g.ten === p.mau) ? p.mau : hop[0]!.ten;
  // Cùng màu / khác màu chỉ có nghĩa khi lấy 2 bi.
  const suKien = p.soLay === 3 ? "it_nhat" : p.suKien;
  const tenSuKien = suKien === "it_nhat" ? `ít nhất 1 bi ${mauX}` : suKien === "cung_mau" ? "cùng màu" : "khác màu";
  const dau = hop[0]!.ten;
  // Thí nghiệm "sau k lần liên tiếp": lặp lại màu nhiều bi nhất (để đủ số lượt thỏa điều kiện), theo dõi màu còn lại.
  const nhieu = [...hop].sort((a, b) => b.so - a.so)[0]!;
  const hai = nhieu.ten;
  const khac = hop.find((g) => g !== nhieu)!.ten;
  const goc = { loai: "bi" as const, hop, so_lan_goi_y: 1000 };
  return [
    { id: "mot_vien", ten: "Lấy 1 bi", cauHinh: { ...goc, che_do: "phan_phoi", so_lay: 1, hoan_lai: true, mau_muc_tieu: dau, theo_doi: [dau] } },
    { id: "hai_hoan", ten: "Lấy 2 bi – có hoàn lại", cauHinh: { ...goc, che_do: "phan_phoi", so_lay: 2, hoan_lai: true, mau_muc_tieu: dau, theo_doi: ["2"] } },
    { id: "hai_khong", ten: "Lấy 2 bi – không hoàn lại", cauHinh: { ...goc, che_do: "phan_phoi", so_lay: 2, hoan_lai: false, mau_muc_tieu: dau, theo_doi: ["2"] } },
    { id: "dieu_kien", ten: `Sau 4 lần liên tiếp bi ${hai}`, cauHinh: { ...goc, so_lan_goi_y: 3000, che_do: "dieu_kien", so_lan_truoc: 4, mau_lap: hai, theo_doi: [khac] } },
    {
      id: "su_kien",
      ten: `Lấy ${p.soLay} bi – ${tenSuKien}`,
      cauHinh: { ...goc, che_do: "phan_phoi", so_lay: p.soLay, hoan_lai: p.hoanLai, mau_muc_tieu: mauX, su_kien: suKien, theo_doi: ["co"] },
    },
  ];
};

const BIEN_CO: { kieu: BienCoThe["kieu"]; ten: string; coK: boolean; kMacDinh?: number }[] = [
  { kieu: "chan", ten: "Số chẵn", coK: false },
  { kieu: "le", ten: "Số lẻ", coK: false },
  { kieu: "boi", ten: "Bội của k", coK: true, kMacDinh: 3 },
  { kieu: "nguyen_to", ten: "Số nguyên tố", coK: false },
  { kieu: "lon_hon", ten: "Lớn hơn k", coK: true, kMacDinh: 7 },
  { kieu: "nho_hon", ten: "Nhỏ hơn k", coK: true, kMacDinh: 4 },
  { kieu: "tap_hop", ten: "Tự nhập các số", coK: false },
];

const kieuThe = (soThe: number, bienCo: BienCoThe): KieuThiNghiem[] => {
  const goc = { loai: "the" as const, so_the: soThe, so_lan_goi_y: 1000 };
  return [
    // "Từng số" liệt kê mỗi thẻ một lựa chọn nên chỉ dùng cho bộ thẻ vừa phải.
    ...(soThe <= GIOI_HAN.SO_THE_TUNG_SO_TOI_DA
      ? [{ id: "tung_so", ten: "Rút 1 thẻ – từng số", cauHinh: { ...goc, so_lan_goi_y: 10000, che_do: "tung_so", theo_doi: [...new Set(["1", String(soThe)])] } } as KieuThiNghiem]
      : []),
    { id: "bien_co", ten: "Rút 1 thẻ – theo biến cố", cauHinh: { ...goc, che_do: "bien_co", bien_co: bienCo, theo_doi: ["co"] } },
    { id: "hai_hoan", ten: "Rút 2 thẻ – có hoàn lại", cauHinh: { ...goc, che_do: "hai_the", hoan_lai: true, bien_co: bienCo, theo_doi: ["2"] } },
    { id: "hai_khong", ten: "Rút 2 thẻ – không hoàn lại", cauHinh: { ...goc, che_do: "hai_the", hoan_lai: false, bien_co: bienCo, theo_doi: ["2"] } },
  ];
};

export function PhongThiNghiem() {
  const [vat, setVat] = useState<Vat>("xuc_xac");
  const [kieuId, setKieuId] = useState<string>("so_con");
  const [xx, setXx] = useState<ThamSoXucXac>(THAM_SO_XUC_XAC);
  const [dx, setDx] = useState<ThamSoDongXu>(THAM_SO_DONG_XU);
  // Dãy đang gõ và thông báo lỗi; chỉ áp dụng khi hợp lệ để thí nghiệm không dựng lại sau mỗi phím.
  const [dayXxNhap, setDayXxNhap] = useState({ a: "6-6-6", b: "2-5-3" });
  const [dayDxNhap, setDayDxNhap] = useState({ a: "NNNNNN", b: "NSNSSN" });
  const [dayLoi, setDayLoi] = useState<string | null>(null);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));

  // Hộp bi: văn bản đang gõ và hộp đã áp dụng (chỉ đổi khi bấm Áp dụng để không dựng lại thí nghiệm mỗi lần gõ).
  const [hopNhap, setHopNhap] = useState(HOP_MAC_DINH);
  const [hopDung, setHopDung] = useState<NhomBi[]>(() => (docHopBi(HOP_MAC_DINH) as { hop: NhomBi[] }).hop);
  const [hopLoi, setHopLoi] = useState<string | null>(null);
  const [tsBi, setTsBi] = useState<ThamSoBi>(THAM_SO_BI);

  // Thẻ số.
  const [soThe, setSoThe] = useState(10);
  const [kieuBienCo, setKieuBienCo] = useState<BienCoThe["kieu"]>("boi");
  const [kBienCo, setKBienCo] = useState(3);
  // Biến cố tự chọn: chữ đang gõ, danh sách số đã hiểu được (giữ bản hợp lệ gần nhất) và lỗi nếu có.
  const [tapNhap, setTapNhap] = useState("2, 3, 5, 7");
  const [tapSo, setTapSo] = useState<number[]>([2, 3, 5, 7]);
  const [tapLoi, setTapLoi] = useState<string | null>(null);

  const bienCo: BienCoThe = useMemo(() => {
    const mo = BIEN_CO.find((b) => b.kieu === kieuBienCo)!;
    if (kieuBienCo === "tap_hop") return { kieu: "tap_hop", so: tapSo };
    return mo.coK ? { kieu: kieuBienCo, k: kBienCo } : { kieu: kieuBienCo };
  }, [kieuBienCo, kBienCo, tapSo]);

  const ds: KieuThiNghiem[] = useMemo(() => {
    switch (vat) {
      case "xuc_xac":
        return kieuXucXac(xx);
      case "dong_xu":
        return kieuDongXu(dx);
      case "bi":
        return kieuBi(hopDung, tsBi);
      case "the":
        return kieuThe(soThe, bienCo);
    }
  }, [vat, xx, dx, hopDung, tsBi, soThe, bienCo]);

  const kieu = ds.find((k) => k.id === kieuId) ?? ds[0]!;
  const cauHinh = { ...kieu.cauHinh, seed } as CauHinhVat;
  const khoaDung = `${vat}-${JSON.stringify(kieu.cauHinh)}`;

  function doiVat(v: Vat) {
    setVat(v);
    setKieuId(v === "xuc_xac" ? "so_con" : v === "dong_xu" ? "so_dong" : v === "bi" ? "mot_vien" : "tung_so");
    setDayLoi(null);
  }

  function apDungHop() {
    const kq = docHopBi(hopNhap);
    if ("loi" in kq) {
      setHopLoi(kq.loi);
      return;
    }
    setHopLoi(null);
    setHopDung(kq.hop);
  }

  function apDungDay() {
    if (vat === "xuc_xac") {
      const a = docDayXucXac(dayXxNhap.a);
      const b = docDayXucXac(dayXxNhap.b);
      if (!a || !b) return setDayLoi("Dãy chỉ gồm các mặt từ 1 đến 6, ví dụ 6-6-6");
      if (a.length < 2 || a.length > 6) return setDayLoi("Mỗi dãy gồm 2 đến 6 lần gieo");
      if (a.length !== b.length) return setDayLoi("Hai dãy phải cùng độ dài");
      setDayLoi(null);
      setXx((p) => ({ ...p, dayA: a, dayB: b }));
    } else {
      const a = dayDxNhap.a.toUpperCase().replace(/\s/g, "");
      const b = dayDxNhap.b.toUpperCase().replace(/\s/g, "");
      if (!/^[NS]+$/.test(a) || !/^[NS]+$/.test(b)) return setDayLoi("Dãy chỉ gồm N (ngửa) và S (sấp), ví dụ NSNSSN");
      if (a.length < 2 || a.length > 10) return setDayLoi("Mỗi dãy gồm 2 đến 10 lần tung");
      if (a.length !== b.length) return setDayLoi("Hai dãy phải cùng độ dài");
      setDayLoi(null);
      setDx((p) => ({ ...p, dayA: a, dayB: b }));
    }
  }

  function doiTapSo(text: string) {
    setTapNhap(text);
    const ds = docTapSo(text);
    if (!ds) return setTapLoi("Gõ các số từ 1 đến 20, cách nhau bằng dấu phẩy; có thể viết khoảng như 3-6");
    setTapLoi(null);
    setTapSo(ds);
  }

  const soThuanLoi = vat === "the" ? cacSoThuanLoi(soThe, bienCo).length : null;
  const moBienCo = BIEN_CO.find((b) => b.kieu === kieuBienCo)!;

  return (
    <PhongVat
      key={khoaDung}
      cauHinh={cauHinh}
      dieuKhienThem={
        <>
          <div className="chon-vat" role="tablist" aria-label="Chọn vật thí nghiệm">
            {VAT.map((v) => (
              <button key={v.id} role="tab" aria-selected={vat === v.id} className={vat === v.id ? "dang-chon" : ""} onClick={() => doiVat(v.id)}>
                <span aria-hidden="true">{v.bieuTuong}</span> {v.ten}
              </button>
            ))}
          </div>

          {vat === "bi" && (
            <div className="truong" style={{ marginTop: "0.8rem" }}>
              <label htmlFor="hop-bi">Trong hộp có</label>
              <div className="hang" style={{ gap: "0.4rem", flexWrap: "nowrap" }}>
                <input id="hop-bi" value={hopNhap} onChange={(e) => setHopNhap(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apDungHop()} placeholder="đỏ 3, xanh 2" />
                <button className="phu nho" type="button" onClick={apDungHop}>
                  Áp dụng
                </button>
              </div>
              {hopLoi ? <div className="thong-bao loi" style={{ marginTop: "0.4rem", marginBottom: 0 }}>{hopLoi}</div> : <div className="muted" style={{ marginTop: "0.3rem" }}>Viết dạng “màu số”, cách nhau bằng dấu phẩy (2 đến 6 màu, tối đa 30 bi; “đỏ 3” hay “3 đỏ” đều được).</div>}
            </div>
          )}

          {vat === "the" && (
            <div className="truong" style={{ marginTop: "0.8rem" }}>
              <OSo id="so-the" nhan="Số thẻ" gt={soThe} min={2} max={100_000} onDoi={setSoThe} />
              <div className="hang" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
                <label htmlFor="bien-co" style={{ margin: 0 }}>Biến cố</label>
                <select id="bien-co" value={kieuBienCo} onChange={(e) => { const k = e.target.value as BienCoThe["kieu"]; setKieuBienCo(k); setKBienCo(BIEN_CO.find((b) => b.kieu === k)?.kMacDinh ?? 3); }}>
                  {BIEN_CO.map((b) => (
                    <option key={b.kieu} value={b.kieu}>
                      {b.ten}
                    </option>
                  ))}
                </select>
                </div>
              {kieuBienCo === "tap_hop" && (
                <div style={{ marginTop: "0.5rem" }}>
                  <label htmlFor="tap-so">Các thẻ thuận lợi (số ghi trên thẻ)</label>
                  <input id="tap-so" value={tapNhap} onChange={(e) => doiTapSo(e.target.value)} placeholder="2, 3, 5, 7 hoặc 1-4, 9" />
                  {tapLoi ? (
                    <div className="thong-bao loi" style={{ marginTop: "0.4rem", marginBottom: 0 }}>{tapLoi}</div>
                  ) : (
                    <div className="muted" style={{ marginTop: "0.3rem" }}>Ví dụ “2, 5, 7” hoặc “1-4, 9”. Số vượt quá số thẻ sẽ không tính.</div>
                  )}
                </div>
              )}
              {moBienCo.coK && <OSo id="so-k" nhan="Số k" gt={kBienCo} min={1} max={100_000} onDoi={setKBienCo} />}
              {soThuanLoi === 0 && <div className="thong-bao canh-bao" style={{ marginTop: "0.5rem", marginBottom: 0 }}>Không có thẻ nào thuận lợi biến cố này.</div>}
            </div>
          )}

          <div className="nhan-muc" style={{ marginTop: "0.8rem" }}>Kiểu thí nghiệm (chọn rồi tự nhập số liệu bên dưới)</div>
          <div className="vien">
            {ds.map((k) => (
              <button key={k.id} className={kieu.id === k.id ? "dang-chon" : ""} onClick={() => setKieuId(k.id)}>
                {k.ten}
              </button>
            ))}
          </div>
          {vat === "bi" && kieu.id === "su_kien" && (
            <div className="truong" style={{ marginTop: "0.8rem" }}>
              <OSo id="so-lay" nhan="Số bi lấy" gt={tsBi.soLay} min={2} max={3} onDoi={(v) => setTsBi((p) => ({ ...p, soLay: v as 2 | 3 }))} />
              <div className="hang" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
                <label htmlFor="su-kien-bi" style={{ margin: 0 }}>Biến cố</label>
                <select id="su-kien-bi" value={tsBi.soLay === 3 ? "it_nhat" : tsBi.suKien} onChange={(e) => setTsBi((p) => ({ ...p, suKien: e.target.value as ThamSoBi["suKien"] }))}>
                  {SU_KIEN_BI.map((s) => (
                    <option key={s.id} value={s.id} disabled={tsBi.soLay === 3 && s.id !== "it_nhat"}>
                      {s.ten}
                    </option>
                  ))}
                </select>
                {(tsBi.soLay === 3 || tsBi.suKien === "it_nhat") && (
                  <select aria-label="Màu cần xét" value={hopDung.some((g) => g.ten === tsBi.mau) ? tsBi.mau : hopDung[0]!.ten} onChange={(e) => setTsBi((p) => ({ ...p, mau: e.target.value }))}>
                    {hopDung.map((g) => (
                      <option key={g.ten} value={g.ten}>
                        {g.ten}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <label className="hang" style={{ margin: "0.5rem 0 0", gap: "0.4rem", fontWeight: 600 }}>
                <input type="checkbox" style={{ width: "1.1rem", height: "1.1rem" }} checked={tsBi.hoanLai} onChange={(e) => setTsBi((p) => ({ ...p, hoanLai: e.target.checked }))} />
                Có hoàn lại (bỏ bi lại hộp sau mỗi lần lấy)
              </label>
              {tsBi.soLay === 3 && <div className="muted" style={{ marginTop: "0.3rem" }}>Lấy 3 bi chỉ xét “có ít nhất 1 bi màu …”.</div>}
            </div>
          )}

          {(vat === "xuc_xac" || vat === "dong_xu") && (
            <div className="truong" style={{ marginTop: "0.8rem" }}>
              {vat === "xuc_xac" && kieu.id === "so_con" && <OSo id="so-con" nhan="Số con xúc xắc" gt={xx.soCon} min={1} max={6} onDoi={(v) => setXx((p) => ({ ...p, soCon: v }))} />}
              {vat === "dong_xu" && kieu.id === "so_dong" && <OSo id="so-dong" nhan="Số đồng xu" gt={dx.soDong} min={1} max={10} onDoi={(v) => setDx((p) => ({ ...p, soDong: v }))} />}
              {vat === "xuc_xac" && kieu.id === "dieu_kien" && (
                <>
                  <OSo id="lan-truoc" nhan="Số lần liên tiếp" gt={xx.soLanTruoc} min={1} max={10} onDoi={(v) => setXx((p) => ({ ...p, soLanTruoc: v }))} />
                  <OSo id="mat-xx" nhan="Mặt cần xét" gt={xx.mat} min={1} max={6} onDoi={(v) => setXx((p) => ({ ...p, mat: v }))} />
                </>
              )}
              {vat === "dong_xu" && kieu.id === "dieu_kien" && (
                <>
                  <OSo id="lan-truoc" nhan="Số lần liên tiếp" gt={dx.soLanTruoc} min={1} max={10} onDoi={(v) => setDx((p) => ({ ...p, soLanTruoc: v }))} />
                  <div className="hang" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
                    <label htmlFor="mat-dx" style={{ margin: 0 }}>Mặt lặp lại</label>
                    <select id="mat-dx" value={dx.mat} onChange={(e) => setDx((p) => ({ ...p, mat: e.target.value as "N" | "S" }))}>
                      <option value="N">Ngửa</option>
                      <option value="S">Sấp</option>
                    </select>
                  </div>
                </>
              )}
              {kieu.id === "day" && (
                <>
                  {(["a", "b"] as const).map((k) => (
                    <div key={k} className="hang" style={{ gap: "0.5rem", marginTop: "0.5rem", flexWrap: "nowrap" }}>
                      <label htmlFor={`day-${k}`} style={{ margin: 0 }}>Dãy {k.toUpperCase()}</label>
                      <input
                        id={`day-${k}`}
                        value={vat === "xuc_xac" ? dayXxNhap[k] : dayDxNhap[k]}
                        onChange={(e) => (vat === "xuc_xac" ? setDayXxNhap((p) => ({ ...p, [k]: e.target.value })) : setDayDxNhap((p) => ({ ...p, [k]: e.target.value })))}
                        onKeyDown={(e) => e.key === "Enter" && apDungDay()}
                        placeholder={vat === "xuc_xac" ? "6-6-6" : "NSNSSN"}
                      />
                    </div>
                  ))}
                  <button className="phu nho" type="button" style={{ marginTop: "0.5rem" }} onClick={apDungDay}>
                    Áp dụng
                  </button>
                  {dayLoi ? <div className="thong-bao loi" style={{ marginTop: "0.4rem", marginBottom: 0 }}>{dayLoi}</div> : <div className="muted" style={{ marginTop: "0.3rem" }}>{vat === "xuc_xac" ? "Hai dãy cùng độ dài 2–6, mỗi lần gieo là một mặt từ 1 đến 6." : "Hai dãy cùng độ dài 2–10, gồm N (ngửa) và S (sấp)."}</div>}
                </>
              )}
            </div>
          )}
          <hr className="ke" />
        </>
      }
    />
  );
}
