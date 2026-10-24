// Khối "Cách tính xác suất": công thức, từng bước và phép tính cho kết quả đang chọn, do mã tính bằng phân số chính xác.
import { loiGiai, type CauHinhVat } from "@plab/core";
import { useEffect, useMemo, useState } from "react";
import { api, type GiaiThich } from "../api";
import { DoanToan, Toan } from "../components/Toan";

interface Khoa {
  khoa: string;
  nhan: string;
}

export function CachTinh({
  cauHinh,
  khoa,
  khoaChon,
  onChon,
  nhanTruc,
}: {
  cauHinh: CauHinhVat;
  khoa: Khoa[];
  khoaChon: string;
  onChon: (k: string) => void;
  nhanTruc: string;
}) {
  const lg = useMemo(() => loiGiai(cauHinh, khoaChon), [cauHinh, khoaChon]);

  // AI viết lời giải thích riêng cho bài và kết quả đang xét (máy chủ nhớ lại để không gọi lại). Chưa có thì hiện bản soạn sẵn.
  const [ai, setAi] = useState<GiaiThich | null>(null);
  const [dang, setDang] = useState(false);
  const mau = JSON.stringify([cauHinh, khoaChon]);
  useEffect(() => {
    let huy = false;
    setAi(null);
    setDang(true);
    api
      .giaiThichBai(cauHinh, khoaChon)
      .then((g) => !huy && setAi(g))
      .catch(() => {})
      .finally(() => !huy && setDang(false));
    return () => {
      huy = true;
    };
  }, [mau]); // eslint-disable-line react-hooks/exhaustive-deps
  const daAI = ai?.nguon === "ai";
  return (
    <div className="the cach-tinh">
      <div className="dau-the">
        <div>
          <h2>
            <span className="bieu-tuong" aria-hidden="true">✎</span> Cách tính xác suất
          </h2>
          <p className="cong-thuc">Các bước và phép tính bằng phân số, dùng để đối chiếu với kết quả thực nghiệm ở trên.</p>
        </div>
        <label className="hang" style={{ fontWeight: 600, gap: "0.5rem" }}>
          {nhanTruc}
          <select value={khoaChon} onChange={(e) => onChon(e.target.value)}>
            {khoa.map((k) => (
              <option key={k.khoa} value={k.khoa}>
                {k.nhan}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="ct-de">
        <Toan>{lg.de}</Toan>
      </p>
      <div className="ct-de-hieu">
        <div className="ct-nhan">
          Hiểu đơn giản <span className="ct-nguon">{daAI ? "· AI giải thích" : dang ? "· AI đang viết…" : "· bản soạn sẵn"}</span>
        </div>
        {daAI ? (
          <>
            {ai!.nhan_xet && (
              <p>
                <Toan>{ai!.nhan_xet}</Toan>
              </p>
            )}
            <DoanToan ds={ai!.giai_thich} />
            {ai!.vi_du && (
              <p>
                💡 <Toan>{ai!.vi_du}</Toan>
              </p>
            )}
            <p style={{ fontWeight: 700 }}>
              <Toan>{ai!.cau_chot}</Toan>
            </p>
          </>
        ) : (
          <DoanToan ds={lg.de_hieu} />
        )}
        {!daAI && !dang && ai?.ly_do_mac_dinh && <p className="ct-nguon">{ai.ly_do_mac_dinh}</p>}
      </div>
      <div className="ct-cong-thuc">
        <span>Công thức</span>
        <strong className="toan">
          <Toan>{lg.cong_thuc}</Toan>
        </strong>
      </div>

      <ol className="ct-buoc">
        {lg.buoc.map((b, i) => (
          <li key={i}>
            <div className="ct-tieu-de">{b.tieu_de}</div>
            <div>
              <Toan>{b.loi}</Toan>
            </div>
            {b.phep_tinh?.map((p, j) => (
              <div key={j} className="ct-phep-tinh toan">
                <Toan>{p}</Toan>
              </div>
            ))}
          </li>
        ))}
      </ol>

      <div className="ct-ket-qua toan">
        <Toan>{lg.ket_qua}</Toan>
      </div>
      {lg.luu_y && (
        <div className="ct-luu-y">
          💡 <Toan>{lg.luu_y}</Toan>
        </div>
      )}
    </div>
  );
}
