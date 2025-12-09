import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    const password = await bcrypt.hash('password', 10)

    const admin = await prisma.user.upsert({
        where: { email: 'admin@chronops.com' },
        update: {},
        create: {
            email: 'admin@chronops.com',
            name: 'Admin User',
            password,
            isAdmin: true,
            emailVerifiedAt: new Date(),
        },
    })

    console.log({ admin })

    // Create default room
    const room = await prisma.room.upsert({
        where: { slug: 'general' },
        update: {},
        create: {
            name: 'General',
            slug: 'general',
            createdBy: admin.id,
        },
    })

    console.log({ room })

    // Create chat settings
    const settings = await prisma.chatSettings.create({
        data: {
            isChatEnabled: true,
            windowTitle: 'Arts and Entertainment - Red Dragon Inn',
        }
    })

    console.log({ settings })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
