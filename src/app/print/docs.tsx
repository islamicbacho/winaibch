import Image from "next/image";
import { signatureOf, type DocData } from "@/lib/doc-data";

function splitThaiDate(s: string): [string, string, string] {
  if (!s) return ["", "", ""];
  const parts = s.trim().split(/\s+/);
  return [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
}

function Fill({ children }: { children: string }) {
  return <span className="fill-line">{children}</span>;
}

function DocHeader({ docLabel, emblem }: { docLabel: string; emblem: string }) {
  return (
    <div className="flex items-start justify-between">
      <Image src={emblem} alt="ตราหัวเอกสาร" width={80} height={80} className="h-20 w-20 object-contain" />
      <span className="text-[16pt]">{docLabel}</span>
    </div>
  );
}

function Signature({
  name,
  role,
  firstName,
  image,
}: {
  name?: string;
  role: string;
  firstName?: string;
  image?: string;
}) {
  return (
    <div className="inline-block text-center">
      {firstName && <p>{firstName}</p>}
      {image ? (
        <img src={image} alt="" className="mx-auto h-12 object-contain" />
      ) : (
        <p>ลงชื่อ..........................................</p>
      )}
      <p className="font-bold">({name || "........................."})</p>
      <p>{role}</p>
    </div>
  );
}

function BehaviorChecks({ behaviors }: { behaviors: DocData["behaviors"] }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 pl-6">
      {behaviors.map((b) => (
        <span key={b.label} className="whitespace-nowrap">
          ( {b.checked ? "✓" : "  "} ) {b.label}
        </span>
      ))}
    </div>
  );
}

export function G1Doc({ data }: { data: DocData }) {
  const [todayDay, todayMonth, todayYear] = splitThaiDate(data.today);
  const [mDay, mMonth, mYear] = splitThaiDate(data.summon?.meetingDate ?? "");
  const grade = data.classroomGrade || "";
  const room = data.classroomRoom || "";
  return (
    <div className="space-y-1 text-[16pt] leading-relaxed">
      <DocHeader docLabel="กิจการนักเรียน. 1" emblem="/garuda.png" />
      <h1 className="text-center text-[20pt] font-bold">บันทึกข้อความ</h1>

      <p>ส่วนราชการ โรงเรียนบาเจาะ</p>
      <p>
        ที่ <Fill>{data.summon?.docNo ?? ""}</Fill> วันที่ <Fill>{todayDay}</Fill> เดือน <Fill>{todayMonth}</Fill>{" "}
        พ.ศ. <Fill>{todayYear}</Fill>
      </p>
      <p>เรื่อง แจ้งนักเรียนประพฤติผิดระเบียบของโรงเรียน</p>
      <hr className="border-black" />
      <p>
        เรียน ครูที่ปรึกษาชั้น ม. <Fill>{grade}</Fill>/<Fill>{room}</Fill>
      </p>
      <p>
        เนื่องด้วย (ด.ช./ด.ญ/นาย/นางสาว) <Fill>{data.studentName}</Fill>
      </p>
      <p>
        นักเรียนชั้น ม. <Fill>{grade}</Fill>/<Fill>{room}</Fill> ซึ่งเป็นนักเรียนในปกครองของท่านได้ประพฤติผิดระเบียบของโรงเรียนในเรื่อง
      </p>
      <BehaviorChecks behaviors={data.behaviors} />
      <p>
        จึงเรียนมาเพื่อโปรดทำการสอบสวนแล้วรายงานให้ทราบ (ตามแบบรายงานการสอบสวน กิจการนักเรียน. 1)
      </p>
      <p>
        ภายในวันที่ <Fill>{mDay}</Fill> เดือน <Fill>{mMonth}</Fill> พ.ศ. <Fill>{mYear}</Fill>
      </p>

      <div className="flex justify-between pt-10">
        <Signature name="" role="ครูที่พบเห็น" />
        <Signature name={data.deputyName || data.directorName} role="ผู้อำนวยการ/รองผู้อำนวยการ" image={signatureOf(data, "director")?.imageData || signatureOf(data, "patrol")?.imageData} />
      </div>

      <div className="flex justify-between pt-10">
        <div className="text-center">
          <p>ทราบ</p>
          <Signature name={data.advisorName} role="ครูที่ปรึกษา" />
        </div>
        <div className="text-center">
          <p>รับทราบ (นักเรียน)</p>
          <Signature name={data.studentName} role="นักเรียน" image={signatureOf(data, "student")?.imageData} />
        </div>
      </div>
    </div>
  );
}

export function G11Doc({ data }: { data: DocData }) {
  const [todayDay, todayMonth, todayYear] = splitThaiDate(data.today);
  const [occurDay, occurMonth, occurYear] = splitThaiDate(data.occurredDate);
  const grade = data.classroomGrade || "";
  const room = data.classroomRoom || "";
  return (
    <div className="space-y-1 text-[16pt] leading-relaxed">
      <DocHeader docLabel="กิจการนักเรียน. 1.1" emblem="/logo-bch.png" />
      <h1 className="text-center text-[20pt] font-bold">แบบบันทึกการกระทำผิดระเบียบของโรงเรียน</h1>
      <p className="text-center">
        ครั้งที่ <Fill>{String(data.measureLevel)}</Fill>
      </p>
      <p className="text-center">โรงเรียนบาเจาะ อำเภอบาเจาะ จังหวัดนราธิวาส</p>
      <p className="text-right">
        วันที่ <Fill>{todayDay}</Fill> เดือน <Fill>{todayMonth}</Fill> พ.ศ. <Fill>{todayYear}</Fill>
      </p>

      <p>
        ข้าพเจ้า(นักเรียน) <Fill>{data.studentName}</Fill> เลขประจำตัว <Fill>{data.studentNo}</Fill> เลขที่{" "}
        <Fill>{data.studentNo}</Fill>
      </p>
      <p>
        นักเรียนชั้น ม. <Fill>{grade}</Fill>/<Fill>{room}</Fill> ได้กระทำผิดระเบียบของโรงเรียนเรื่อง{" "}
        <Fill>{data.agreement?.behaviorDetail || data.behaviors.filter((b) => b.checked).map((b) => b.label).join(", ")}</Fill>
      </p>
      <p className="min-h-[1.2em]">
        <Fill>{""}</Fill>
      </p>
      <p className="min-h-[1.2em]">
        <Fill>{""}</Fill>
      </p>

      <p>
        เหตุเกิดเมื่อ วันที่ <Fill>{occurDay}</Fill> เดือน <Fill>{occurMonth}</Fill> พ.ศ. <Fill>{occurYear}</Fill>{" "}
        เวลา <Fill>{data.occurredTime}</Fill> น.
      </p>
      <p>
        สถานที่เกิดเหตุ <Fill>{data.location}</Fill>
      </p>

      <p className="indent-8">
        การกระทำของข้าพเจ้าดังกล่าว ข้าพเจ้าทราบว่าเป็นการกระทำที่ไม่ถูกต้อง และข้าพเจ้าเคยได้รับการอบรม
      </p>
      <p className="indent-8">สั่งสอน และตักเตือนอยู่เสมอ แต่ข้าพเจ้ายังไม่ปฏิบัติตาม นับได้ว่าข้าพเจ้าได้เป็นผู้กระทำการอันใด อันจะนำความ</p>
      <p className="indent-8">
        เสื่อมเสียชื่อเสียงมาสู่โรงเรียนและหมู่คณะ ข้าพเจ้ายินดีให้ทางโรงเรียนพิจารณาลงโทษตามเหตุสมควร
      </p>

      <div className="grid grid-cols-2 gap-x-10 gap-y-8 pt-8">
        <Signature
          name={signatureOf(data, "student")?.signerName ?? data.studentName}
          role="ผู้กระทำผิด"
          image={signatureOf(data, "student")?.imageData}
        />
        <Signature
          name={signatureOf(data, "parent")?.signerName ?? data.guardianName}
          role="ผู้ปกครอง"
          image={signatureOf(data, "parent")?.imageData}
        />
        <Signature name={data.advisorName} role="ครูที่ปรึกษา" />
        <Signature
          name={data.deputyName || "นางดวงพร ศรีทิพยราษฎร์"}
          role="หัวหน้ากลุ่มบริหารกิจการนักเรียน"
        />
      </div>
      <div className="pt-8 text-center">
        <Signature
          name={(signatureOf(data, "director")?.signerName ?? data.directorName) || "นายฮาฟีซี อับดุลเลาะ"}
          role="ผู้อำนวยการโรงเรียนบาเจาะ"
          image={signatureOf(data, "director")?.imageData}
        />
      </div>
    </div>
  );
}

export function G2Doc({ data }: { data: DocData }) {
  const [todayDay, todayMonth, todayYear] = splitThaiDate(data.today);
  const grade = data.classroomGrade || "";
  const room = data.classroomRoom || "";
  const [mDay, mMonth, mYear] = splitThaiDate(data.summon?.meetingDate ?? "");
  const correction = data.correction;
  return (
    <div className="space-y-1 text-[16pt] leading-relaxed">
      <DocHeader docLabel="กิจการนักเรียน. 2" emblem="/garuda.png" />
      <h1 className="text-center text-[20pt] font-bold">บันทึกข้อความ</h1>

      <p>ส่วนราชการ โรงเรียนบาเจาะ</p>
      <p>
        ที่ <Fill>{data.summon?.docNo ?? ""}</Fill> วันที่ <Fill>{todayDay}</Fill> เดือน{" "}
        <Fill>{todayMonth}</Fill> พ.ศ. <Fill>{todayYear}</Fill>
      </p>
      <p>เรื่อง รายงานการสอบสวนนักเรียนประพฤติผิดระเบียบของโรงเรียน</p>
      <hr className="border-black" />
      <p>เรียน ผู้อำนวยการโรงเรียนบาเจาะ</p>
      <p>
        ด้วย (ด.ช./ด.ญ/นาย/นางสาว) <Fill>{data.studentName}</Fill>
      </p>
      <p>
        นักเรียนชั้น ม. <Fill>{grade}</Fill>/<Fill>{room}</Fill> ได้ประพฤติผิดระเบียบของโรงเรียนในเรื่อง
      </p>
      <BehaviorChecks behaviors={data.behaviors} />
      <p>
        ซึ่งเป็นหมวดความผิดระเบียบวินัยของโรงเรียนและนักเรียนทำผิดเป็นครั้งที่{" "}
        <Fill>{String(data.measureLevel)}</Fill> โดยได้ทำการสอบสวนแล้วปรากฏว่า (ด.ช./ด.ญ/นาย/นางสาว){" "}
        <Fill>{data.studentName}</Fill> ประพฤติผิดระเบียบของโรงเรียนจริงตามแบบ กิจการนักเรียน. 1/1
        ที่แนบมาพร้อมนี้
      </p>
      <p>จึงเรียนมาเพื่อโปรดทราบและดำเนินการต่อไป</p>

      <div className="pt-4 flex justify-end">
        <div>
          <p>
            ลงชื่อ<span className="fill-line" style={{ minWidth: "140px", display: "inline-block" }}></span> ครูที่ปรึกษาชั้น ม.{" "}
            <span className="fill-line" style={{ minWidth: "30px", display: "inline-block", textAlign: "center" }}>{grade}</span> /{" "}
            <span className="fill-line" style={{ minWidth: "30px", display: "inline-block", textAlign: "center" }}>{room}</span>
          </p>
          <div style={{ width: "140px", marginLeft: "38px" }} className="text-center">
            <p className="font-bold">({data.advisorName || "........................."})</p>
          </div>
        </div>
      </div>

      <p className="pt-4 font-bold">การพิจารณาการลงโทษของฝ่ายกิจการนักเรียน</p>
      <div className="space-y-1 pl-6">
        <p>( {data.measureLevel === 1 ? "✓" : "  "} ) ว่ากล่าวตักเตือน</p>
        <p>( {data.measureLevel === 2 ? "✓" : "  "} ) ให้ทำกิจกรรมสาธารณประโยชน์</p>
        <p>( {data.measureLevel === 3 ? "✓" : "  "} ) เชิญผู้ปกครองมาทำทัณฑ์บน</p>
        <p>( {data.measureLevel === 4 ? "✓" : "  "} ) เชิญผู้ปกครองมาให้ย้ายสถานศึกษา</p>
      </div>

      {correction && (
        <>
          <p className="pt-2">
            มาตรการที่ดำเนินการ:{" "}
            {correction.actions
              .map((a) => {
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
                return label + (a.deadline ? ` ภายใน ${a.deadline}` : "");
              })
              .join(", ")}
          </p>
          {correction.suggestion && (
            <p>
              ข้อเสนอแนะ: <Fill>{correction.suggestion}</Fill>
            </p>
          )}
        </>
      )}

      <p className="pt-4">
        ความเห็นของผู้อำนวยการโรงเรียน <Fill>{data.directorOpinion}</Fill>
      </p>

      <div className="pt-8 text-center">
        <Signature
          name={(signatureOf(data, "director")?.signerName ?? data.directorName) || "นายฮาฟีซี อับดุลเลาะ"}
          role="ผู้อำนวยการโรงเรียนบาเจาะ"
          image={signatureOf(data, "director")?.imageData}
        />
      </div>
    </div>
  );
}
