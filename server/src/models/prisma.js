const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// WAL mode lets reads proceed while a write is in progress, reducing
// lock contention now that multiple server instances share this DB file.
prisma.$executeRawUnsafe('PRAGMA journal_mode=WAL;').catch((err) => {
    console.error('Failed to set SQLite WAL mode:', err)
})

module.exports = prisma