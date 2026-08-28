import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { measureOf } from "@/lib/discipline";
import {
  loadDocData,
  DOC_TYPE_LABELS,
  signatureOf,
  type DocData,
  type DocType,
} from "@/lib/doc-data";

const WIN_FONTS = "C:\\Windows\\Fonts";

function findFont(candidates: string[]): string {
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return "";
}

const pskRegular = findFont([
  path.join(WIN_FONTS, "THSarabun.ttf"),
  path.join(WIN_FONTS, "TH SarabunPSK.ttf"),
  path.join(WIN_FONTS, "TH Sarabun PSK.ttf"),
]);
const pskBold = findFont([
  path.join(WIN_FONTS, "THSarabun Bold.ttf"),
  path.join(WIN_FONTS, "TH SarabunPSK Bold.ttf"),
  path.join(WIN_FONTS, "TH Sarabun PSK Bold.ttf"),
]);

Font.register({
  family: "DocFont",
  fonts: [
    {
      src: pskRegular || path.join(process.cwd(), "resources", "fonts", "Sarabun-Regular.ttf"),
      fontWeight: 400,
    },
    {
      src: pskBold || path.join(process.cwd(), "resources", "fonts", "Sarabun-Bold.ttf"),
      fontWeight: 700,
    },
  ],
});

const GARUDA_PATH = path.join(process.cwd(), "public", "garuda.png");
const LOGO_PATH = path.join(process.cwd(), "public", "logo-bch.png");

const CORRECTION_LABELS: [string, string][] = [
  ["advise", "การสอนแนะ"],
  ["gooddeeds", "ให้ทำความดีเพื่อชดใช้ความผิด"],
  ["work", "ให้ช่วยงานตามความสามารถ"],
  ["counsel", "ให้เข้าพบงานปรึกษาแนะแนว"],
];

const s = StyleSheet.create({
  page: {
    paddingTop: 108,
    paddingLeft: 108,
    paddingBottom: 72,
    paddingRight: 72,
    fontSize: 16,
    fontFamily: "DocFont",
    lineHeight: 1.45,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: { width: 62, height: 62 },
  title: { fontSize: 20, fontWeight: 700, textAlign: "center", marginBottom: 8 },
  bold: { fontWeight: 700 },
  indent: { marginLeft: 24 },
  center: { textAlign: "center" },
  checks: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginLeft: 24,
    columnGap: 14,
    rowGap: 2,
  },
  fill: {
    borderBottomWidth: 1,
    borderBottomStyle: "dotted",
    borderBottomColor: "#000",
    minWidth: 60,
    textAlign: "center",
    fontWeight: 700,
    paddingHorizontal: 4,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginVertical: 4,
  },
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
  },
  sigCol: { alignItems: "center", minWidth: 180 },
  sigImage: { height: 34, objectFit: "contain", marginBottom: 2 },
  sigGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 28,
    rowGap: 24,
  },
  sigCenter: { alignItems: "center", marginTop: 28 },
});

function splitDate(s: string): [string, string, string] {
  if (!s) return ["", "", ""];
  const parts = s.trim().split(/\s+/);
  return [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
}

function Fill({ children }: { children: string }) {
  return <Text style={s.fill}>{children}</Text>;
}

function Sig({
  name,
  role,
  first,
  image,
}: {
  name?: string;
  role: string;
  first?: string;
  image?: string;
}) {
  return (
    <View style={s.sigCol}>
      {first ? <Text>{first}</Text> : null}
      {image ? (
        <Image src={image} style={s.sigImage} />
      ) : (
        <Text>ลงชื่อ..........................................</Text>
      )}
      <Text style={s.bold}>({name || "........................."})</Text>
      <Text>{role}</Text>
    </View>
  );
}

function Header({ label, emblem }: { label: string; emblem: string }) {
  return (
    <View style={s.headerRow} fixed>
      <Image src={emblem} style={s.logo} />
      {label ? <Text>{label}</Text> : <Text> </Text>}
    </View>
  );
}

function Checks({ data }: { data: DocData }) {
  return (
    <View style={s.checks}>
      {data.behaviors.map((b) => (
        <Text key={b.label}>{`( ${b.checked ? "✓" : "  "} ) ${b.label}`}</Text>
      ))}
    </View>
  );
}

export function G1Pdf({ data }: { data: DocData }) {
  const [todayDay, todayMonth, todayYear] = splitDate(data.today);
  const [mDay, mMonth, mYear] = splitDate(data.summon?.meetingDate ?? "");
  const grade = data.classroomGrade || "";
  const room = data.classroomRoom || "";
  return (
    <Page size="A4" style={s.page}>
      <Header label="กิจการนักเรียน. 1" emblem={GARUDA_PATH} />
      <Text style={s.title}>บันทึกข้อความ</Text>
      <Text>ส่วนราชการ โรงเรียนบาเจาะ</Text>
      <Text>
        ที่ <Fill>{data.summon?.docNo ?? ""}</Fill> วันที่ <Fill>{todayDay}</Fill> เดือน <Fill>{todayMonth}</Fill>{" "}
        พ.ศ. <Fill>{todayYear}</Fill>
      </Text>
      <Text>เรื่อง แจ้งนักเรียนประพฤติผิดระเบียบของโรงเรียน</Text>
      <View style={s.hr} />
      <Text>
        เรียน ครูที่ปรึกษาชั้น ม. <Fill>{grade}</Fill>/<Fill>{room}</Fill>
      </Text>
      <Text>
        เนื่องด้วย (ด.ช./ด.ญ/นาย/นางสาว) <Fill>{data.studentName}</Fill>
      </Text>
      <Text>
        นักเรียนชั้น ม. <Fill>{grade}</Fill>/<Fill>{room}</Fill> ซึ่งเป็นนักเรียนในปกครองของท่านได้ประพฤติผิดระเบียบของโรงเรียนในเรื่อง
      </Text>
      <Checks data={data} />
      <Text>จึงเรียนมาเพื่อโปรดทำการสอบสวนแล้วรายงานให้ทราบ (ตามแบบรายงานการสอบสวน กิจการนักเรียน. 1)</Text>
      <Text>
        ภายในวันที่ <Fill>{mDay}</Fill> เดือน <Fill>{mMonth}</Fill> พ.ศ. <Fill>{mYear}</Fill>
      </Text>
      <View style={s.sigRow}>
        <Sig name="" role="ครูที่พบเห็น" />
        <Sig
          name={data.deputyName || data.directorName}
          role="ผู้อำนวยการ/รองผู้อำนวยการ"
          image={signatureOf(data, "director")?.imageData || signatureOf(data, "patrol")?.imageData}
        />
      </View>
      <View style={s.sigRow}>
        <View style={{ alignItems: "center" }}>
          <Text>ทราบ</Text>
          <Sig name={data.advisorName} role="ครูที่ปรึกษา" />
        </View>
        <View style={{ alignItems: "center" }}>
          <Text>รับทราบ (นักเรียน)</Text>
          <Sig name={data.studentName} role="นักเรียน" image={signatureOf(data, "student")?.imageData} />
        </View>
      </View>
    </Page>
  );
}

export function G11Pdf({ data }: { data: DocData }) {
  const [todayDay, todayMonth, todayYear] = splitDate(data.today);
  const [occurDay, occurMonth, occurYear] = splitDate(data.occurredDate);
  const grade = data.classroomGrade || "";
  const room = data.classroomRoom || "";
  const agreement = data.agreement!;
  return (
    <Page size="A4" style={s.page}>
      <Header label="กิจการนักเรียน. 1.1" emblem={LOGO_PATH} />
      <Text style={s.title}>แบบบันทึกการกระทำผิดระเบียบของโรงเรียน</Text>
      <Text style={s.center}>
        ครั้งที่ <Fill>{String(data.measureLevel)}</Fill>
      </Text>
      <Text style={s.center}>โรงเรียนบาเจาะ อำเภอบาเจาะ จังหวัดนราธิวาส</Text>
      <Text style={{ textAlign: "right" }}>
        วันที่ <Fill>{todayDay}</Fill> เดือน <Fill>{todayMonth}</Fill> พ.ศ. <Fill>{todayYear}</Fill>
      </Text>
      <Text>
        ข้าพเจ้า(นักเรียน) <Fill>{data.studentName}</Fill> เลขประจำตัว <Fill>{data.studentNo}</Fill> เลขที่{" "}
        <Fill>{data.studentNo}</Fill>
      </Text>
      <Text>
        นักเรียนชั้น ม. <Fill>{grade}</Fill>/<Fill>{room}</Fill> ได้กระทำผิดระเบียบของโรงเรียนเรื่อง{" "}
        <Fill>{agreement.behaviorDetail || data.behaviors.filter((b) => b.checked).map((b) => b.label).join(", ")}</Fill>
      </Text>
      <Text style={{ minHeight: 14 }}>
        <Text> </Text>
      </Text>
      <Text style={{ minHeight: 14 }}>
        <Text> </Text>
      </Text>
      <Text>
        เหตุเกิดเมื่อ วันที่ <Fill>{occurDay}</Fill> เดือน <Fill>{occurMonth}</Fill> พ.ศ.{" "}
        <Fill>{occurYear}</Fill> เวลา <Fill>{data.occurredTime}</Fill> น.
      </Text>
      <Text>
        สถานที่เกิดเหตุ <Fill>{data.location}</Fill>
      </Text>
      <Text style={s.indent}>
        การกระทำของข้าพเจ้าดังกล่าว ข้าพเจ้าทราบว่าเป็นการกระทำที่ไม่ถูกต้อง และข้าพเจ้าเคยได้รับการอบรม
      </Text>
      <Text style={s.indent}>สั่งสอน และตักเตือนอยู่เสมอ แต่ข้าพเจ้ายังไม่ปฏิบัติตาม นับได้ว่าข้าพเจ้าได้เป็นผู้กระทำการอันใด อันจะนำความ</Text>
      <Text style={s.indent}>เสื่อมเสียชื่อเสียงมาสู่โรงเรียนและหมู่คณะ ข้าพเจ้ายินดีให้ทางโรงเรียนพิจารณาลงโทษตามเหตุสมควร</Text>
      <View style={s.sigGrid}>
        <Sig
          first="ผู้กระทำผิด"
          name={signatureOf(data, "student")?.signerName ?? data.studentName}
          role=""
          image={signatureOf(data, "student")?.imageData}
        />
        <Sig
          first="ผู้ปกครอง"
          name={signatureOf(data, "parent")?.signerName ?? data.guardianName}
          role=""
          image={signatureOf(data, "parent")?.imageData}
        />
        <Sig first="ครูที่ปรึกษา" name={data.advisorName} role="" />
        <Sig
          first="หัวหน้ากลุ่มบริหารกิจการนักเรียน"
          name={data.deputyName || "นางดวงพร ศรีทิพยราษฎร์"}
          role=""
        />
      </View>
      <View style={s.sigCenter}>
        <Sig
          name={(signatureOf(data, "director")?.signerName ?? data.directorName) || "นายฮาฟีซี อับดุลเลาะ"}
          role="ผู้อำนวยการโรงเรียนบาเจาะ"
          image={signatureOf(data, "director")?.imageData}
        />
      </View>
    </Page>
  );
}

export function G2Pdf({ data }: { data: DocData }) {
  const [todayDay, todayMonth, todayYear] = splitDate(data.today);
  const grade = data.classroomGrade || "";
  const room = data.classroomRoom || "";
  const correction = data.correction!;
  return (
    <Page size="A4" style={s.page}>
      <Header label="กิจการนักเรียน. 2" emblem={GARUDA_PATH} />
      <Text style={s.title}>บันทึกข้อความ</Text>
      <Text>ส่วนราชการ โรงเรียนบาเจาะ</Text>
      <Text>
        ที่ <Fill>{data.summon?.docNo ?? ""}</Fill> วันที่ <Fill>{todayDay}</Fill> เดือน{" "}
        <Fill>{todayMonth}</Fill> พ.ศ. <Fill>{todayYear}</Fill>
      </Text>
      <Text>เรื่อง รายงานการสอบสวนนักเรียนประพฤติผิดระเบียบของโรงเรียน</Text>
      <View style={s.hr} />
      <Text>เรียน ผู้อำนวยการโรงเรียนบาเจาะ</Text>
      <Text>
        ด้วย (ด.ช./ด.ญ/นาย/นางสาว) <Fill>{data.studentName}</Fill>
      </Text>
      <Text>
        นักเรียนชั้น ม. <Fill>{grade}</Fill>/<Fill>{room}</Fill> ได้ประพฤติผิดระเบียบของโรงเรียนในเรื่อง
      </Text>
      <Checks data={data} />
      <Text>
        ซึ่งเป็นหมวดความผิดระเบียบวินัยของโรงเรียนและนักเรียนทำผิดเป็นครั้งที่{" "}
        <Fill>{String(data.measureLevel)}</Fill> โดยได้ทำการสอบสวนแล้วปรากฏว่า (ด.ช./ด.ญ/นาย/นางสาว){" "}
        <Fill>{data.studentName}</Fill> ประพฤติผิดระเบียบของโรงเรียนจริงตามแบบ กิจการนักเรียน. 1/1
        ที่แนบมาพร้อมนี้
      </Text>
      <Text>จึงเรียนมาเพื่อโปรดทราบและดำเนินการต่อไป</Text>
      <View style={{ alignSelf: "flex-end", marginTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <Text>ลงชื่อ</Text>
          <Text style={[s.fill, { minWidth: 140 }]}> </Text>
          <Text> ครูที่ปรึกษาชั้น ม. </Text>
          <Text style={[s.fill, { minWidth: 30, textAlign: "center" }]}>{grade}</Text>
          <Text> / </Text>
          <Text style={[s.fill, { minWidth: 30, textAlign: "center" }]}>{room}</Text>
        </View>
        <View style={{ width: 140, marginLeft: 38, alignItems: "center", marginTop: 4 }}>
          <Text style={s.bold}>({data.advisorName || "........................."})</Text>
        </View>
      </View>
      <Text style={[s.bold, { marginTop: 16 }]}>การพิจารณาการลงโทษของฝ่ายกิจการนักเรียน</Text>
      <View style={{ marginLeft: 12, marginTop: 4 }}>
        <Text>( {data.measureLevel === 1 ? "✓" : "  "} ) ว่ากล่าวตักเตือน</Text>
        <Text>( {data.measureLevel === 2 ? "✓" : "  "} ) ให้ทำกิจกรรมสาธารณประโยชน์</Text>
        <Text>( {data.measureLevel === 3 ? "✓" : "  "} ) เชิญผู้ปกครองมาทำทัณฑ์บน</Text>
        <Text>( {data.measureLevel === 4 ? "✓" : "  "} ) เชิญผู้ปกครองมาให้ย้ายสถานศึกษา</Text>
      </View>
      <View style={{ marginTop: 6, marginLeft: 12 }}>
        {correction.actions.map((a) => {
          const label =
            a.code === "advise"
              ? "การสอนแนะ"
              : a.code === "gooddeeds"
                ? "ให้ทำความดีเพื่อชดใช้ความผิด"
                : a.code === "work"
                  ? "ให้ช่วยงานตามความสามารถ"
                  : a.code === "counsel"
                    ? "ให้เข้าพบงานปรึกษาแนะแนว"
                    : a.code;
          return (
            <Text key={a.code}>{`( ✓ ) ${label}${a.deadline ? ` ภายใน ${a.deadline}` : ""}`}</Text>
          );
        })}
      </View>
      {correction.suggestion ? (
        <Text style={{ marginTop: 6 }}>
          ข้อเสนอแนะ: <Fill>{correction.suggestion}</Fill>
        </Text>
      ) : null}
      <Text style={{ marginTop: 12 }}>
        ความเห็นของผู้อำนวยการโรงเรียน <Fill>{data.directorOpinion}</Fill>
      </Text>
      <View style={s.sigCenter}>
        <Sig
          name={(signatureOf(data, "director")?.signerName ?? data.directorName) || "นายฮาฟีซี อับดุลเลาะ"}
          role="ผู้อำนวยการโรงเรียนบาเจาะ"
          image={signatureOf(data, "director")?.imageData}
        />
      </View>
    </Page>
  );
}

function sanitize(input: string): string {
  return input.replace(/[\\/:*?"<>|]/g, "-").trim();
}

export async function generateAndSaveDocPdf(
  docType: DocType,
  incidentId: number
): Promise<
  | { ok: true; path: string; filename: string; webViewLink?: string }
  | { ok: false; error: string }
> {
  const loaded = await loadDocData(incidentId);
  if (!loaded) return { ok: false, error: "ไม่พบเคส" };

  const { data } = loaded;
  if (docType === "g1" && !loaded.summonExists) return { ok: false, error: "เคสนี้ยังไม่ถึงขั้น กจ.1" };
  if (docType === "g11" && !loaded.agreementExists) return { ok: false, error: "เคสนี้ยังไม่ถึงขั้น กจ.1.1" };
  if (docType === "g2" && !loaded.correctionExists) return { ok: false, error: "เคสนี้ยังไม่ถึงขั้น กจ.2" };

  const docElement =
    docType === "g1" ? (
      <G1Pdf data={data} />
    ) : docType === "g11" ? (
      <G11Pdf data={data} />
    ) : (
      <G2Pdf data={data} />
    );

  const buffer = await renderToBuffer(
    <Document author="WIN-AIBCH" title={DOC_TYPE_LABELS[docType]}>
      {docElement}
    </Document>
  );

  const rawBuffer = Buffer.from(buffer as unknown as ArrayBuffer);
  const filename = `${sanitize(data.primaryBehavior)}_${sanitize(data.summon?.docNo ?? String(incidentId))}_${sanitize(data.studentName)}_${sanitize(DOC_TYPE_LABELS[docType])}.pdf`;

  if (process.env.GOOGLE_DRIVE_FOLDER_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const { uploadToDrive } = await import("./drive");
    const driveFile = await uploadToDrive(rawBuffer, filename);
    return { ok: true, path: driveFile.webViewLink, filename, webViewLink: driveFile.webViewLink };
  }

  const settings = await db.setting.findMany();
  const savePath = Object.fromEntries(settings.map((r) => [r.key, r.value])).savePath || "D:\\เอกสารกจ";
  await fs.mkdir(savePath, { recursive: true });
  const filePath = path.join(savePath, filename);
  await fs.writeFile(filePath, rawBuffer);
  return { ok: true, path: filePath, filename };
}
