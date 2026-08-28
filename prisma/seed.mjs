import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const db = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `s1:${salt}:${hash}`;
}

const BEHAVIORS = [
  "แต่งกายผิดระเบียบบ่อยครั้ง",
  "ทำลายทรัพย์สินของผู้อื่น",
  "หนีเรียน",
  "พกพาอาวุธ",
  "ลักขโมย",
  "ทำร้ายร่างกายผู้อื่น",
  "เล่นการพนัน",
  "สิ่งเสพติด (ระบุชนิด)",
  "ทะเลาะวิวาท",
  "ชักนำให้เกิดการทะเลาะวิวาท",
  "ชู้สาว",
  "อื่น ๆ (ระบุ)",
];

const SETTINGS = {
  schoolName: "โรงเรียนบาเจาะ",
  officeName: "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน",
  directorName: "ฮาฟีซี อับดุลเลาะ",
  directorPosition: "ผู้อำนวยการโรงเรียนบาเจาะ",
  deputyName: "มารีนา อารง",
  deputyPosition: "รองผู้อำนวยการฝ่ายกิจการนักเรียน",
  docCounter: "0",
  academicYear: "2569",
  savePath: "D:\\เอกสารกจ",
};

const CLASSROOMS = [];
for (const [level, grades] of [["ม.", [1, 2, 3, 4, 5, 6]]]) {
  for (const grade of grades) {
    for (const roomNo of [1, 2]) {
      CLASSROOMS.push({ level, grade, roomNo });
    }
  }
}

async function main() {
  await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: hashPassword("admin1234"),
      name: "ครูสารวัตร",
      role: "admin",
    },
  });

  const existing = await db.behavior.count();
  if (existing === 0) {
    await db.behavior.createMany({
      data: BEHAVIORS.map((label, i) => ({ label, sortOrder: i + 1 })),
    });
  }

  for (const [key, value] of Object.entries(SETTINGS)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  const classroomCount = await db.classroom.count();
  if (classroomCount === 0) {
    await db.classroom.createMany({ data: CLASSROOMS });
  }

  console.log("Seed complete:");
  console.log("  user: admin / admin1234");
  console.log(`  behaviors: ${await db.behavior.count()}`);
  console.log(`  settings: ${await db.setting.count()}`);
  console.log(`  classrooms: ${await db.classroom.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
