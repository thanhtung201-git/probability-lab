// Tab "Thêm bài toán": soạn đề, chọn thí nghiệm và lưu vào thư viện; liệt kê, mở phiên và xóa các bài đã lưu.
import { useState } from "react";
import type { ThuVien } from "../App";
import { api } from "../api";
import { BaiToanTongQuat } from "./BaiToanTongQuat";
import { FormTuNhap, luuPhienGanDay, VAT, type KhoiTaoForm, type Vat } from "./TrangChu";

/** Bài mẫu điền sẵn vào biểu mẫu, để giáo viên sửa lại cho đúng đề của mình. */
const BAI_MAU: { id: string; ten: string; vat: Vat; form: KhoiTaoForm }[] = [
  {
    id: "it_nhat_bi",
    ten: "“Ít nhất 1” với bi đỏ, bi vàng",
    vat: "bi",
    form: {
      tieuDe: "Ít nhất 1 bi vàng",
      noiDung:
        "Hộp có 3 bi đỏ và 4 bi vàng, các bi giống hệt nhau về kích thước. Lấy ngẫu nhiên cùng lúc 2 bi. Tính xác suất của biến cố “Có ít nhất 1 bi vàng”.",
      kieu: "hai_con",
      hop: "đỏ 3, vàng 4",
      mau: "vàng",
      hoanLai: false,
      suKienBi: "it_nhat",
    },
  },
  {
    id: "it_nhat_nam_nu",
    ten: "“Ít nhất 1” với nam, nữ (đề gốc)",
    vat: "bi",
    form: {
      tieuDe: "Ít nhất một bạn nữ",
      noiDung:
        "Một nhóm học sinh gồm 3 học sinh nam, 4 học sinh nữ. Chọn ngẫu nhiên ra hai học sinh. Xác suất của biến cố “Hai bạn được chọn có ít nhất một bạn là nữ” bằng bao nhiêu?",
      kieu: "hai_con",
      hop: "nam 3, nữ 4",
      mau: "nữ",
      hoanLai: false,
      suKienBi: "it_nhat",
    },
  },
  {
    id: "khac_mau",
    ten: "Hai bi khác màu",
    vat: "bi",
    form: {
      tieuDe: "Hai bi khác màu",
      noiDung: "Hộp có 3 bi đỏ và 4 bi vàng. Lấy ngẫu nhiên cùng lúc 2 bi. Tính xác suất để hai bi lấy ra có màu khác nhau.",
      kieu: "hai_con",
      hop: "đỏ 3, vàng 4",
      mau: "vàng",
      hoanLai: false,
      suKienBi: "khac_mau",
    },
  },
];

export function ThemBai({ thuVien, aiBat, onDoi }: { thuVien: ThuVien; aiBat: boolean; onDoi: () => void }) {
  const [che, setChe] = useState<"tong_quat" | "co_san">("tong_quat");
  const [vat, setVat] = useState<Vat>("bi");
  const [mau, setMau] = useState<{ khoa: number; form?: KhoiTaoForm }>({ khoa: 0 });
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLam, setDangLam] = useState<string | null>(null);

  const daLuu = thuVien.tinh_huong.tinh_huong.filter((t) => t.id.startsWith("tn_"));

  function chonMau(b: (typeof BAI_MAU)[number]) {
    setVat(b.vat);
    setMau((m) => ({ khoa: m.khoa + 1, form: b.form }));
  }

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
      <h1>Thêm bài toán</h1>
      <p className="muted">Soạn bài toán của riêng bạn một lần, lưu lại và dùng cho nhiều tiết học.</p>

      <div className="vien" role="tablist" aria-label="Cách soạn bài" style={{ marginBottom: "1rem" }}>
        <button role="tab" aria-selected={che === "tong_quat"} className={che === "tong_quat" ? "dang-chon" : ""} onClick={() => setChe("tong_quat")}>
          🧩 Đề lấy vật tự do (bi đánh số, nam/nữ, lập số …)
        </button>
        <button role="tab" aria-selected={che === "co_san"} className={che === "co_san" ? "dang-chon" : ""} onClick={() => setChe("co_san")}>
          🎲 Dạng có sẵn (xúc xắc, đồng xu, hộp bi, thẻ số)
        </button>
      </div>

      {che === "tong_quat" && <BaiToanTongQuat aiBat={aiBat} onDaLuu={onDoi} />}

      {che === "co_san" && (
        <>
      <div className="the">
        <h2>Bắt đầu từ bài mẫu</h2>
        <p className="muted">Chọn một bài mẫu để điền sẵn biểu mẫu, rồi sửa lại số liệu và lời đề cho đúng bài của bạn.</p>
        <div className="vien">
          {BAI_MAU.map((b) => (
            <button key={b.id} type="button" className="phu" onClick={() => chonMau(b)}>
              {b.ten}
            </button>
          ))}
        </div>
      </div>

      <FormTuNhap key={mau.khoa} aiBat={aiBat} vat={vat} onDoiVat={setVat} luu khoiTao={mau.form} onDaLuu={onDoi} />
        </>
      )}

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
                  <button onClick={() => moPhien(t.id)} disabled={dangLam !== null}>
                    {dangLam === t.id ? "Đang xử lý…" : "Mở phiên với bài này"}
                  </button>
                  <button className="phu" onClick={() => xoa(t.id, t.tieu_de)} disabled={dangLam !== null}>
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
