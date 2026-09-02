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
import { getStudentDriveFolder, isDriveConfigured, uploadToDrive } from "@/lib/drive";
import { photoThumbUrl } from "@/lib/image-utils";

const WIN_FONTS = "C:\\Windows\\Fonts";

function findFont(candidates: string[]): string {
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return "";
}

const BUNDLED_REGULAR = path.join(process.cwd(), "resources", "fonts");
const regularFont = findFont([
  path.join(BUNDLED_REGULAR, "THSarabun-Regular.ttf"),
  path.join(WIN_FONTS, "THSarabun.ttf"),
  path.join(WIN_FONTS, "TH SarabunPSK.ttf"),
  path.join(WIN_FONTS, "TH Sarabun PSK.ttf"),
]);
const boldFont = findFont([
  path.join(BUNDLED_REGULAR, "THSarabun-Bold.ttf"),
  path.join(WIN_FONTS, "THSarabun Bold.ttf"),
  path.join(WIN_FONTS, "TH SarabunPSK Bold.ttf"),
  path.join(WIN_FONTS, "TH Sarabun PSK Bold.ttf"),
]);

Font.register({
  family: "ProfileFont",
  fonts: [
    { src: regularFont, fontWeight: 400 },
    { src: boldFont, fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: {
    paddingTop: 85,
    paddingLeft: 85,
    paddingBottom: 57,
    paddingRight: 57,
    fontSize: 16,
    fontFamily: "ProfileFont",
    lineHeight: 1.45,
  },
  head: { flexDirection: "row", alignItems: "flex-start" },
  photo: { width: 108, height: 108, borderRadius: 54, borderWidth: 2, borderColor: "#000" },
  photoPlaceholder: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 40,
    fontWeight: 700,
  },
  headInfo: { marginLeft: 20, flex: 1 },
  title: { fontSize: 21, fontWeight: 700, marginBottom: 6 },
  row: { flexDirection: "row", marginVertical: 1 },
  label: { width: 110, fontWeight: 700 },
  divider: { borderBottomWidth: 2, borderBottomColor: "#000", marginVertical: 12 },
  sectionTitle: { fontSize: 17, fontWeight: 700, marginBottom: 6 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0000004a" },
  th: {
    fontWeight: 700,
    paddingVertical: 4,
    paddingRight: 8,
    width: 150,
  },
  thSmall: { width: 70 },
  thDoc: { width: 130 },
  td: { paddingVertical: 4, paddingRight: 8, width: 150 },
  tdSmall: { width: 70 },
  tdDoc: { width: 130 },
  fill: { flex: 1 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 40 },
  sigName: { alignSelf: "center", paddingTop: 2 },
});

const sDateTime = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short" });
const thShort = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" });

export async function generateStudentProfilePdf(
  studentId: number,
  driveFolderId?: string
): Promise<
  | { ok: true; path: string; filename: string; webViewLink?: string }
  | { ok: false; error: string }
> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      classroom: true,
      incidents: {
        include: { behaviors: { include: { behavior: true } }, summon: true },
        orderBy: { occurredAt: "desc" },
      },
    },
  });
  if (!student) return { ok: false, error: "ไม่พบนักเรียน" };

  const classroomLabel = student.classroom
    ? `${student.classroom.level}${student.classroom.grade}/${student.classroom.roomNo}`
    : "-";
  const photoUri = student.photoDriveId ? photoThumbUrl(student.photoDriveId, 768) : "";

  const pdf = (
    <Document author="WIN-AIBCH" title={`เอกสารโปรไฟล์นักเรียน_${student.fullName}`}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          {photoUri ? (
            <Image src={photoUri} style={s.photo} />
          ) : (
            <View style={s.photoPlaceholder}>
              <Text>{(student.fullName.trim().charAt(0) || "?").toUpperCase()}</Text>
            </View>
          )}
          <View style={s.headInfo}>
            <Text style={s.title}>เอกสารประวัติความประพฤตินักเรียน</Text>
            <View style={s.row}>
              <Text style={s.label}>ชื่อ-สกุล</Text>
              <Text>ด.ช./ด.ญ. {student.fullName}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>ชั้น</Text>
              <Text>{classroomLabel}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>เลขประจำตัว</Text>
              <Text>{student.studentNo || "-"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>ผู้ปกครอง</Text>
              <Text>
                {student.guardianName || "-"}
                {student.guardianPhone ? ` (${student.guardianPhone})` : ""}
              </Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>จำนวนเคส</Text>
              <Text>{student.incidents.length} เคส</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        <Text style={s.sectionTitle}>
          ประวัติการกระทำผิด (ทั้งหมด {student.incidents.length} ครั้ง)
        </Text>
        {student.incidents.length === 0 ? (
          <Text>ไม่มีประวัติการกระทำผิด</Text>
        ) : (
          <View>
            <View style={s.tableRow}>
              <Text style={[s.th, s.thSmall]}>ครั้งที่</Text>
              <Text style={s.th}>วันที่เกิดเหตุ</Text>
              <Text style={[s.th, s.fill]}>พฤติกรรมที่กระทำผิด</Text>
              <Text style={[s.th, s.thDoc]}>หมายเลข กจ.1</Text>
            </View>
            {student.incidents.map((incident, i) => (
              <View key={incident.id} style={s.tableRow}>
                <Text style={[s.td, s.tdSmall]}>{student.incidents.length - i}</Text>
                <Text style={s.td}>{sDateTime.format(incident.occurredAt)}</Text>
                <Text style={[s.td, s.fill]}>
                  {incident.behaviors.map((ib) => ib.behavior.label).join(", ") || "-"}
                </Text>
                <Text style={[s.td, s.tdDoc]}>{incident.summon?.docNo ?? "-"}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.footer}>
          <Text>ออกเอกสาร ณ วันที่ {thShort.format(new Date())}</Text>
          <View>
            <Text style={{ textAlign: "center" }}>ลงชื่อ............................................</Text>
            <Text style={s.sigName}>..................................................</Text>
            <Text style={{ textAlign: "center" }}>ผู้อำนวยการสถานศึกษา</Text>
          </View>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(pdf);
  const rawBuffer = Buffer.from(buffer as unknown as ArrayBuffer);
  const filename = `โปรไฟล์นักเรียน_${sanitize(student.fullName)}_${sanitize(student.studentNo)}.pdf`;

  if (isDriveConfigured()) {
    let folderId = driveFolderId;
    if (!folderId) {
      const last = await db.incident.findFirst({
        where: { studentId },
        orderBy: { occurredAt: "desc" },
        include: { behaviors: { include: { behavior: true } } },
      });
      folderId = await getStudentDriveFolder({
        category: last?.behaviors[0]?.behavior.label ?? "โปรไฟล์นักเรียน",
        title: student.fullName,
        description: student.studentNo,
      });
    }
    const driveFile = await uploadToDrive(rawBuffer, filename, folderId);
    return {
      ok: true,
      path: driveFile.webViewLink,
      filename,
      webViewLink: driveFile.webViewLink,
    };
  }

  const settings = await db.setting.findMany();
  const savePath =
    Object.fromEntries(settings.map((r) => [r.key, r.value])).savePath || "D:\\เอกสารกจ";
  await fs.mkdir(savePath, { recursive: true });
  const filePath = path.join(savePath, filename);
  await fs.writeFile(filePath, rawBuffer);
  return { ok: true, path: filePath, filename };
}

function sanitize(input: string): string {
  return input.replace(/[\\/:*?"<>|]/g, "-").trim();
}