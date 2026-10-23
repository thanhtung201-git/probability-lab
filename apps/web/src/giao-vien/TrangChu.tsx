import { useState } from "react";
import type { ThuVien } from "../App";
import { docTapSo } from "@plab/core";
import { api, type BienCoGui, type DeBaiTuNhap, type KieuThiNghiem } from "../api";
import { luuGhiChuPhien } from "../mo-ta-che-do";

const KHOA_GAN_DAY = "plab.phien_gan_day";

export function luuPhienGanDay(ma: string) {
  try {
    const ds: string[] = JSON.parse(localStorage.getItem(KHOA_GAN_DAY) ?? "[]");
    localStorage.setItem(KHOA_GAN_DAY, JSON.stringify([ma, ...ds.filter((m) => m !== ma)].slice(0, 5)));
  } catch {
    /* trình duyệt chặn lưu trữ: bỏ qua */
  }
}

function docPhienGanDay(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KHOA_GAN_DAY) ?? "[]");
  } catch {
    return [];
  }
}

export type Vat = "xuc_xac" | "dong_xu" | "bi" | "the";

export const VAT: { id: Vat; ten: string; bieuTuong: string; vatDeBai: string }[] = [
  { id: "xuc_xac", ten: "Xúc xắc", bieuTuong: "🎲", vatDeBai: "xúc xắc" },
  { id: "dong_xu", ten: "Đồng xu", bieuTuong: "🪙", vatDeBai: "đồng xu" },
  { id: "bi", ten: "Hộp bi", bieuTuong: "🔴", vatDeBai: "hộp bi" },
  { id: "the", ten: "Thẻ số", bieuTuong: "🔢", vatDeBai: "thẻ số" },
];

const AI_MO_TA = "AI đọc đề bài và chọn thí nghiệm phù hợp (cần bật Groq)";

const KIEU: Record<Vat, { id: KieuThiNghiem; ten: string; mo_ta: string }[]> = {
  xuc_xac: [
    { id: "tu_dong", ten: "Để AI chọn theo đề", mo_ta: AI_MO_TA },
    { id: "mot_con", ten: "Gieo 1 con xúc xắc", mo_ta: "Đếm từng mặt, hợp với đề hỏi về một mặt hoặc xúc xắc có bị lệch" },
    { id: "hai_con", ten: "Gieo 2 con, tính tổng", mo_ta: "Hợp với đề hỏi về tổng số chấm của hai con" },
    { id: "dieu_kien", ten: "Sau k lần không ra một mặt", mo_ta: "Hợp với đề hỏi “nhiều lần chưa ra thì lần sau có dễ ra hơn không”" },
    { id: "day", ten: "So sánh hai dãy kết quả", mo_ta: "Hợp với đề hỏi dãy nào dễ xuất hiện hơn, ví dụ 6-6-6 và 2-5-3" },
  ],
  dong_xu: [
    { id: "tu_dong", ten: "Để AI chọn theo đề", mo_ta: "AI đọc đề bài, chọn xúc xắc hay đồng xu và kiểu thí nghiệm phù hợp (cần bật Groq)" },
    { id: "mot_con", ten: "Tung 1 đồng xu", mo_ta: "Đếm ngửa và sấp, hợp với đề hỏi đồng xu có bị lệch không" },
    { id: "hai_con", ten: "Tung 2 đồng xu, đếm mặt ngửa", mo_ta: "Hợp với đề hỏi về 0, 1 hoặc 2 mặt ngửa" },
    { id: "dieu_kien", ten: "Sau k lần liên tiếp cùng một mặt", mo_ta: "Hợp với đề hỏi “đã nhiều lần ngửa rồi, lần sau có dễ ra sấp hơn không”" },
    { id: "day", ten: "So sánh hai dãy kết quả", mo_ta: "Hợp với đề hỏi dãy nào dễ xuất hiện hơn, ví dụ NNNNNN và NSNSSN" },
  ],
  bi: [
    { id: "tu_dong", ten: "Để AI chọn theo đề", mo_ta: "AI chưa tự chọn thí nghiệm cho hộp bi, hãy chọn một kiểu bên dưới" },
    { id: "mot_con", ten: "Lấy 1 bi", mo_ta: "Hợp với đề hỏi xác suất lấy được một màu, hoặc “có 2 màu nên mỗi màu 1/2”" },
    { id: "hai_con", ten: "Lấy 2 bi, đếm số bi một màu", mo_ta: "Hợp với đề lấy 2 bi liên tiếp; chọn có hoặc không hoàn lại" },
    { id: "dieu_kien", ten: "Sau k lần liên tiếp cùng một màu", mo_ta: "Có hoàn lại; hợp với đề “nhiều lần ra màu này rồi, lần sau có khác đi không”" },
  ],
  the: [
    { id: "tu_dong", ten: "Để AI chọn theo đề", mo_ta: "AI chưa tự chọn thí nghiệm cho thẻ số, hãy chọn một kiểu bên dưới" },
    { id: "bien_co", ten: "Rút 1 thẻ, theo biến cố", mo_ta: "Hợp với đề tính xác suất của một biến cố, ví dụ “số chia hết cho 3”" },
    { id: "mot_con", ten: "Rút 1 thẻ, theo từng số", mo_ta: "Hợp với đề hỏi thẻ nào dễ rút hơn, ví dụ “thẻ số 10 khó rút hơn”" },
    { id: "hai_con", ten: "Rút 2 thẻ, đếm số thẻ thỏa biến cố", mo_ta: "Hợp với đề rút 2 thẻ liên tiếp; chọn có hoặc không hoàn lại" },
  ],
};

const BIEN_CO: { kieu: BienCoGui["kieu"]; ten: string; coK: boolean; kMacDinh: number }[] = [
  { kieu: "chan", ten: "Số chẵn", coK: false, kMacDinh: 3 },
  { kieu: "le", ten: "Số lẻ", coK: false, kMacDinh: 3 },
  { kieu: "boi", ten: "Bội của k", coK: true, kMacDinh: 3 },
  { kieu: "nguyen_to", ten: "Số nguyên tố", coK: false, kMacDinh: 3 },
  { kieu: "lon_hon", ten: "Lớn hơn k", coK: true, kMacDinh: 7 },
  { kieu: "nho_hon", ten: "Nhỏ hơn k", coK: true, kMacDinh: 4 },
  { kieu: "tap_hop", ten: "Tự nhập các số", coK: false, kMacDinh: 3 },
];

/** Tên các màu trong ô mô tả hộp bi, để làm danh sách chọn màu theo dõi. */
function tenMauTrongHop(hop: string): string[] {
  return hop
    .split(/[,;]/)
    .map((p) => p.trim().match(/^(.+?)\s+\d+$/)?.[1]?.trim())
    .filter((t): t is string => !!t);
}

/** Giá trị điền sẵn cho biểu mẫu (dùng cho các bài mẫu); đổi `key` của biểu mẫu để áp dụng lại. */
export interface KhoiTaoForm {
  tieuDe?: string;
  noiDung?: string;
  kieu?: KieuThiNghiem;
  hop?: string;
  mau?: string;
  hoanLai?: boolean;
  suKienBi?: "it_nhat" | "cung_mau" | "khac_mau";
}

/**
 * Biểu mẫu nhập đề bài. Mặc định mở phiên ngay; với `luu` thì lưu bài vào thư viện để dùng lại
 * (gọi `onDaLuu` sau khi lưu xong).
 */
export function FormTuNhap({
  aiBat,
  vat,
  onDoiVat,
  luu = false,
  onDaLuu,
  khoiTao,
}: {
  aiBat: boolean;
  vat: Vat;
  onDoiVat: (v: Vat) => void;
  luu?: boolean;
  onDaLuu?: () => void;
  khoiTao?: KhoiTaoForm;
}) {
  const [tieuDe, setTieuDe] = useState(khoiTao?.tieuDe ?? "");
  const [noiDung, setNoiDung] = useState(khoiTao?.noiDung ?? "");
  const [kieu, setKieu] = useState<KieuThiNghiem>(khoiTao?.kieu ?? (aiBat ? "tu_dong" : "hai_con"));
  const [soLanTruoc, setSoLanTruoc] = useState("5");
  const [mat, setMat] = useState("6");
  const [matXu, setMatXu] = useState<"N" | "S">("N");
  const [dayA, setDayA] = useState("6-6-6");
  const [dayB, setDayB] = useState("2-5-3");
  const [theoDoi, setTheoDoi] = useState("");
  // Hộp bi
  const [hop, setHop] = useState(khoiTao?.hop ?? "đỏ 3, xanh 2");
  const [mau, setMau] = useState(khoiTao?.mau ?? "");
  const [hoanLai, setHoanLai] = useState(khoiTao?.hoanLai ?? false);
  const [suKienBi, setSuKienBi] = useState<"" | "it_nhat" | "cung_mau" | "khac_mau">(khoiTao?.suKienBi ?? "");
  // Thẻ số
  const [soThe, setSoThe] = useState("10");
  const [kieuBienCo, setKieuBienCo] = useState<BienCoGui["kieu"]>("boi");
  const [kBienCo, setKBienCo] = useState("3");
  const [tapSo, setTapSo] = useState("2, 3, 5, 7");
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [daLuu, setDaLuu] = useState<string | null>(null);

  function doiVat(v: Vat) {
    onDoiVat(v);
    // Các kiểu có ý nghĩa riêng theo từng vật nên đưa về mặc định hợp lý khi đổi vật.
    const macDinh: KieuThiNghiem = v === "the" ? "bien_co" : v === "bi" ? "mot_con" : aiBat && (v === "xuc_xac" || v === "dong_xu") ? "tu_dong" : "hai_con";
    setKieu(macDinh);
    setTheoDoi("");
    setSoLanTruoc(v === "bi" ? "4" : "5");
    if (v === "dong_xu") {
      setDayA("NNNNNN");
      setDayB("NSNSSN");
    } else {
      setDayA("6-6-6");
      setDayB("2-5-3");
    }
  }

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    if (noiDung.trim().length < 10) {
      setLoi("Hãy nhập đề bài (ít nhất vài từ).");
      return;
    }
    const deBai: DeBaiTuNhap = { noi_dung: noiDung.trim(), kieu, vat };
    if (tieuDe.trim()) deBai.tieu_de = tieuDe.trim();

    if (vat === "bi") {
      deBai.hop = hop;
      const mauChon = mau || tenMauTrongHop(hop)[0];
      if (mauChon) deBai.mau = mauChon;
      if (kieu === "hai_con") deBai.hoan_lai = hoanLai;
      if (kieu === "hai_con" && suKienBi) deBai.su_kien = suKienBi;
      if (kieu === "dieu_kien") deBai.so_lan_truoc = Number(soLanTruoc);
    } else if (vat === "the") {
      deBai.so_the = Number(soThe);
      const mo = BIEN_CO.find((b) => b.kieu === kieuBienCo)!;
      if (kieuBienCo === "tap_hop") {
        const ds = docTapSo(tapSo);
        if (!ds) {
          setLoi("Biến cố tự chọn: gõ các số từ 1 đến 20, ví dụ “2, 5, 7” hoặc “1-4, 9”");
          return;
        }
        deBai.bien_co = { kieu: "tap_hop", so: ds };
      } else {
        deBai.bien_co = mo.coK ? { kieu: kieuBienCo, k: Number(kBienCo) } : { kieu: kieuBienCo };
      }
      if (kieu === "hai_con") deBai.hoan_lai = hoanLai;
      if (kieu === "mot_con" && theoDoi.trim()) deBai.theo_doi = theoDoi;
    } else {
      if (kieu === "dieu_kien") {
        deBai.so_lan_truoc = Number(soLanTruoc);
        if (vat === "xuc_xac") deBai.mat = Number(mat);
        else deBai.mat_xu = matXu;
      }
      if (kieu === "day") {
        deBai.day_a = dayA;
        deBai.day_b = dayB;
      }
      if (kieu === "hai_con" && theoDoi.trim()) deBai.theo_doi = theoDoi;
      if (kieu === "mot_con" && vat === "xuc_xac" && theoDoi.trim()) deBai.theo_doi = theoDoi;
    }

    setDang(true);
    setLoi(null);
    setDaLuu(null);
    try {
      if (luu) {
        const kq = await api.luuBai(deBai);
        setDaLuu(kq.tinh_huong.tieu_de);
        setDang(false);
        setNoiDung("");
        setTieuDe("");
        onDaLuu?.();
        return;
      }
      const kq = await api.taoPhienTuNhap(deBai);
      luuPhienGanDay(kq.id);
      luuGhiChuPhien(kq.id, { nguon: kq.nguon, ly_do: kq.ly_do, canh_bao: kq.canh_bao });
      window.location.hash = `#/phien/${kq.id}`;
    } catch (err) {
      setLoi((err as Error).message);
      setDang(false);
    }
  }

  const ds = KIEU[vat];
  const kieuHienTai = ds.find((k) => k.id === kieu);
  const moTaKieu = kieuHienTai?.mo_ta ?? "";
  const soNho = { width: 90 };
  const thongTinVat = VAT.find((v) => v.id === vat)!;
  const aiDung = (k: KieuThiNghiem) => k !== "tu_dong" || ((vat === "xuc_xac" || vat === "dong_xu") && aiBat);
  const dsMau = tenMauTrongHop(hop);
  const moBienCo = BIEN_CO.find((b) => b.kieu === kieuBienCo)!;

  const placeholderDe: Record<Vat, string> = {
    xuc_xac: "Ví dụ: Gieo đồng thời hai con xúc xắc cân đối. Theo em, tổng bằng 8 hay tổng bằng 9 dễ xuất hiện hơn? Vì sao?",
    dong_xu: "Ví dụ: Tung đồng thời hai đồng xu cân đối. Theo em, khả năng có đúng một mặt ngửa là bao nhiêu? Vì sao?",
    bi: "Ví dụ: Hộp có 3 bi đỏ và 2 bi xanh. Lấy ngẫu nhiên lần lượt 2 bi không bỏ lại. Tính xác suất để cả hai bi đều đỏ.",
    the: "Ví dụ: Có 10 thẻ ghi các số từ 1 đến 10. Rút ngẫu nhiên 1 thẻ. Tính xác suất để thẻ rút được ghi số nguyên tố.",
  };

  return (
    <form className="the" onSubmit={gui}>
      <h2>{luu ? "Soạn bài toán mới" : "Tự nhập đề bài"}</h2>
      <p className="muted">
        {luu
          ? "Gõ đề toán, chọn vật và kiểu thí nghiệm rồi lưu. Bài đã lưu xuất hiện trong danh sách bài có sẵn ở tab “Tiết học với AI” để mở phiên bất cứ lúc nào."
          : "Gõ đề toán của bạn, chọn vật thí nghiệm rồi chọn kiểu thí nghiệm để nhóm kiểm chứng. Hỗ trợ xúc xắc, đồng xu, hộp bi và thẻ số."}
      </p>

      <div className="truong">
        <label>Vật thí nghiệm</label>
        <div className="vien">
          {VAT.map((v) => (
            <button key={v.id} type="button" className={vat === v.id ? "dang-chon" : "phu"} onClick={() => doiVat(v.id)}>
              {v.bieuTuong} {v.ten}
            </button>
          ))}
        </div>
      </div>

      <div className="truong">
        <label htmlFor="de-bai">Đề bài</label>
        <textarea
          id="de-bai"
          placeholder={placeholderDe[vat]}
          value={noiDung}
          onChange={(e) => {
            setNoiDung(e.target.value);
            setLoi(null);
          }}
          maxLength={1500}
        />
      </div>

      <div className="luoi-2">
        <div className="truong">
          <label htmlFor="tieu-de">Tên bài (không bắt buộc)</label>
          <input id="tieu-de" placeholder="Ví dụ: Tổng 8 hay tổng 9?" value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} maxLength={80} />
        </div>
        <div className="truong">
          <label htmlFor="kieu">Kiểu thí nghiệm</label>
          <select id="kieu" style={{ width: "100%" }} value={kieu} onChange={(e) => setKieu(e.target.value as KieuThiNghiem)}>
            {ds.map((k) => (
              <option key={k.id} value={k.id} disabled={k.id === "tu_dong" && !aiDung(k.id)}>
                {k.ten}
                {k.id === "tu_dong" && !aiDung(k.id) ? (vat === "bi" || vat === "the" ? " (chưa hỗ trợ)" : " (AI chưa bật)") : ""}
              </option>
            ))}
          </select>
          <div className="muted" style={{ marginTop: "0.3rem" }}>{moTaKieu}</div>
        </div>
      </div>

      {/* Xúc xắc và đồng xu: giá trị cần theo dõi */}
      {(vat === "xuc_xac" || vat === "dong_xu") && ((kieu === "mot_con" && vat === "xuc_xac") || kieu === "hai_con") && (
        <div className="truong">
          <label htmlFor="theo-doi">
            {vat === "dong_xu" ? "Số mặt ngửa cần theo dõi" : kieu === "mot_con" ? "Mặt cần theo dõi" : "Tổng cần theo dõi"} (không bắt buộc)
          </label>
          <input
            id="theo-doi"
            style={{ maxWidth: 260 }}
            placeholder={vat === "dong_xu" ? "Ví dụ: 1  hoặc  0, 2" : kieu === "mot_con" ? "Ví dụ: 1  hoặc  3, 6" : "Ví dụ: 8, 9"}
            value={theoDoi}
            onChange={(e) => setTheoDoi(e.target.value)}
          />
          <div className="muted" style={{ marginTop: "0.3rem" }}>Các giá trị này được tô nổi trên biểu đồ. Để trống thì dùng giá trị mặc định.</div>
        </div>
      )}

      {kieu === "dieu_kien" && vat === "xuc_xac" && (
        <div className="hang truong">
          <span>Sau</span>
          <input aria-label="Số lần liên tiếp" style={soNho} type="number" min={1} max={6} value={soLanTruoc} onChange={(e) => setSoLanTruoc(e.target.value)} />
          <span>lần liên tiếp không ra mặt</span>
          <input aria-label="Mặt xúc xắc" style={soNho} type="number" min={1} max={6} value={mat} onChange={(e) => setMat(e.target.value)} />
        </div>
      )}

      {kieu === "dieu_kien" && vat === "dong_xu" && (
        <div className="hang truong">
          <span>Sau</span>
          <input aria-label="Số lần liên tiếp" style={soNho} type="number" min={1} max={8} value={soLanTruoc} onChange={(e) => setSoLanTruoc(e.target.value)} />
          <span>lần liên tiếp cùng ra</span>
          <select aria-label="Mặt đồng xu" style={{ width: 110 }} value={matXu} onChange={(e) => setMatXu(e.target.value as "N" | "S")}>
            <option value="N">ngửa</option>
            <option value="S">sấp</option>
          </select>
        </div>
      )}

      {kieu === "day" && (vat === "xuc_xac" || vat === "dong_xu") && (
        <div className="hang truong">
          <span>Dãy thứ nhất</span>
          <input aria-label="Dãy thứ nhất" style={{ width: 150 }} placeholder={vat === "dong_xu" ? "NNNNNN" : "6-6-6"} value={dayA} onChange={(e) => setDayA(e.target.value)} />
          <span>so với dãy thứ hai</span>
          <input aria-label="Dãy thứ hai" style={{ width: 150 }} placeholder={vat === "dong_xu" ? "NSNSSN" : "2-5-3"} value={dayB} onChange={(e) => setDayB(e.target.value)} />
          <span className="muted">{vat === "dong_xu" ? "(cùng độ dài; N là ngửa, S là sấp)" : "(cùng độ dài, mỗi số từ 1 đến 6)"}</span>
        </div>
      )}

      {/* Hộp bi */}
      {vat === "bi" && (
        <>
          <div className="truong">
            <label htmlFor="hop-bi">Trong hộp có</label>
            <input id="hop-bi" style={{ maxWidth: 420 }} placeholder="đỏ 3, xanh 2" value={hop} onChange={(e) => setHop(e.target.value)} />
            <div className="muted" style={{ marginTop: "0.3rem" }}>Viết dạng “màu số”, cách nhau bằng dấu phẩy. Từ 2 đến 6 màu, tối đa 30 bi.</div>
          </div>
          <div className="hang truong">
            <label htmlFor="mau-bi" style={{ margin: 0 }}>
              {kieu === "dieu_kien" ? "Màu lặp lại" : kieu === "hai_con" ? "Màu cần đếm" : "Màu cần theo dõi"}
            </label>
            <select id="mau-bi" style={{ width: 150 }} value={mau || dsMau[0] || ""} onChange={(e) => setMau(e.target.value)}>
              {dsMau.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {kieu === "hai_con" && (
              <>
                <label htmlFor="su-kien-bi" style={{ margin: 0 }}>Biến cố</label>
                <select id="su-kien-bi" style={{ width: 220 }} value={suKienBi} onChange={(e) => setSuKienBi(e.target.value as typeof suKienBi)}>
                  <option value="">Đếm số bi màu đã chọn</option>
                  <option value="it_nhat">Có ít nhất 1 bi màu đã chọn</option>
                  <option value="cung_mau">Hai bi cùng màu</option>
                  <option value="khac_mau">Hai bi khác màu</option>
                </select>
              </>
            )}
            {kieu === "hai_con" && (
              <label className="hang" style={{ margin: 0, gap: "0.4rem", fontWeight: 600 }}>
                <input type="checkbox" style={{ width: "1.1rem", height: "1.1rem" }} checked={hoanLai} onChange={(e) => setHoanLai(e.target.checked)} />
                Có hoàn lại (bỏ bi lại hộp sau mỗi lần lấy)
              </label>
            )}
            {kieu === "dieu_kien" && (
              <>
                <span>Sau</span>
                <input aria-label="Số lần liên tiếp" style={soNho} type="number" min={1} max={6} value={soLanTruoc} onChange={(e) => setSoLanTruoc(e.target.value)} />
                <span>lần liên tiếp</span>
              </>
            )}
          </div>
        </>
      )}

      {/* Thẻ số */}
      {vat === "the" && (
        <>
          <div className="hang truong">
            <label htmlFor="so-the" style={{ margin: 0 }}>Số thẻ (ghi từ 1 đến)</label>
            <input id="so-the" style={soNho} type="number" min={2} max={20} value={soThe} onChange={(e) => setSoThe(e.target.value)} />
            {kieu !== "mot_con" && (
              <>
                <label htmlFor="bien-co-the" style={{ margin: 0 }}>Biến cố</label>
                <select
                  id="bien-co-the"
                  style={{ width: 160 }}
                  value={kieuBienCo}
                  onChange={(e) => {
                    const k = e.target.value as BienCoGui["kieu"];
                    setKieuBienCo(k);
                    setKBienCo(String(BIEN_CO.find((b) => b.kieu === k)?.kMacDinh ?? 3));
                  }}
                >
                  {BIEN_CO.map((b) => (
                    <option key={b.kieu} value={b.kieu}>
                      {b.ten}
                    </option>
                  ))}
                </select>
                {kieuBienCo === "tap_hop" && <input aria-label="Các số thuận lợi" style={{ width: 160 }} value={tapSo} onChange={(e) => setTapSo(e.target.value)} placeholder="2, 3, 5, 7" />}
                {moBienCo.coK && <input aria-label="Số k" style={soNho} type="number" min={1} max={20} value={kBienCo} onChange={(e) => setKBienCo(e.target.value)} />}
              </>
            )}
            {kieu === "hai_con" && (
              <label className="hang" style={{ margin: 0, gap: "0.4rem", fontWeight: 600 }}>
                <input type="checkbox" style={{ width: "1.1rem", height: "1.1rem" }} checked={hoanLai} onChange={(e) => setHoanLai(e.target.checked)} />
                Có hoàn lại (trả thẻ về sau mỗi lần rút)
              </label>
            )}
          </div>
          {kieu === "mot_con" && (
            <div className="truong">
              <label htmlFor="theo-doi-the">Thẻ cần theo dõi (không bắt buộc)</label>
              <input id="theo-doi-the" style={{ maxWidth: 260 }} placeholder="Ví dụ: 1, 7, 10" value={theoDoi} onChange={(e) => setTheoDoi(e.target.value)} />
            </div>
          )}
        </>
      )}

      {loi && <div className="thong-bao loi">{loi}</div>}
      {daLuu && <div className="thong-bao tot">Đã lưu bài “{daLuu}”.</div>}
      <button type="submit" disabled={dang}>
        {dang
          ? kieu === "tu_dong"
            ? "AI đang đọc đề…"
            : luu
              ? "Đang lưu…"
              : "Đang mở…"
          : luu
            ? `Lưu bài toán ${thongTinVat.vatDeBai}`
            : `Mở phiên với đề ${thongTinVat.vatDeBai} này`}
      </button>
    </form>
  );
}

export function TrangChu({ thuVien, aiBat }: { thuVien: ThuVien; aiBat: boolean }) {
  const [dangTao, setDangTao] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [maMo, setMaMo] = useState("");
  // Vật đang chọn quyết định cả ô tự nhập lẫn danh sách bài toán có sẵn bên dưới.
  const [vat, setVat] = useState<Vat>("xuc_xac");
  const ganDay = docPhienGanDay();
  const tenVat = VAT.find((v) => v.id === vat)!.vatDeBai;

  async function taoPhien(id: string) {
    setDangTao(id);
    setLoi(null);
    try {
      const p = await api.taoPhien(id);
      luuPhienGanDay(p.id);
      window.location.hash = `#/phien/${p.id}`;
    } catch (e) {
      setLoi((e as Error).message);
      setDangTao(null);
    }
  }

  return (
    <>
      <h1>Bắt đầu tiết học</h1>
      <p className="muted">Tự nhập đề bài của bạn, hoặc chọn một tình huống có sẵn. Giáo viên nhập lời giải thích của từng nhóm và trình chiếu thí nghiệm cho cả lớp.</p>

      <FormTuNhap aiBat={aiBat} vat={vat} onDoiVat={setVat} />

      <h2 style={{ marginTop: "1.5rem" }}>Hoặc chọn bài toán {tenVat} có sẵn</h2>
      {loi && <div className="thong-bao loi">{loi}</div>}
      <div className="luoi-2">
        {thuVien.tinh_huong.tinh_huong
          .filter((t) => t.chinh === vat)
          .map((t) => (
            <div className="the" key={t.id}>
              <h3>{t.tieu_de}</h3>
              <p>{t.noi_dung}</p>
              <button onClick={() => taoPhien(t.id)} disabled={dangTao !== null}>
                {dangTao === t.id ? "Đang mở…" : "Mở phiên với tình huống này"}
              </button>
            </div>
          ))}
      </div>

      <div className="the">
        <h2>Tiếp tục phiên cũ</h2>
        <form
          className="hang"
          onSubmit={(e) => {
            e.preventDefault();
            if (maMo.trim()) window.location.hash = `#/phien/${maMo.trim().toUpperCase()}`;
          }}
        >
          <input style={{ maxWidth: 220 }} placeholder="Mã phiên" value={maMo} onChange={(e) => setMaMo(e.target.value)} />
          <button className="phu" type="submit">
            Mở
          </button>
          {ganDay.map((m) => (
            <a key={m} className="nut phu" href={`#/phien/${m}`}>
              {m}
            </a>
          ))}
        </form>
      </div>
    </>
  );
}
