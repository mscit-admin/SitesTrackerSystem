// Bootstrap the RBAC system: create the built-in Admin role and a first admin
// user if none exists. Safe to run repeatedly (idempotent).
//
//   npm run seed:admin
//
// Optional env overrides: ADMIN_EMAIL, ADMIN_EMPLOYEE_ID, ADMIN_PASSWORD.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1) built-in Admin role (grants everything via isAdmin wildcard)
  const adminRole = await prisma.role.upsert({
    where: { name: "مدير النظام" },
    update: { isAdmin: true, isSystem: true },
    create: {
      name: "مدير النظام",
      description: "صلاحيات كاملة على كل أجزاء النظام",
      isSystem: true,
      isAdmin: true,
      permissions: "[]",
    },
  });

  // A couple of handy starter roles (empty matrices, editable in the UI).
  for (const name of ["مدير المشروع", "مسؤول مرحلة", "مُدخل بيانات", "مشاهد"]) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, isSystem: false, isAdmin: false, permissions: "[]" },
    });
  }

  // 2) first admin user
  const count = await prisma.user.count();
  if (count === 0) {
    const email = (process.env.ADMIN_EMAIL ?? "admin@gsdn.local").toLowerCase();
    const employeeId = process.env.ADMIN_EMPLOYEE_ID ?? "ADMIN";
    const password = process.env.ADMIN_PASSWORD ?? "Admin@12345";
    await prisma.user.create({
      data: {
        firstName: "System",
        lastName: "Administrator",
        employeeId,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        roleId: adminRole.id,
        isActive: true,
        mustChangePassword: true,
      },
    });
    console.log("✓ Created first admin user:");
    console.log(`    login (email or ID): ${email}  /  ${employeeId}`);
    console.log(`    password           : ${password}`);
    console.log("    ⚠ change this password on first login.");
  } else {
    console.log(`✓ Users already exist (${count}); left admin user untouched.`);
  }
  console.log("✓ Admin/starter roles are in place.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
