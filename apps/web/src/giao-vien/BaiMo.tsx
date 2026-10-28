// Tab "Bài toán mở": tự ghép nguồn vật + cách lấy + biến cố (có thể ghép bằng và / hoặc / chỉ một / không) từ các khối có sẵn.
// Dùng chung bộ máy của bài toán tổng quát: xác suất chính xác, bảng kết quả, thí nghiệm và lời giải luôn khớp nhau.
import {
  bienCoTuAI,
  dieuKienTuAI,
  nguonTuAI,
  khongGianMau,
  loiGiaiHocSinh,
  moTaBaiMo,
  taoVatTuNguon,
  xacSuatBaiToan,
  xayBaiMo,
  type BienCoBaiToan,
  type CauHinhBaiToan,
  type CauHinhVat,
  type DaiLuongBaiToan,
  type DieuKienBaiToan,
  type FormMo,
  type LocSo,
  type LocVat,
  type NguonMo,
} from "@plab/core";
import { useMemo, useState } from "react";
import type { ThuVien } from "../App";
import { api, type DocDeMo } from "../api";
import { OSo } from "../phong-thi-nghiem/PhongThiNghiem";
import { PhongVat } from "../phong-thi-nghiem/PhongVat";
import { NutAnhDe } from "./NutAnhDe";
import { luuPhienGanDay, VAT } from "./TrangChu";

/** Điều kiện trên một số, kèm các tham số k, k2, m, r, d (chỉ dùng tham số mà loại đó cần). */
interface DK {
  loai: DieuKienBaiToan["loai"];
  k: number;
  k2: number;
  m: number;
  r: number;
  d: number;
}

const DK_MAC_DINH: DK = { loai: "chinh_phuong", k: 3, k2: 9, m: 3, r: 1, d: 1 };

const NHOM_DK: { nhom: string; ds: { id: DieuKienBaiToan["loai"]; ten: string }[] }[] = [
  {
    nhom: "So sánh giá trị",
    ds: [
      { id: "bang", ten: "bằng k" },
      { id: "khac", ten: "khác k" },
      { id: "lon_hon", ten: "lớn hơn k" },
      { id: "nho_hon", ten: "nhỏ hơn k" },
      { id: "lon_hon_hoac_bang", ten: "lớn hơn hoặc bằng k (ít nhất k)" },
      { id: "nho_hon_hoac_bang", ten: "nhỏ hơn hoặc bằng k (không quá k)" },
      { id: "trong_doan", ten: "nằm trong đoạn từ k đến k2" },
      { id: "ngoai_doan", ten: "nhỏ hơn k hoặc lớn hơn k2" },
      { id: "duong", ten: "là số dương" },
      { id: "am", ten: "là số âm" },
    ],
  },
  {
    nhom: "Tính chất số học",
    ds: [
      { id: "chan", ten: "là số chẵn" },
      { id: "le", ten: "là số lẻ" },
      { id: "nguyen_to", ten: "là số nguyên tố" },
      { id: "hop_so", ten: "là hợp số" },
      { id: "chinh_phuong", ten: "là số chính phương" },
      { id: "chia_het", ten: "chia hết cho k (bội của k)" },
      { id: "khong_chia_het", ten: "không chia hết cho k" },
      { id: "uoc_cua", ten: "là ước của k" },
      { id: "du", ten: "chia m dư r" },
    ],
  },
  {
    nhom: "Chữ số",
    ds: [
      { id: "tan_cung", ten: "có chữ số tận cùng bằng d" },
      { id: "hang_chuc", ten: "có chữ số hàng chục bằng d" },
      { id: "hang_chuc_chan", ten: "có chữ số hàng chục là số chẵn" },
      { id: "hang_chuc_le", ten: "có chữ số hàng chục là số lẻ" },
      { id: "tong_chu_so", ten: "có tổng các chữ số bằng k" },
      { id: "co_chu_so", ten: "có chữ số d" },
      { id: "chu_so_khac_nhau", ten: "có các chữ số khác nhau" },
      { id: "doi_xung", ten: "là số đối xứng (121, 44…)" },
    ],
  },
];

const CAN_K = new Set<DieuKienBaiToan["loai"]>(["chia_het", "khong_chia_het", "uoc_cua", "bang", "khac", "lon_hon", "nho_hon", "lon_hon_hoac_bang", "nho_hon_hoac_bang", "trong_doan", "ngoai_doan", "tong_chu_so"]);
const CAN_K2 = new Set<DieuKienBaiToan["loai"]>(["trong_doan", "ngoai_doan"]);
const CAN_D = new Set<DieuKienBaiToan["loai"]>(["co_chu_so", "tan_cung", "hang_chuc"]);
const K_DUONG = new Set<DieuKienBaiToan["loai"]>(["chia_het", "khong_chia_het", "uoc_cua"]);

const DAI_LUONG: { id: DaiLuongBaiToan; ten: string; can: (soLan: number) => boolean }[] = [
  { id: "tong", ten: "Tổng các số", can: () => true },
  { id: "tich", ten: "Tích các số", can: () => true },
  { id: "hieu", ten: "Hiệu (lần 1 trừ lần 2)", can: (n) => n === 2 },
  { id: "hieu_tuyet_doi", ten: "Hiệu hai số (số lớn trừ số bé)", can: (n) => n >= 2 },
  { id: "thuong", ten: "Thương (lần 1 chia lần 2)", can: (n) => n === 2 },
  { id: "tong_binh_phuong", ten: "Tổng bình phương", can: () => true },
  { id: "binh_phuong_tong", ten: "Bình phương của tổng", can: () => true },
  { id: "lon_nhat", ten: "Số lớn nhất", can: () => true },
  { id: "nho_nhat", ten: "Số nhỏ nhất", can: () => true },
  { id: "ghep", ten: "Số ghép theo thứ tự lấy", can: () => true },
];

const MAU_LOAI: { id: Extract<BienCoBaiToan, { kieu: "mau" }>["loai"]; ten: string }[] = [
  { id: "it_nhat", ten: "Có ít nhất 1 vật màu …" },
  { id: "dung", ten: "Có đúng k vật màu …" },
  { id: "cung_mau", ten: "Các vật cùng màu" },
  { id: "khac_mau", ten: "Hai vật khác màu (lấy 2)" },
];

const QUAN_HE: { id: Extract<BienCoBaiToan, { kieu: "quan_he" }>["loai"]; ten: string }[] = [
  { id: "bang_nhau", ten: "Các số bằng nhau" },
  { id: "khac_nhau", ten: "Các số đôi một khác nhau" },
  { id: "cung_chan_le", ten: "Cùng chẵn hoặc cùng lẻ" },
  { id: "nguyen_to_cung_nhau", ten: "Nguyên tố cùng nhau (ƯCLN = 1)" },
  { id: "tang_dan", ten: "Tăng dần theo thứ tự lấy" },
  { id: "giam_dan", ten: "Giảm dần theo thứ tự lấy" },
];

const SO_SANH: { id: Extract<BienCoBaiToan, { kieu: "dem" }>["so_sanh"]; ten: string }[] = [
  { id: "bang", ten: "đúng" },
  { id: "it_nhat", ten: "ít nhất" },
  { id: "nhieu_nhat", ten: "nhiều nhất" },
  { id: "trong_doan", ten: "từ … đến …" },
  { id: "tat_ca", ten: "tất cả các vật lấy ra đều thuộc loại" },
];

type La = Exclude<BienCoBaiToan, { kieu: "gop" }>;
type KieuLa = La["kieu"];

const KIEU_LA: { id: KieuLa; ten: string }[] = [
  { id: "so", ten: "Giá trị tính từ các số (tổng, tích, hiệu …)" },
  { id: "mau", ten: "Theo màu / nhóm (ít nhất, đúng k, cùng màu …)" },
  { id: "dem", ten: "Đếm số vật thuộc một loại (ít nhất, đúng, nhiều nhất …)" },
  { id: "dem_bang", ten: "Hai loại vật có số lượng bằng nhau" },
  { id: "vi_tri", ten: "Vật được lấy ở lần thứ … (đầu tiên, cuối cùng)" },
  { id: "truoc_sau", ten: "Vật này được lấy trước vật kia" },
  { id: "dung_thu_tu", ten: "Các lần lấy đúng theo một dãy cho trước" },
  { id: "lien_tiep", ten: "Có k lần lấy liên tiếp cùng loại" },
  { id: "quan_he", ten: "Quan hệ giữa các số (bằng nhau, tăng dần …)" },
];

/** Thông tin về tập vật hiện tại, để các ô chọn biết màu và số nào đang có. */
interface Ngu {
  mau: string[];
  coMau: boolean;
  coSo: boolean;
  soDau: number;
}

function dkTuForm(f: DK): DieuKienBaiToan {
  return dieuKienTuAI({ loai: f.loai, k: f.k, k2: f.k2, m: f.m, r: f.r, d: f.d, khong: false });
}

/** Dựng lại các ô nhập từ một điều kiện đã gọn. */
const dkTuDieuKien = (dk: DieuKienBaiToan): DK => ({
  ...DK_MAC_DINH,
  loai: dk.loai,
  ...("k" in dk ? { k: dk.k } : {}),
  ...("k2" in dk ? { k2: dk.k2 } : {}),
  ...("m" in dk ? { m: dk.m, r: dk.r } : {}),
  ...("d" in dk ? { d: dk.d } : {}),
});

/** Ô chọn điều kiện trên một số và các ô tham số đi kèm. */
function ChonDieuKien({ id, gt, doi }: { id: string; gt: DK; doi: (v: DK) => void }) {
  const dat = <K extends keyof DK>(k: K, v: DK[K]) => doi({ ...gt, [k]: v });
  return (
    <>
      <select aria-label="Điều kiện" value={gt.loai} onChange={(e) => dat("loai", e.target.value as DK["loai"])}>
        {NHOM_DK.map((n) => (
          <optgroup key={n.nhom} label={n.nhom}>
            {n.ds.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ten}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {CAN_K.has(gt.loai) && (
        <OSo id={`${id}-k`} nhan="k" gt={gt.k} min={K_DUONG.has(gt.loai) ? 1 : gt.loai === "tong_chu_so" ? 0 : -999} max={999} onDoi={(v) => dat("k", v)} />
      )}
      {CAN_K2.has(gt.loai) && <OSo id={`${id}-k2`} nhan="k2" gt={gt.k2} min={-999} max={999} onDoi={(v) => dat("k2", v)} />}
      {gt.loai === "du" && (
        <>
          <OSo id={`${id}-m`} nhan="Số chia m" gt={gt.m} min={2} max={20} onDoi={(v) => dat("m", v)} />
          <OSo id={`${id}-r`} nhan="Số dư r" gt={gt.r} min={0} max={19} onDoi={(v) => dat("r", v)} />
        </>
      )}
      {CAN_D.has(gt.loai) && <OSo id={`${id}-d`} nhan="Chữ số d" gt={gt.d} min={0} max={9} onDoi={(v) => dat("d", v)} />}
    </>
  );
}

/** Như ChonDieuKien nhưng làm việc trực tiếp với điều kiện đã dựng. */
function SuaDieuKien({ id, dk, doi }: { id: string; dk: DieuKienBaiToan; doi: (dk: DieuKienBaiToan) => void }) {
  return <ChonDieuKien id={id} gt={dkTuDieuKien(dk)} doi={(v) => doi(dkTuForm(v))} />;
}

type KieuLoc = "mau" | "so" | "dk" | "mau_so";
const kieuLocCua = (l: LocVat): KieuLoc => (l.mau !== undefined && l.so !== undefined ? "mau_so" : l.mau !== undefined ? "mau" : l.so !== undefined ? "so" : "dk");

const locMacDinh = (ngu: Ngu): LocVat => (ngu.coMau ? { mau: ngu.mau[0] } : { dk: { loai: "chan" } });

/** Chọn một loại vật: theo màu, theo số cụ thể, theo điều kiện trên số, hoặc màu kèm số. */
function ChonLoaiVat({ id, gt, doi, ngu }: { id: string; gt: LocVat; doi: (l: LocVat) => void; ngu: Ngu }) {
  const kieu = kieuLocCua(gt);
  const dongDoi = (k: KieuLoc) => {
    if (k === "mau") doi({ mau: ngu.mau[0] });
    else if (k === "so") doi({ so: ngu.soDau });
    else if (k === "dk") doi({ dk: { loai: "chan" } });
    else doi({ mau: gt.mau ?? ngu.mau[0], so: gt.so ?? ngu.soDau });
  };
  return (
    <span className="hang" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
      <select aria-label="Loại vật" value={kieu} onChange={(e) => dongDoi(e.target.value as KieuLoc)}>
        {ngu.coMau && <option value="mau">vật màu / nhóm …</option>}
        {ngu.coSo && <option value="so">vật ghi số …</option>}
        {ngu.coSo && <option value="dk">vật có số thỏa điều kiện …</option>}
        {ngu.coMau && ngu.coSo && <option value="mau_so">vật màu … và ghi số …</option>}
      </select>
      {(kieu === "mau" || kieu === "mau_so") && (
        <select aria-label="Màu" value={ngu.mau.includes(gt.mau ?? "") ? gt.mau : (ngu.mau[0] ?? "")} onChange={(e) => doi({ ...gt, mau: e.target.value })}>
          {ngu.mau.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      )}
      {(kieu === "so" || kieu === "mau_so") && <OSo id={`${id}-so`} nhan="số" gt={gt.so ?? ngu.soDau} min={0} max={999} onDoi={(v) => doi({ ...gt, so: v })} />}
      {kieu === "dk" && <SuaDieuKien id={`${id}-dk`} dk={gt.dk ?? { loai: "chan" }} doi={(dk) => doi({ dk })} />}
    </span>
  );
}

/** Biến cố lá mặc định khi đổi sang một kiểu mới. */
function macDinhLa(kieu: KieuLa, ngu: Ngu, soLan: number): La {
  const loc = locMacDinh(ngu);
  switch (kieu) {
    case "so":
      return { kieu: "so", dai_luong: "tong", dieu_kien: { loai: "chan" } };
    case "mau":
      return { kieu: "mau", loai: "it_nhat", mau: ngu.mau[0] };
    case "dem":
      return { kieu: "dem", loc, so_sanh: "it_nhat", k: 1 };
    case "dem_bang":
      return { kieu: "dem_bang", a: ngu.coMau ? { mau: ngu.mau[0] } : { dk: { loai: "chan" } }, b: ngu.coMau ? { mau: ngu.mau[1] ?? ngu.mau[0] } : { dk: { loai: "le" } } };
    case "vi_tri":
      return { kieu: "vi_tri", lan: "cuoi", loc: ngu.coSo ? { so: ngu.soDau } : loc };
    case "truoc_sau":
      return { kieu: "truoc_sau", truoc: loc, sau: ngu.coMau ? { mau: ngu.mau[1] ?? ngu.mau[0] } : { dk: { loai: "le" } } };
    case "dung_thu_tu":
      return { kieu: "dung_thu_tu", day: Array.from({ length: soLan }, () => loc) };
    case "lien_tiep":
      return { kieu: "lien_tiep", loc, k: 2 };
    case "quan_he":
      return { kieu: "quan_he", loai: "khac_nhau" };
  }
}

/** Biến cố lá cuối cùng gửi vào máy đếm: bổ sung màu còn thiếu, cắt hoặc kéo dài dãy cho khớp số lần lấy. */
function laThanhBienCo(l: La, ngu: Ngu, soLan: number): La {
  if (l.kieu === "mau") return { ...l, mau: l.mau || ngu.mau[0] };
  if (l.kieu === "dung_thu_tu") return { ...l, day: Array.from({ length: soLan }, (_, i) => l.day[i] ?? locMacDinh(ngu)) };
  return l;
}

/** Các ô sửa một biến cố lá (đã gồm ô "không" và ô chọn kiểu). */
function SuaBienCo({ id, la, doi, ngu, soLan, tv }: { id: string; la: La; doi: (l: La) => void; ngu: Ngu; soLan: number; tv: string }) {
  const kieuDung = (k: KieuLa) => {
    if (k === "so") return ngu.coSo;
    if (k === "mau") return ngu.coMau;
    if (k === "quan_he") return ngu.coSo && soLan >= 2;
    if (k === "truoc_sau" || k === "lien_tiep") return soLan >= 2;
    return true;
  };
  const khong = la.khong ?? false;
  const dem = (k: number, f: (v: number) => void, nhan: string) => <OSo id={`${id}-n`} nhan={nhan} gt={k} min={0} max={4} onDoi={f} />;
  return (
    <div className="hang" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
      <label className="hang" style={{ gap: "0.3rem", margin: 0 }}>
        <input type="checkbox" checked={khong} onChange={(e) => doi({ ...la, khong: e.target.checked })} /> không
      </label>
      <select aria-label="Loại điều kiện" value={la.kieu} onChange={(e) => doi({ ...macDinhLa(e.target.value as KieuLa, ngu, soLan), ...(khong ? { khong: true } : {}) })}>
        {KIEU_LA.filter((k) => kieuDung(k.id) || k.id === la.kieu).map((k) => (
          <option key={k.id} value={k.id}>
            {k.ten}
          </option>
        ))}
      </select>
      {la.kieu === "so" && (
        <>
          {soLan > 1 && (
            <select aria-label="Đại lượng" value={la.dai_luong} onChange={(e) => doi({ ...la, dai_luong: e.target.value as DaiLuongBaiToan })}>
              {DAI_LUONG.filter((d) => d.can(soLan) || d.id === la.dai_luong).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ten}
                </option>
              ))}
            </select>
          )}
          <SuaDieuKien id={id} dk={la.dieu_kien} doi={(dieu_kien) => doi({ ...la, dieu_kien })} />
        </>
      )}
      {la.kieu === "mau" && (
        <>
          <select aria-label="Biến cố theo màu" value={la.loai} onChange={(e) => doi({ ...la, loai: e.target.value as typeof la.loai })}>
            {MAU_LOAI.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ten}
              </option>
            ))}
          </select>
          {(la.loai === "it_nhat" || la.loai === "dung") && (
            <select aria-label="Màu cần xét" value={ngu.mau.includes(la.mau ?? "") ? la.mau : (ngu.mau[0] ?? "")} onChange={(e) => doi({ ...la, mau: e.target.value })}>
              {ngu.mau.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          {la.loai === "dung" && <OSo id={`${id}-kmau`} nhan="Số vật màu đó (k)" gt={la.k ?? 1} min={0} max={4} onDoi={(k) => doi({ ...la, k })} />}
        </>
      )}
      {la.kieu === "quan_he" && (
        <select aria-label="Quan hệ giữa các số" value={la.loai} onChange={(e) => doi({ ...la, loai: e.target.value as typeof la.loai })}>
          {QUAN_HE.map((d) => (
            <option key={d.id} value={d.id}>
              {d.ten}
            </option>
          ))}
        </select>
      )}
      {la.kieu === "dem" && (
        <>
          <span>Có</span>
          <select aria-label="So sánh số lượng" value={la.so_sanh} onChange={(e) => doi({ ...la, so_sanh: e.target.value as typeof la.so_sanh, ...(e.target.value === "trong_doan" ? { k2: Math.max(la.k, la.k2 ?? la.k) } : {}) })}>
            {SO_SANH.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ten}
              </option>
            ))}
          </select>
          {la.so_sanh !== "tat_ca" && dem(la.k, (k) => doi({ ...la, k, ...(la.so_sanh === "trong_doan" ? { k2: Math.max(k, la.k2 ?? k) } : {}) }), la.so_sanh === "trong_doan" ? "từ" : "k")}
          {la.so_sanh === "trong_doan" && <OSo id={`${id}-n2`} nhan="đến" gt={la.k2 ?? la.k} min={la.k} max={4} onDoi={(k2) => doi({ ...la, k2 })} />}
          <ChonLoaiVat id={`${id}-loc`} gt={la.loc} doi={(loc) => doi({ ...la, loc })} ngu={ngu} />
        </>
      )}
      {la.kieu === "dem_bang" && (
        <>
          <span>Số</span>
          <ChonLoaiVat id={`${id}-a`} gt={la.a} doi={(a) => doi({ ...la, a })} ngu={ngu} />
          <span>bằng số</span>
          <ChonLoaiVat id={`${id}-b`} gt={la.b} doi={(b) => doi({ ...la, b })} ngu={ngu} />
        </>
      )}
      {la.kieu === "vi_tri" && (
        <>
          <span>Lần lấy</span>
          <select aria-label="Lần lấy" value={String(la.lan)} onChange={(e) => doi({ ...la, lan: e.target.value === "cuoi" ? "cuoi" : Number(e.target.value) })}>
            {Array.from({ length: soLan }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i === 0 ? "đầu tiên (lần 1)" : `lần thứ ${i + 1}`}
              </option>
            ))}
            <option value="cuoi">cuối cùng</option>
          </select>
          <span>ra</span>
          <ChonLoaiVat id={`${id}-loc`} gt={la.loc} doi={(loc) => doi({ ...la, loc })} ngu={ngu} />
        </>
      )}
      {la.kieu === "truoc_sau" && (
        <>
          <ChonLoaiVat id={`${id}-truoc`} gt={la.truoc} doi={(truoc) => doi({ ...la, truoc })} ngu={ngu} />
          <strong>được lấy TRƯỚC</strong>
          <ChonLoaiVat id={`${id}-sau`} gt={la.sau} doi={(sau) => doi({ ...la, sau })} ngu={ngu} />
        </>
      )}
      {la.kieu === "dung_thu_tu" && (
        <div style={{ width: "100%" }}>
          <div className="muted">Các {tv} lấy ra phải đúng thứ tự sau (mỗi lần lấy một loại):</div>
          {laThanhBienCo(la, ngu, soLan).kieu === "dung_thu_tu" &&
            (laThanhBienCo(la, ngu, soLan) as Extract<La, { kieu: "dung_thu_tu" }>).day.map((l, i) => (
              <div key={i} className="hang" style={{ gap: "0.4rem", marginTop: "0.3rem" }}>
                <span>Lần {i + 1}:</span>
                <ChonLoaiVat id={`${id}-day-${i}`} gt={l} doi={(v) => doi({ ...la, day: (laThanhBienCo(la, ngu, soLan) as Extract<La, { kieu: "dung_thu_tu" }>).day.map((x, j) => (j === i ? v : x)) })} ngu={ngu} />
              </div>
            ))}
        </div>
      )}
      {la.kieu === "lien_tiep" && (
        <>
          <OSo id={`${id}-k`} nhan="Có ít nhất" gt={la.k} min={2} max={Math.max(2, soLan)} onDoi={(k) => doi({ ...la, k })} />
          <span>lần lấy liên tiếp ra</span>
          <ChonLoaiVat id={`${id}-loc`} gt={la.loc} doi={(loc) => doi({ ...la, loc })} ngu={ngu} />
        </>
      )}
    </div>
  );
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
  phep?: "va" | "hoac" | "xor";
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
    la: [{ kieu: "so", dai_luong: "tong", dieu_kien: { loai: "chinh_phuong" } }],
    de: "Viết một số tự nhiên lẻ có 2 chữ số bất kỳ. Tính xác suất của biến cố “Số tự nhiên viết ra là một số chính phương”.",
  },
  {
    ten: "Số 2 chữ số: chia hết cho 3 hoặc 5",
    nguon: { kieu: "day_so", tu: 10, den: 99, buoc: 1, loc: [] },
    ten_vat: "số",
    so_lan: 1,
    hoan_lai: false,
    la: [
      { kieu: "so", dai_luong: "tong", dieu_kien: { loai: "chia_het", k: 3 } },
      { kieu: "so", dai_luong: "tong", dieu_kien: { loai: "chia_het", k: 5 } },
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
    la: [{ kieu: "so", dai_luong: "tong", dieu_kien: { loai: "le" } }],
    de: "Một túi đựng 4 viên bi đánh số 1; 2; 3; 4. Lấy ngẫu nhiên lần lượt 2 viên bi, viên bi lấy ra lần đầu không trả lại vào túi. Xác suất lấy được hai viên bi có tổng hai số là một số lẻ là:",
  },
  {
    ten: "Nhóm 3 nam 4 nữ: ít nhất một nữ",
    nguon: { kieu: "theo_mau", nhom: "nam 3, nữ 4" },
    ten_vat: "học sinh",
    so_lan: 2,
    hoan_lai: false,
    la: [{ kieu: "mau", loai: "it_nhat", mau: "nữ" }],
    de: "Một nhóm học sinh gồm 3 học sinh nam, 4 học sinh nữ. Chọn ngẫu nhiên hai học sinh. Tính xác suất để có ít nhất một bạn nữ.",
  },
  {
    ten: "Thẻ 6, 7, 8: thẻ số 8 lấy cuối cùng",
    nguon: { kieu: "ds_so", text: "6 7 8" },
    ten_vat: "thẻ",
    so_lan: 3,
    hoan_lai: false,
    la: [{ kieu: "vi_tri", lan: "cuoi", loc: { so: 8 } }],
    de: "Một hộp chứa 3 tấm thẻ cùng loại được đánh số lần lượt từ 6; 7; 8. Bạn Việt lấy lần lượt 3 tấm thẻ từ hộp một cách ngẫu nhiên. Tấm thẻ lấy ra không được trả lại hộp. Tính xác suất của biến cố A: “Tấm thẻ đánh số 8 được lấy cuối cùng”.",
  },
  {
    ten: "Thẻ 6, 7, 8: 6 lấy trước 8",
    nguon: { kieu: "ds_so", text: "6 7 8" },
    ten_vat: "thẻ",
    so_lan: 3,
    hoan_lai: false,
    la: [{ kieu: "truoc_sau", truoc: { so: 6 }, sau: { so: 8 } }],
    de: "Một hộp chứa 3 tấm thẻ đánh số 6; 7; 8. Lấy lần lượt 3 tấm thẻ không trả lại. Tính xác suất để thẻ số 6 được lấy trước thẻ số 8.",
  },
  {
    ten: "2 xúc xắc: tổng từ 5 đến 9",
    nguon: { kieu: "danh_so", n: 6 },
    ten_vat: "mặt xúc xắc",
    so_lan: 2,
    hoan_lai: true,
    la: [{ kieu: "so", dai_luong: "tong", dieu_kien: { loai: "trong_doan", k: 5, k2: 9 } }],
    de: "Gieo hai con xúc xắc cân đối. Tính xác suất để tổng số chấm nằm trong khoảng từ 5 đến 9.",
  },
  {
    ten: "2 xúc xắc: hiệu hai số bằng 2",
    nguon: { kieu: "danh_so", n: 6 },
    ten_vat: "mặt xúc xắc",
    so_lan: 2,
    hoan_lai: true,
    la: [{ kieu: "so", dai_luong: "hieu_tuyet_doi", dieu_kien: { loai: "bang", k: 2 } }],
    de: "Gieo hai con xúc xắc cân đối. Tính xác suất để hiệu hai số chấm (số lớn trừ số bé) bằng 2.",
  },
  {
    ten: "Đồng xu 3 lần: 2 lần liên tiếp ngửa",
    nguon: { kieu: "theo_mau", nhom: "ngửa 1, sấp 1" },
    ten_vat: "mặt đồng xu",
    so_lan: 3,
    hoan_lai: true,
    la: [{ kieu: "lien_tiep", loc: { mau: "ngửa" }, k: 2 }],
    de: "Tung một đồng xu cân đối 3 lần. Tính xác suất để có hai lần liên tiếp xuất hiện mặt ngửa.",
  },
  {
    ten: "Thẻ 1–5, lấy 3: ít nhất 2 số chẵn",
    nguon: { kieu: "danh_so", n: 5 },
    ten_vat: "thẻ",
    so_lan: 3,
    hoan_lai: false,
    la: [{ kieu: "dem", loc: { dk: { loai: "chan" } }, so_sanh: "it_nhat", k: 2 }],
    de: "Một hộp có 5 thẻ đánh số từ 1 đến 5. Lấy lần lượt 3 thẻ không trả lại. Tính xác suất để có ít nhất 2 thẻ mang số chẵn.",
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
  const [phep, setPhep] = useState<"va" | "hoac" | "xor">("va");
  const [phuDinh, setPhuDinh] = useState(false);
  const [de, setDe] = useState(MAU[0]!.de);
  const [tieuDe, setTieuDe] = useState("");
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [daLuu, setDaLuu] = useState<string | null>(null);
  const [dangDoc, setDangDoc] = useState(false);
  const [ghiChuAI, setGhiChuAI] = useState<{ khop: boolean; ly_do: string; mo_ho: string | null } | null>(null);
  const [dapAn, setDapAn] = useState("");

  function apDungAI(d: DocDeMo) {
    const nguonMoi = nguonTuAI(d);
    setNguon(nguonMoi);
    setTenVat(d.ten_vat || "vật");
    setSoLan(Math.min(4, Math.max(1, d.so_lan)));
    setHoanLai(d.hoan_lai);
    if (d.bien_co.length) {
      const v = taoVatTuNguon(nguonMoi);
      const mauDau = "vat" in v ? (v.vat.find((x) => x.mau !== undefined)?.mau ?? "") : "";
      setCacLa(d.bien_co.map((b) => bienCoTuAI(b, mauDau) as La));
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
      setGhiChuAI({ khop: d.khop, ly_do: d.ly_do, mo_ho: d.mo_ho });
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
  const ngu: Ngu = useMemo(() => {
    const ds = "vat" in vat ? vat.vat : [];
    return {
      mau: [...new Set(ds.map((x) => x.mau).filter((m): m is string => !!m))],
      coMau: ds.some((v) => v.mau !== undefined),
      coSo: ds.some((v) => v.so !== undefined),
      soDau: ds.find((v) => v.so !== undefined)?.so ?? 1,
    };
  }, [vat]);
  const { coSo, coMau } = ngu;

  const form: FormMo = useMemo(() => {
    const cac = cacLa.map((l) => laThanhBienCo(l, ngu, soLan));
    const bien_co: BienCoBaiToan = cac.length === 1 ? cac[0]! : { kieu: "gop", phep, cac };
    return { nguon, ten_vat: tenVat, so_lan: soLan, hoan_lai: hoanLai, bien_co, phu_dinh: phuDinh };
  }, [nguon, tenVat, soLan, hoanLai, cacLa, phep, phuDinh, ngu]);

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

  const datLa = (i: number, l: La) => setCacLa((a) => a.map((x, j) => (j === i ? l : x)));
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
          <NutAnhDe
            disabled={!aiBat}
            onLoi={setLoi}
            onChu={(chu) => {
              setDe(chu);
              setGhiChuAI(null);
              setDaLuu(null);
            }}
          />
          {aiBat && <span className="muted">Có thể dán ảnh bằng Ctrl+V. Sau khi ảnh được đọc, hãy kiểm tra chữ trong ô đề rồi bấm “AI đọc đề”.</span>}
          {!aiBat && <span className="muted">AI chưa bật, hãy chọn mẫu hoặc tự điền các khối.</span>}
        </div>
        {loi && <div className="thong-bao loi" style={{ marginTop: "0.6rem" }}>{loi}</div>}
        {ghiChuAI && (
          <div className={`thong-bao ${ghiChuAI.khop ? "tin" : "canh-bao"}`} style={{ marginTop: "0.6rem" }}>
            {ghiChuAI.khop ? "AI hiểu đề như sau: " : "Đề này có thể chưa khớp các khối hiện có. "}
            {ghiChuAI.ly_do} <strong>Hãy kiểm tra lại các ô bên dưới và đối chiếu với đề.</strong>
          </div>
        )}
        {ghiChuAI?.mo_ho && (
          <div className="thong-bao canh-bao" style={{ marginTop: "0.6rem" }}>
            <strong>Đề có thể hiểu theo nhiều cách:</strong> {ghiChuAI.mo_ho} Hãy chọn đúng cách hiểu ở các ô bên dưới trước khi tin kết quả.
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
                <button type="button" className={phep === "xor" ? "dang-chon" : ""} onClick={() => setPhep("xor")}>
                  CHỈ MỘT (hoặc loại trừ)
                </button>
              </div>
            )}
            <SuaBienCo id={`bm-bc-${i}`} la={l} doi={(v) => datLa(i, v)} ngu={ngu} soLan={soLan} tv={tv} />
            {cacLa.length > 1 && (
              <button type="button" className="phu nho" style={{ marginTop: "0.4rem" }} onClick={() => setCacLa((a) => a.filter((_, j) => j !== i))}>
                Bỏ điều kiện này
              </button>
            )}
          </div>
        ))}
        {cacLa.length < 6 && (
          <button type="button" className="phu" style={{ marginTop: "0.6rem" }} onClick={() => setCacLa((a) => [...a, macDinhLa(coSo ? "so" : coMau ? "mau" : "dem", ngu, soLan)])}>
            + Thêm điều kiện (ghép bằng và / hoặc / chỉ một)
          </button>
        )}
        <label className="hang" style={{ margin: "0.8rem 0 0", gap: "0.4rem", fontWeight: 600 }}>
          <input type="checkbox" style={{ width: "1.1rem", height: "1.1rem" }} checked={phuDinh} onChange={(e) => setPhuDinh(e.target.checked)} />
          Đề hỏi biến cố NGƯỢC LẠI (xác suất để cả biến cố trên KHÔNG xảy ra)
        </label>
        <div className="muted" style={{ marginTop: "0.3rem" }}>
          Ô “không” ở đầu mỗi điều kiện chỉ đảo điều kiện đó; ô này đảo cả nhóm đã ghép. “Không phải cả hai” khác “cả hai đều không”.
        </div>
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
            {(tinh.gs.thoa === 0 || tinh.gs.thoa === tinh.gs.tong) && (
              <div className="thong-bao canh-bao" style={{ marginTop: "0.6rem" }}>
                <strong>Kết quả bất thường:</strong> xác suất bằng {tinh.gs.thoa === 0 ? "0 (biến cố không thể xảy ra)" : "1 (biến cố chắc chắn xảy ra)"}. Nếu đề không nói như vậy, hãy kiểm tra lại biến cố ở mục 3. Ví dụ: “thẻ số 8 được lấy cuối cùng” phải chọn “Vật được lấy ở lần thứ …”, không phải “tổng bằng 8”.
              </div>
            )}
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
