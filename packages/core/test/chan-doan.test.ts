import { describe, expect, it } from "vitest";
import ngoNhanRaw from "../../../data/ngo_nhan.json";
import tinhHuongRaw from "../../../data/tinh_huong.json";
import {
  bienDich,
  chanDoanBangLuat,
  chayThiNghiem,
  chuanHoa,
  hopNhat,
  kiemDuyetCauHoi,
  kiemTraThuVien,
  taoPhanHoi,
  type ChanDoanLLM,
} from "../src";

const { ngoNhan, tinhHuong } = kiemTraThuVien(ngoNhanRaw, tinhHuongRaw);
const th = (id: string) => tinhHuong.tinh_huong.find((t) => t.id === id)!;

describe("thư viện nội dung", () => {
  it("hợp lệ và đủ 19 tình huống (5 batch cũ, 4 xúc xắc, 4 đồng xu, 3 hộp bi, 3 thẻ số)", () => {
    expect(tinhHuong.tinh_huong).toHaveLength(19);
  });
});

describe("chuẩn hóa tiếng Việt", () => {
  it("bỏ dấu, viết thường, thay viết tắt", () => {
    expect(chuanHoa("Đồng xu KO   nhớ đc")).toBe("dong xu khong nho duoc");
    expect(chuanHoa("xác suất là 0,7")).toBe("xac suat la 0.7");
  });
});

describe("bộ luật", () => {
  const ca: [string, string][] = [
    ["Ngửa 5 lần rồi nên lần sau chắc ra sấp", "M1"],
    ["ngua nhieu roi nen lan sau de ra sap hon", "M1"],
    ["Số 27 lâu chưa về nên kỳ tới chắc chắn về", "M1"],
    ["Em đồng ý vì đồng xu bị lệch về mặt ngửa", "M2"],
    ["Dãy NSNSSN dễ ra hơn vì nó xen kẽ", "M4"],
    ["Dự báo đã sai vì trời không mưa", "M5"],
    ["Các lần tung độc lập, đồng xu không nhớ nên lần sau vẫn là 1/2", "M0"],
    ["Hai dãy có khả năng như nhau", "M0"],
  ];
  for (const [cau, ma] of ca) {
    it(`"${cau}" → ${ma}`, () => {
      expect(chanDoanBangLuat(cau, ngoNhan).ma_ngo_nhan).toBe(ma);
    });
  }

  it("câu lạc đề không khớp gì", () => {
    const kq = chanDoanBangLuat("Em thích ăn kem", ngoNhan);
    expect(kq.ma_ngo_nhan).toBeNull();
    expect(kq.do_tin_cay).toBe(0);
  });
});

describe("hợp nhất", () => {
  const llm = (ma: ChanDoanLLM["ma_ngo_nhan"], tinCay = 0.9): ChanDoanLLM => ({
    ma_ngo_nhan: ma,
    can_cu: "x",
    gia_thuyet: { loai_thi_nghiem: "co_dieu_kien", dieu_kien: "", bien_co: "", du_doan_hs: "" },
    do_tin_cay: tinCay,
    cau_hoi_goi_mo: "Em nghĩ đồng xu có nhớ không?",
  });
  const luatM1 = chanDoanBangLuat("Ngửa 5 lần rồi nên lần sau chắc ra sấp", ngoNhan);

  it("không có LLM: dùng luật và đưa vào hàng chờ", () => {
    const kq = hopNhat(luatM1, null, "cau");
    expect(kq).toMatchObject({ ma_ngo_nhan: "M1", nguon: "luat", can_duyet: true });
  });
  it("cùng mã: nguồn lai, không cần duyệt", () => {
    expect(hopNhat(luatM1, llm("M1"), "cau")).toMatchObject({ nguon: "lai", can_duyet: false });
  });
  it("khác mã: giữ mã LLM nhưng cần duyệt", () => {
    expect(hopNhat(luatM1, llm("M2"), "cau")).toMatchObject({ ma_ngo_nhan: "M2", can_duyet: true });
  });
  it("LLM không chắc: gán KXD", () => {
    expect(hopNhat(luatM1, llm("M1", 0.4), "cau")).toMatchObject({ ma_ngo_nhan: "KXD", can_duyet: true });
  });
});

describe("biên dịch giả thuyết", () => {
  it("dùng loại thí nghiệm AI chọn nếu tình huống cho phép", () => {
    const kq = bienDich(
      { ma_ngo_nhan: "M1", gia_thuyet: { loai_thi_nghiem: "hoi_tu", dieu_kien: "", bien_co: "", du_doan_hs: "" } },
      th("dong_xu_5_ngua"),
      ngoNhan,
      7,
    );
    expect(kq.cau_hinh.loai).toBe("hoi_tu");
    expect(kq.cau_hinh.seed).toBe(7);
  });
  it("loại AI chọn không có trong tình huống thì dùng mặc định của ngộ nhận, rồi thí nghiệm chính", () => {
    const g = { loai_thi_nghiem: "so_sanh_day" as const, dieu_kien: "", bien_co: "", du_doan_hs: "" };
    expect(bienDich({ ma_ngo_nhan: "M5", gia_thuyet: g }, th("du_bao_mua"), ngoNhan, 1).cau_hinh.loai).toBe("xac_suat_lap");
    expect(bienDich({ ma_ngo_nhan: "KXD", gia_thuyet: g }, th("lo_de"), ngoNhan, 1).cau_hinh.loai).toBe("co_dieu_kien");
  });
  it("mọi tình huống và mọi mã đều dựng và chạy được thí nghiệm", () => {
    for (const t of tinhHuong.tinh_huong) {
      for (const ma of ["M0", "M1", "M2", "M3", "M4", "M5", "M6", "KXD"] as const) {
        const { cau_hinh } = bienDich(
          { ma_ngo_nhan: ma, gia_thuyet: { loai_thi_nghiem: "khong_co", dieu_kien: "", bien_co: "", du_doan_hs: "" } },
          t,
          ngoNhan,
          3,
        );
        const kq = chayThiNghiem(cau_hinh);
        const ph = taoPhanHoi(kq, t, ngoNhan, ma, "");
        expect(ph.theo_so_lieu).not.toMatch(/\{\w+\}/); // không còn chỗ trống chưa điền
      }
    }
  });
});

describe("kiểm duyệt câu hỏi AI", () => {
  it("chặn câu chứa đáp án hoặc không phải câu hỏi", () => {
    expect(kiemDuyetCauHoi("Xác suất vẫn là 1/2 đúng không?").hop_le).toBe(false);
    expect(kiemDuyetCauHoi("Hai mặt có khả năng như nhau không?").hop_le).toBe(false);
    expect(kiemDuyetCauHoi("Đồng xu không nhớ gì cả.").hop_le).toBe(false);
  });
  it("cho qua câu hỏi gợi mở hợp lệ", () => {
    expect(kiemDuyetCauHoi("Theo em, đồng xu có nhớ được các lần tung trước không?").hop_le).toBe(true);
  });
});
