import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { Actions, Resources, RolePolicies, Roles } from "../src/shared/constants/roles.constants";

const prisma = new PrismaClient();

const DEMO_IMAGE = (publicId: string) =>
  `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/${publicId}`;

async function seedRbac(): Promise<void> {
  const allPermissions = Resources.flatMap((resource) =>
    Actions.map((action) => ({ action, resource }))
  );

  const created = await Promise.all(
    allPermissions.map((permission) =>
      prisma.permission.upsert({
        where: { action_resource: permission },
        update: {},
        create: { ...permission, description: `${permission.action} sobre ${permission.resource}` },
      })
    )
  );
  const idByCode = new Map(
    created.map((permission) => [`${permission.action}:${permission.resource}`, permission.id])
  );

  const policies: Record<string, string[]> = {
    [Roles.ADMIN]: created.map((permission) => permission.id),
    [Roles.VENDOR]: RolePolicies.VENDOR.map((code) => idByCode.get(code)).filter(
      (id): id is string => Boolean(id)
    ),
    [Roles.CUSTOMER]: [],
  };
  const descriptions: Record<string, string> = {
    [Roles.ADMIN]: "Acceso total a la plataforma",
    [Roles.VENDOR]: "Gestión de catálogo propio y despacho",
    [Roles.CUSTOMER]: "Rol por defecto de comprador final",
  };

  for (const [name, permissionIds] of Object.entries(policies)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: descriptions[name] ?? null },
      create: { name, description: descriptions[name] ?? null },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
    });
  }
}

const SEED_USERS = [
  {
    role: Roles.ADMIN,
    env: "ADMIN",
    email: "admin@ecommerce.local",
    password: "Admin12345!",
    firstName: "Admin",
    lastName: "Plataforma",
  },
  {
    role: Roles.VENDOR,
    env: "VENDOR",
    email: "vendedor@ecommerce.local",
    password: "Vendedor12345!",
    firstName: "Valeria",
    lastName: "Vendedora",
  },
  {
    role: Roles.CUSTOMER,
    env: "CUSTOMER",
    email: "cliente@ecommerce.local",
    password: "Cliente12345!",
    firstName: "Carlos",
    lastName: "Cliente",
  },
] as const;

async function seedUsers(): Promise<string> {
  const ids = new Map<string, string>();
  for (const seed of SEED_USERS) {
    const email = process.env[`SEED_${seed.env}_EMAIL`] ?? seed.email;
    const password = process.env[`SEED_${seed.env}_PASSWORD`] ?? seed.password;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        firstName: seed.firstName,
        lastName: seed.lastName,
        isVerified: true,
        roles: { create: [{ role: { connect: { name: seed.role } } }] },
        loyaltyAccount: { create: {} },
        notificationPrefs: { create: {} },
      },
    });
    ids.set(seed.role, user.id);
  }
  return ids.get(Roles.ADMIN) as string;
}

async function seedCatalog(vendorId: string): Promise<void> {
  const ropa = await prisma.category.upsert({
    where: { slug: "ropa" },
    update: {},
    create: { name: "Ropa", slug: "ropa", description: "Moda para todos", position: 1 },
  });
  const camisetas = await prisma.category.upsert({
    where: { slug: "camisetas" },
    update: {},
    create: { name: "Camisetas", slug: "camisetas", parentId: ropa.id, position: 1 },
  });
  const calzado = await prisma.category.upsert({
    where: { slug: "calzado" },
    update: {},
    create: { name: "Calzado", slug: "calzado", position: 2 },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: "web3-wear" },
    update: {},
    create: {
      name: "Web3 Wear",
      slug: "web3-wear",
      description: "Ropa urbana con coleccionables NFT",
    },
  });

  const products: Array<{
    slug: string;
    name: string;
    categoryId: string;
    image: string;
    basePrice: number;
    sizes: string[];
  }> = [
    {
      slug: "camiseta-genesis",
      name: "Camiseta Génesis",
      categoryId: camisetas.id,
      image: "sample.jpg",
      basePrice: 7990000,
      sizes: ["S", "M", "L"],
    },
    {
      slug: "camiseta-blockchain",
      name: "Camiseta Blockchain",
      categoryId: camisetas.id,
      image: "couple.jpg",
      basePrice: 8990000,
      sizes: ["M", "L", "XL"],
    },
    {
      slug: "tenis-metaverso",
      name: "Tenis Metaverso",
      categoryId: calzado.id,
      image: "shoes.png",
      basePrice: 25990000,
      sizes: ["38", "40", "42"],
    },
  ];

  const collection = await prisma.collection.upsert({
    where: { slug: "lanzamiento" },
    update: {},
    create: {
      name: "Lanzamiento",
      slug: "lanzamiento",
      description: "Primeros productos de la tienda",
    },
  });

  for (const [index, item] of products.entries()) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        name: item.name,
        slug: item.slug,
        description: `${item.name}: producto de muestra del seed con variantes por talla.`,
        status: "ACTIVE",
        categoryId: item.categoryId,
        brandId: brand.id,
        vendorId,
        minPriceCents: item.basePrice,
        maxPriceCents: item.basePrice,
        images: {
          create: [
            {
              url: DEMO_IMAGE(item.image),
              publicId: item.image,
              alt: item.name,
              position: 0,
              width: 864,
              height: 576,
            },
          ],
        },
        variants: {
          create: item.sizes.map((size, sizeIndex) => ({
            sku: `${item.slug.toUpperCase()}-${size}`,
            name: `Talla ${size}`,
            attributes: { size } as Prisma.InputJsonValue,
            priceCents: item.basePrice,
            stock: 20 + sizeIndex * 5,
            weightGrams: item.categoryId === calzado.id ? 900 : 250,
          })),
        },
      },
    });
    await prisma.collectionProduct.upsert({
      where: { collectionId_productId: { collectionId: collection.id, productId: product.id } },
      update: {},
      create: { collectionId: collection.id, productId: product.id, position: index },
    });
  }
}

async function seedCoupons(): Promise<void> {
  await prisma.coupon.upsert({
    where: { code: "BIENVENIDA10" },
    update: {},
    create: {
      code: "BIENVENIDA10",
      description: "10% de descuento en tu primera compra (máximo $50.000)",
      type: "PERCENTAGE",
      value: 10,
      maxDiscountCents: 5000000,
      usagePerUser: 1,
      startsAt: new Date(),
    },
  });
}

async function main(): Promise<void> {
  await seedRbac();
  const adminId = await seedUsers();
  await seedCatalog(adminId);
  await seedCoupons();
  console.log(
    "Seed completo: RBAC, usuarios admin/vendedor/cliente, catálogo de muestra y cupón BIENVENIDA10"
  );
}

main()
  .catch((error: unknown) => {
    console.error("Error ejecutando el seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
