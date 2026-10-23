// Màn hình gộp cho bài toán xúc xắc: cột trái là các bước của nhóm, cột phải là phòng thí nghiệm
// được cấu hình theo nhận định của AI. Bài toán và mã phiên nằm ở phía trên (trong Phien).
import { taoPhanHoi, type CauHinhVat, type KetQuaThiNghiem, type MaNgoNhan, type TinhHuong } from "@plab/core";
import { useEffect, useRef, useState } from "react";
import type { ThuVien } from "../App";
import { api, type GiaiThich, type TrangThaiLuot } from "../api";
import { PhongVat, type SoLieuLuu } from "../phong-thi-nghiem/PhongVat";
import { tenMuc, tenNhom } from "../ten-nhom";
import { ChanDoanChoGiaoVien, OTraLoi } from "./LuongNhom";

function Buoc({ so, tieuDe, xong, dang, children }: { so: number; tieuDe: string; xong: boolean; dang: boolean; children?: React.ReactNode }) {
  return (
    <div className="the buoc-bai-hoc" style={{ opacity: !xong && !dang ? 0.55 : 1 }}>
      <h3 className="hang" style={{ gap: "0.6rem" }}>
        <span className={`so-buoc${xong ? " xong" : dang ? " dang" : ""}`}>{xong ? "✓" : so}</span> {tieuDe}
      </h3>
      {children}
    </div>
  );
}

/** Giải thích dành cho nhóm sau khi xong 3 bước: AI viết dựa trên câu trả lời của nhóm, số liệu và lời giải đã tính. */
function TheGiaiThich({ luotId, ten, san, onXong }: { luotId: string; ten: string; san: GiaiThich | null; onXong: () => void }) {
  const [gt, setGt] = useState<GiaiThich | null>(san);
  const [dangTao, setDangTao] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const tao = async (lai: boolean) => {
    setDangTao(true);
    setLoi(null);
    try {
      setGt(await api.giaiThich(luotId, lai));
      onXong();
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangTao(false);
    }
  };

  useEffect(() => {
    if (!san) void tao(false);
  }, [luotId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="the giai-thich-nhom">
      <h3>Giải thích dành cho {ten}</h3>
      {dangTao && !gt && <p className="dang-tai">AI đang đọc câu trả lời của nhóm và viết lời giải thích</p>}
      {loi && <div className="thong-bao loi">{loi}</div>}
      {gt && (
        <>
          <p className="gt-nhan-xet">{gt.nhan_xet}</p>
          {gt.giai_thich.map((c, i) => (
            <p key={i} className="gt-doan">{c}</p>
          ))}
          {gt.vi_du && <p className="gt-vi-du">💡 {gt.vi_du}</p>}
          <p className="gt-chot">{gt.cau_chot}</p>
          <p className="muted gt-nguon">
            {gt.nguon === "ai" ? "AI viết dựa trên câu trả lời của nhóm và lời giải đã tính sẵn; mọi con số lấy từ lời giải." : `Bản soạn sẵn (${gt.ly_do_mac_dinh ?? "AI chưa chạy"}).`}{" "}
            <button className="phu nho" type="button" disabled={dangTao} onClick={() => void tao(true)}>
              {dangTao ? "Đang viết lại" : "Viết lại"}
            </button>
          </p>
        </>
      )}
    </div>
  );
}

export function BaiHocVat({
  luotId,
  tinhHuong,
  thuVien,
  onThayDoi,
  hangNhom,
}: {
  luotId: string;
  tinhHuong: TinhHuong;
  thuVien: ThuVien;
  onThayDoi: () => void;
  /** Hàng chọn nhóm, đặt ở đầu cột các bước để tiết kiệm chiều cao màn hình. */
  hangNhom?: React.ReactNode;
}) {
  const [tt, setTt] = useState<TrangThaiLuot | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [ketQua, setKetQua] = useState<KetQuaThiNghiem | null>(null);
  const soLieuMoi = useRef<SoLieuLuu | null>(null);
  const henLuu = useRef<number | null>(null);

  const taiLai = async () => {
    const d = await api.luot(luotId);
    setTt(d);
    onThayDoi();
  };

  useEffect(() => {
    setTt(null);
    setKetQua(null);
    soLieuMoi.current = null;
    api.luot(luotId).then(setTt).catch((e) => setLoi(e.message));
  }, [luotId]);

  // Lưu số liệu thí nghiệm lên máy chủ (gộp các thay đổi liên tiếp), để mở lại nhóm vẫn còn.
  const luuSoLieu = () => {
    if (henLuu.current) window.clearTimeout(henLuu.current);
    henLuu.current = null;
    const sl = soLieuMoi.current;
    if (sl) return api.luuKetQua(luotId, sl as unknown as Record<string, unknown>).catch(() => {});
  };
  useEffect(() => () => void luuSoLieu(), [luotId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loi) return <div className="thong-bao loi">{loi}</div>;
  if (!tt) return <p className="dang-tai">Đang tải nhóm</p>;

  const lan = (n: number) => tt.tra_loi.find((t) => t.lan === n);
  const [l1, l2, l3] = [lan(1), lan(2), lan(3)];
  const cd = tt.chan_doan;
  const cauHinh = tt.thi_nghiem?.cau_hinh as CauHinhVat | undefined;
  const khoiTao = (tt.thi_nghiem?.tom_tat as SoLieuLuu | null) ?? null;
  const ma = (cd?.ma_sua ?? cd?.ma_ngo_nhan ?? "KXD") as MaNgoNhan;
  const daGieo = (ketQua ? Number(ketQua.chi_tiet.so_luot) : khoiTao?.so_luot ?? 0) > 0;
  const phanHoi = ketQua ? taoPhanHoi(ketQua, tinhHuong, thuVien.ngo_nhan, ma, cd?.cau_hoi_goi_mo ?? "") : null;
  const ten = tenNhom(tt.luot.ma_nhom);

  const gui = (n: number) => async (noiDung: string) => {
    if (n === 2) await luuSoLieu();
    await api.traLoi(luotId, n, noiDung);
    await taiLai();
  };

  return (
    <div className="bai-hoc">
      <div className="cot-buoc">
        {hangNhom}
        <Buoc so={1} tieuDe={`Dự đoán của ${ten}`} xong={!!l1} dang={!l1}>
          {l1 ? (
            <>
              <p className="trich">“{l1.noi_dung}”</p>
              <p className="muted">{tenMuc(l1.muc_rubric)}</p>
            </>
          ) : (
            <OTraLoi nhan={`${ten} nghĩ gì? Vì sao?`} goiY="Ghi lại đúng lời giải thích của nhóm" onGui={gui(1)} />
          )}
        </Buoc>

        {cd && <ChanDoanChoGiaoVien tt={tt} thuVien={thuVien} />}

        <Buoc so={2} tieuDe="Kiểm chứng bằng thí nghiệm" xong={!!l2} dang={!!l1 && !l2}>
          {l1 && !l2 && (
            <>
              <p>Bấm gieo ở phòng thí nghiệm bên phải. {cauHinh && `Nên gieo khoảng ${cauHinh.so_lan_goi_y.toLocaleString("vi-VN")} lượt.`}</p>
              {phanHoi && <div className="thong-bao tin">{phanHoi.theo_so_lieu}</div>}
              {daGieo ? (
                <OTraLoi nhan="Sau khi xem số liệu, nhóm nghĩ gì?" goiY="Ghi lại nhận xét của nhóm dựa trên số liệu" onGui={gui(2)} />
              ) : (
                <p className="muted">Gieo ít nhất một lượt để nhập nhận xét.</p>
              )}
            </>
          )}
          {l2 && (
            <>
              <p className="trich">“{l2.noi_dung}”</p>
              <p className="muted">{tenMuc(l2.muc_rubric)}</p>
            </>
          )}
        </Buoc>

        <Buoc so={3} tieuDe="Câu hỏi gợi mở" xong={!!l3} dang={!!l2 && !l3}>
          {l2 && (
            <>
              {phanHoi?.cau_hoi ? (
                <p className="tinh-huong" style={{ fontSize: "1.1rem" }}>
                  {phanHoi.cau_hoi}
                  <br />
                  <span className="muted">({phanHoi.nguon_cau_hoi === "ai" ? "AI đề xuất, đã qua kiểm duyệt" : "Câu hỏi soạn sẵn"})</span>
                </p>
              ) : (
                <p className="muted">Giáo viên tự đặt câu hỏi gợi mở cho nhóm.</p>
              )}
              {l3 ? (
                <>
                  <p className="trich">“{l3.noi_dung}”</p>
                  <p className="muted">{tenMuc(l3.muc_rubric)}</p>
                </>
              ) : (
                <OTraLoi nhan="Giải thích cuối cùng của nhóm" goiY="Nhóm giải thích lại bằng lời của mình" onGui={gui(3)} />
              )}
            </>
          )}
        </Buoc>

        {l3 && <TheGiaiThich luotId={luotId} ten={ten} san={tt.giai_thich} onXong={() => void taiLai()} />}

        {l3 && (
          <div className="the">
            <h3>Tiến trình của {ten}</h3>
            <p className="muted">
              Mức rubric: {[l1, l2, l3].map((t) => t?.muc_rubric ?? "–").join(" → ")}
            </p>
          </div>
        )}
      </div>

      <div className="cot-phong">
        {cauHinh ? (
          <PhongVat
            key={luotId}
            cauHinh={cauHinh}
            khoaCauHinh
            motCot
            hienCachTinh={!!l3}
            khoiTao={khoiTao}
            ghiChu={tt.thi_nghiem?.ly_do}
            onCapNhat={(sl, kq) => {
              setKetQua(kq);
              soLieuMoi.current = sl;
              if (henLuu.current) window.clearTimeout(henLuu.current);
              henLuu.current = window.setTimeout(() => void luuSoLieu(), 1500);
            }}
          />
        ) : (
          <div className="the cho-phong">
            <div className="xx-mo" aria-hidden="true">{({ xuc_xac: "🎲", dong_xu: "🪙", bi: "🔴", the: "🔢" } as Record<string, string>)[tinhHuong.chinh] ?? "🎲"}</div>
            <h2>Phòng thí nghiệm</h2>
            <p className="muted">Nhập dự đoán của nhóm ở bên trái. Sau khi AI nhận định, phòng thí nghiệm sẽ tự cấu hình đúng giả thuyết của nhóm.</p>
          </div>
        )}
      </div>
    </div>
  );
}
