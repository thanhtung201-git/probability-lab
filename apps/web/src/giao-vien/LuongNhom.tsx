// Chu trình của một nhóm: dự đoán → thí nghiệm kiểm chứng → giải thích lại → câu hỏi gợi mở → giải thích lần cuối.
import { chayThiNghiem, taoPhanHoi, type MaNgoNhan, type TinhHuong } from "@plab/core";
import { useEffect, useMemo, useState } from "react";
import type { ThuVien } from "../App";
import { api, type TrangThaiLuot } from "../api";
import { ThiNghiem } from "../components/ThiNghiem";
import { tenMuc, tenNhom } from "../ten-nhom";


export function OTraLoi({
  nhan,
  goiY,
  onGui,
}: {
  nhan: string;
  goiY: string;
  onGui: (noiDung: string) => Promise<void>;
}) {
  const [noiDung, setNoiDung] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function gui() {
    if (noiDung.trim().length < 3) {
      setLoi("Hãy nhập lời giải thích của nhóm (ít nhất vài chữ).");
      return;
    }
    setDangGui(true);
    setLoi(null);
    try {
      await onGui(noiDung.trim());
    } catch (e) {
      setLoi((e as Error).message);
      setDangGui(false);
    }
  }

  return (
    <div className="truong">
      <label htmlFor={nhan}>{nhan}</label>
      <textarea
        id={nhan}
        placeholder={goiY}
        value={noiDung}
        onChange={(e) => {
          setNoiDung(e.target.value);
          setLoi(null);
        }}
        disabled={dangGui}
      />
      {loi && <div className="thong-bao loi" style={{ marginTop: "0.5rem" }}>{loi}</div>}
      <div style={{ marginTop: "0.6rem" }}>
        <button onClick={gui} disabled={dangGui}>
          {dangGui ? "AI đang đọc…" : "Gửi"}
        </button>
      </div>
    </div>
  );
}

export function ChanDoanChoGiaoVien({ tt, thuVien }: { tt: TrangThaiLuot; thuVien: ThuVien }) {
  const cd = tt.chan_doan!;
  const ma = (cd.ma_sua ?? cd.ma_ngo_nhan) as MaNgoNhan;
  const ngoNhan = thuVien.ngo_nhan.ngo_nhan.find((n) => n.ma === ma);
  const g = cd.gia_thuyet;
  return (
    <div className="the">
      <h3>Hệ thống nhận định</h3>
      <p>
        <span className={`huy-hieu ${ma === "M0" ? "M0" : ma === "KXD" ? "KXD" : "loi"}`}>
          {ma} · {ngoNhan?.ten}
        </span>{" "}
        <span className="muted">
          độ tin cậy {Math.round(cd.do_tin_cay * 100)}% · nguồn: {cd.nguon === "lai" ? "luật + AI" : cd.nguon === "llm" ? "AI" : "bộ luật"}
        </span>
      </p>
      {cd.can_duyet && !cd.ket_luan && <div className="thong-bao canh-bao">Cần giáo viên duyệt: {cd.ly_do_duyet}</div>}
      {cd.ma_sua && <div className="thong-bao tin">Giáo viên đã sửa thành {cd.ma_sua}.</div>}
      {cd.can_cu && <p className="trich">“{cd.can_cu}”</p>}
      {g.du_doan_hs && (
        <p>
          <strong>Giả thuyết của nhóm:</strong> {g.dieu_kien && `${g.dieu_kien} → `}
          {g.bien_co} {g.du_doan_hs && `(nhóm cho rằng: ${g.du_doan_hs})`}
        </p>
      )}
      <p className="muted">Thí nghiệm được chọn: {tt.thi_nghiem?.ly_do}</p>
    </div>
  );
}

export function LuongNhom({
  luotId,
  tinhHuong,
  thuVien,
  onThayDoi,
}: {
  luotId: string;
  tinhHuong: TinhHuong;
  thuVien: ThuVien;
  onThayDoi: () => void;
}) {
  const [tt, setTt] = useState<TrangThaiLuot | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [daChayMoi, setDaChayMoi] = useState(false);

  const taiLai = () =>
    api
      .luot(luotId)
      .then((d) => {
        setTt(d);
        onThayDoi();
      })
      .catch((e) => setLoi(e.message));

  useEffect(() => {
    setTt(null);
    setDaChayMoi(false);
    api.luot(luotId).then(setTt).catch((e) => setLoi(e.message));
  }, [luotId]);

  if (loi) return <div className="thong-bao loi">{loi}</div>;
  if (!tt) return <p className="dang-tai">Đang tải nhóm</p>;

  const lan = (n: number) => tt.tra_loi.find((t) => t.lan === n);
  const coLan1 = lan(1);
  const coLan2 = lan(2);
  const coLan3 = lan(3);
  const daChay = daChayMoi || tt.thi_nghiem?.tom_tat != null || !!coLan2;
  const buoc = !coLan1 ? 1 : !coLan2 ? 2 : !coLan3 ? 3 : 4;

  const gui = (n: number) => async (noiDung: string) => {
    await api.traLoi(luotId, n, noiDung);
    await taiLai();
  };

  const maCuoi = (tt.chan_doan?.ma_sua ?? tt.chan_doan?.ma_ngo_nhan ?? "KXD") as MaNgoNhan;

  return (
    <div>
      <div className="buoc">
        {["1. Dự đoán", "2. Thí nghiệm kiểm chứng", "3. Câu hỏi gợi mở", "4. Hoàn thành"].map((t, i) => (
          <span key={t} className={i + 1 === buoc ? "dang" : i + 1 < buoc ? "xong" : ""}>
            {t}
          </span>
        ))}
      </div>

      {coLan1 ? (
        <div className="the">
          <h3>Dự đoán ban đầu của {tenNhom(tt.luot.ma_nhom)}</h3>
          <p className="trich">“{coLan1.noi_dung}”</p>
          <p className="muted">{tenMuc(coLan1.muc_rubric)}</p>
        </div>
      ) : (
        <div className="the">
          <OTraLoi
            nhan={`${tenNhom(tt.luot.ma_nhom)} dự đoán gì? Vì sao?`}
            goiY="Ghi lại đúng lời giải thích của nhóm, ví dụ: Ngửa 5 lần rồi nên lần sau dễ ra sấp hơn"
            onGui={gui(1)}
          />
        </div>
      )}

      {tt.chan_doan && tt.thi_nghiem && (
        <>
          <ChanDoanChoGiaoVien tt={tt} thuVien={thuVien} />
          <div className="the">
            <h2>Thí nghiệm kiểm chứng</h2>
            <ThiNghiem
              cauHinh={tt.thi_nghiem.cau_hinh}
              tinhHuong={tinhHuong}
              daChay={daChay}
              onXong={(kq) => {
                setDaChayMoi(true);
                api.luuKetQua(luotId, { tan_so: kq.tan_so, tan_suat: kq.tan_suat, ly_thuyet: kq.ly_thuyet, chi_tiet: kq.chi_tiet }).catch(() => {});
              }}
            />
          </div>
        </>
      )}

      {tt.chan_doan && tt.thi_nghiem && daChay && (
        <PhanSauThiNghiem
          tt={tt}
          tinhHuong={tinhHuong}
          thuVien={thuVien}
          ma={maCuoi}
          lan2={coLan2}
          lan3={coLan3}
          gui={gui}
        />
      )}
    </div>
  );
}

function PhanSauThiNghiem({
  tt,
  tinhHuong,
  thuVien,
  ma,
  lan2,
  lan3,
  gui,
}: {
  tt: TrangThaiLuot;
  tinhHuong: TinhHuong;
  thuVien: ThuVien;
  ma: MaNgoNhan;
  lan2: TrangThaiLuot["tra_loi"][number] | undefined;
  lan3: TrangThaiLuot["tra_loi"][number] | undefined;
  gui: (n: number) => (noiDung: string) => Promise<void>;
}) {
  // Tính lại từ cùng seed nên số liệu giống hệt thí nghiệm vừa chạy.
  const phanHoi = useMemo(
    () => taoPhanHoi(chayThiNghiem(tt.thi_nghiem!.cau_hinh), tinhHuong, thuVien.ngo_nhan, ma, tt.chan_doan!.cau_hoi_goi_mo),
    [tt, tinhHuong, thuVien, ma],
  );

  return (
    <>
      <div className="the">
        <h2>Nhóm thấy gì từ số liệu?</h2>
        <div className="thong-bao tin">{phanHoi.theo_so_lieu}</div>
        {lan2 ? (
          <>
            <p className="trich">“{lan2.noi_dung}”</p>
            <p className="muted">{tenMuc(lan2.muc_rubric)}</p>
          </>
        ) : (
          <OTraLoi nhan="Sau khi xem số liệu, nhóm nghĩ gì?" goiY="Ghi lại nhận xét của nhóm dựa trên bảng số liệu" onGui={gui(2)} />
        )}
      </div>

      {lan2 && (
        <div className="the">
          <h2>Câu hỏi gợi mở</h2>
          {phanHoi.cau_hoi ? (
            <p className="tinh-huong">
              {phanHoi.cau_hoi}
              <br />
              <span className="muted">({phanHoi.nguon_cau_hoi === "ai" ? "AI đề xuất, đã qua kiểm duyệt" : "Câu hỏi soạn sẵn"})</span>
            </p>
          ) : (
            <p className="muted">Giáo viên tự đặt câu hỏi gợi mở cho nhóm.</p>
          )}
          {lan3 ? (
            <>
              <p className="trich">“{lan3.noi_dung}”</p>
              <p className="muted">{tenMuc(lan3.muc_rubric)}</p>
            </>
          ) : (
            <OTraLoi nhan="Giải thích cuối cùng của nhóm" goiY="Nhóm giải thích lại bằng lời của mình" onGui={gui(3)} />
          )}
        </div>
      )}

      {lan3 && (
        <div className="the">
          <h2>Tiến trình của {tenNhom(tt.luot.ma_nhom)}</h2>
          <table>
            <thead>
              <tr>
                <th>Lần</th>
                <th>Lời giải thích</th>
                <th>Mức rubric</th>
              </tr>
            </thead>
            <tbody>
              {tt.tra_loi.map((t) => (
                <tr key={t.lan}>
                  <td>{t.lan}</td>
                  <td>{t.noi_dung}</td>
                  <td>{tenMuc(t.muc_rubric)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
